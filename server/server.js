// server.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const committeeRoutes = require('./routes/committeeRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const drawRoutes = require('./routes/drawRoutes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/committees', committeeRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/draws', drawRoutes);
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});