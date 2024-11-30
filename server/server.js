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
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
