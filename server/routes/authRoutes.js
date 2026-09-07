// routes/authRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Blunt brute-force protection on the only credential-checking endpoint.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts. Try again later.' },
});

router.post('/login', loginLimiter, login);
router.get('/me', requireAuth, me);

module.exports = router;
