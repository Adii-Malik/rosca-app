const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const committeeRoutes = require('./routes/committeeRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const drawRoutes = require('./routes/drawRoutes');
const authRoutes = require('./routes/authRoutes');
const socketio = require('socket.io');
const DrawRecord = require('./models/DrawRecord');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/committees', committeeRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/auth', authRoutes);

// Serve React Frontend
app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Start the server
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Initialize socket.io
const io = socketio(server, {
    cors: {
        origin: '*', // Allow your frontend's origin
        methods: ['GET', 'POST'],     // Allowed HTTP methods
        credentials: true,       // Allow credentials (if needed)
    },
})

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send ongoing draw data to the newly connected client
    if (drawData) {
        socket.emit('drawStarted', drawData);
    }

    socket.on('startDraw', (data) => {
        console.log('Draw process started for committee:', data.committeeId);
        startDrawProcess(data); // Trigger the draw process
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

let drawData = null; // Store the current draw details

const startDrawProcess = async (data) => {
    try {
        drawData = data;

        const eligibleUsers = getEligibleUsers(data.committeeData, data.drawRecords, data.committeeId);
        if (!eligibleUsers) {
            io.emit('drawCompleted', { message: 'All users have drawn already!' });
            return;
        }

        drawData.eligibleUsers = eligibleUsers;
        io.emit('drawStarted', drawData); // Notify all clients that the draw has started

        const drawnUser = selectRandomEligibleUser(data.committeeData, data.drawRecords, data.committeeId);

        if (!drawnUser) {
            io.emit('drawCompleted', { message: 'All users have drawn already!' });
            return;
        }

        drawData.winner = drawnUser; // Assign the drawn user

        // Prepare the new draw record
        const newDrawRecord = {
            userId: drawnUser.user._id, // Make sure `drawnUser.user._id` is valid
            committeeId: data.committeeId,
            date: new Date().toISOString(),
        };

        // Call the API to create a new draw record and handle errors if any
        const drawRecord = new DrawRecord(newDrawRecord);
        await drawRecord.save();

        // Simulate the draw process (e.g., delay for animation)
        setTimeout(() => {
            io.emit('drawCompleted', drawData);
            drawData = null;
        }, 30000);
    } catch (error) {
        console.error('Error during draw process:', error);
        io.emit('drawCompleted', { message: 'An error occurred during the draw!' });
    }
};


// Helper function to check if a user has already drawn and is eligible to draw again
const isUserEligibleToDraw = (user, committeeId, drawRecords) => {
    // Get how many draws the user has made for this committee
    const userDrawsForCommittee = drawRecords.filter(record =>
        record.userId._id === user.user._id && record.committeeId.toString() === committeeId.toString()
    );

    // Check if the user has reached their contribution limit
    return userDrawsForCommittee.length < user.contributionLimit;
};

// Function to randomly select a user, ensuring they haven't already drawn
const selectRandomEligibleUser = (committeeData, drawRecords, committeeId) => {
    const availableUsers = committeeData.participants.filter(user =>
        isUserEligibleToDraw(user, committeeId, drawRecords)
    );

    if (availableUsers.length === 0) {
        alert('All users have already received their draw amount!');
        return null; // No eligible users remaining
    }

    // Randomly select an eligible user
    const randomIndex = Math.floor(Math.random() * availableUsers.length);
    return availableUsers[randomIndex]; // Return the selected eligible user
};

const getEligibleUsers = (committeeData, drawRecords, committeeId) => {
    return committeeData.participants.filter(user =>
        isUserEligibleToDraw(user, committeeId, drawRecords)
    );
};