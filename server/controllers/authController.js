// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const checkPassword = async (candidate) => {
    if (env.adminPasswordHash) {
        return bcrypt.compare(candidate, env.adminPasswordHash);
    }
    // Dev-only plaintext comparison. Length-independent compare is not a concern
    // here because the credential is a local throwaway.
    return candidate === env.adminPassword;
};

exports.login = async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const userMatches = username === env.adminUser;
    const passwordMatches = await checkPassword(password);

    if (!userMatches || !passwordMatches) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ sub: username, role: 'admin' }, env.jwtSecret, {
        expiresIn: env.jwtExpiresIn,
    });

    res.json({ token, user: { username, role: 'admin' } });
};

// Lets the client confirm a stored token is still valid on page load.
exports.me = (req, res) => {
    res.json({ user: { username: req.user.sub, role: req.user.role } });
};
