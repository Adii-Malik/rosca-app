const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const socketio = require('socket.io');

const env = require('./config/env');
const connectDB = require('./config/db');
const { verifyToken } = require('./middleware/auth');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { readOnlyGuard } = require('./middleware/readOnly');
const drawService = require('./services/drawService');
const schedulerService = require('./services/schedulerService');

const userRoutes = require('./routes/userRoutes');
const committeeRoutes = require('./routes/committeeRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const drawRoutes = require('./routes/drawRoutes');
const authRoutes = require('./routes/authRoutes');
const archiveRoutes = require('./routes/archiveRoutes');

const app = express();

connectDB();

// An empty CORS_ORIGIN list means "reflect whatever origin asked", which is the
// old behaviour. Setting it locks the API to known front-ends.
const corsOptions = env.corsOrigins.length ? { origin: env.corsOrigins, credentials: true } : {};

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) =>
    res.json({ status: 'ok', uptime: process.uptime(), readOnly: env.readOnly })
);

// Signing in writes nothing, so it stays available in read-only mode.
app.use('/api/auth', authRoutes);

// Guards every data route that follows.
app.use('/api', readOnlyGuard);
app.use('/api/users', userRoutes);
app.use('/api/committees', committeeRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/archive', archiveRoutes);

app.use('/api', notFound);

// Serve the built React app, falling through to index.html for client routing.
const clientBuild = path.join(__dirname, 'client/build');
app.use(express.static(clientBuild));
app.get('*', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));

app.use(errorHandler);

const server = app.listen(env.port, () => {
    console.log(`Server is running on port ${env.port}`);
});

const io = socketio(server, {
    cors: env.corsOrigins.length
        ? { origin: env.corsOrigins, methods: ['GET', 'POST'], credentials: true }
        : { origin: '*', methods: ['GET', 'POST'] },
});

// Guests may watch a draw, so connections are not rejected outright. The token
// is decoded when present and checked before any action that changes state.
// Lets controllers broadcast without importing the socket layer.
app.set('io', io);

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
        try {
            socket.user = verifyToken(token);
        } catch (err) {
            socket.user = null;
        }
    }
    next();
});

// Draws in flight, keyed by committee id, so two committees can draw at once and
// the same committee cannot be drawn twice concurrently. The full payload is
// kept so a client arriving mid-draw sees the real wheel rather than a stub.
const activeDraws = new Map();

/**
 * Runs a draw and broadcasts it. Throws DrawError when the draw is not allowed,
 * so the socket handler can report it and the scheduler can ignore it quietly.
 */
const runDraw = async (committeeId, { trigger = 'manual' } = {}) => {
    if (env.readOnly) {
        throw new drawService.DrawError('The server is in read-only mode, so draws are disabled.');
    }

    const key = String(committeeId);
    if (activeDraws.has(key)) {
        throw new drawService.DrawError('A draw is already in progress for this committee.');
    }

    // Reserve the slot before any await so two callers cannot both pass the check.
    activeDraws.set(key, null);
    try {
        const result = await drawService.performDraw(committeeId, { trigger });
        const { committee, eligible, winner } = result;

        const committeeData = {
            _id: committee._id,
            name: committee.name,
            totalPooledAmount: committee.totalPooledAmount,
        };

        const endsAt = Date.now() + drawService.ANIMATION_MS;
        const payload = {
            committeeId: key,
            committeeData,
            eligibleUsers: eligible,
            trigger,
            endsAt,
        };

        activeDraws.set(key, { payload, winner });
        io.emit('drawStarted', payload);

        // The winner is only written once the draw has actually been broadcast.
        await drawService.recordWinner(committeeId, result);

        setTimeout(() => {
            io.emit('drawCompleted', { ...payload, winner });
            activeDraws.delete(key);
        }, drawService.ANIMATION_MS);

        return winner;
    } catch (error) {
        activeDraws.delete(key);
        throw error;
    }
};

io.on('connection', (socket) => {
    // Someone arriving mid-draw gets the same payload the draw started with,
    // plus how long is left, so the wheel picks up in progress.
    for (const entry of activeDraws.values()) {
        if (entry) socket.emit('drawStarted', { ...entry.payload, joinedLate: true });
    }

    socket.on('startDraw', async (data) => {
        if (!socket.user) {
            socket.emit('drawError', { message: 'You must be signed in to start a draw.' });
            return;
        }
        const committeeId = data?.committeeId;
        if (!committeeId) {
            socket.emit('drawError', { message: 'No committee specified.' });
            return;
        }

        try {
            await runDraw(committeeId, { trigger: 'manual' });
        } catch (error) {
            if (error instanceof drawService.DrawError) {
                socket.emit('drawError', { message: error.message });
            } else {
                console.error('Error during draw process:', error);
                socket.emit('drawError', { message: 'An error occurred during the draw.' });
            }
        }
    });
});

// Fires scheduled draws and closes finished committees. Skipped entirely in
// read-only mode, which would otherwise close committees as a side effect.
if (env.readOnly) {
    console.log('[server] READ-ONLY mode: writes, scheduled draws and committee closure are disabled.');
} else {
    schedulerService.start({ runDraw });
}

module.exports = { app, server, io };
