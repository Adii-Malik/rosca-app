// middleware/auth.js — JWT verification for HTTP routes and socket connections.
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

const tokenFromHeader = (header) => {
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    return scheme === 'Bearer' && value ? value : null;
};

// Rejects the request unless it carries a valid token.
const requireAuth = (req, res, next) => {
    const token = tokenFromHeader(req.headers.authorization);
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    try {
        req.user = verifyToken(token);
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired session' });
    }
};

// socket.io equivalent: the client passes the token in handshake auth.
const requireSocketAuth = (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
        socket.user = verifyToken(token);
        next();
    } catch (err) {
        next(new Error('Invalid or expired session'));
    }
};

module.exports = { requireAuth, requireSocketAuth, verifyToken };
