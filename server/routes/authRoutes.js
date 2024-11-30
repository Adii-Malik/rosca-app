const express = require('express');
const basicAuth = require('express-basic-auth');

const router = express.Router();

// Basic authentication middleware
router.use(basicAuth({
    users: { 'admin': 'password123' }, // Define users here
    challenge: true,
    unauthorizedResponse: 'Unauthorized'
}));

// Protected route
router.get('/authenticate', (req, res) => {
    res.json({ message: 'Authenticated successfully', user: req.auth.user });
});

module.exports = router;