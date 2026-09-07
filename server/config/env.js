// config/env.js — single source of truth for configuration.
// Fails fast at boot rather than surfacing as a confusing runtime error later.
require('dotenv').config();

const required = (name) => {
    const value = process.env[name];
    if (!value) {
        console.error(`Missing required environment variable: ${name}`);
        console.error('Copy .env.example to .env and fill it in.');
        process.exit(1);
    }
    return value;
};

const isProduction = process.env.NODE_ENV === 'production';

// In production every secret must be set explicitly. In development we fall back
// to obvious throwaway values so a fresh clone runs without ceremony.
const devFallback = (name, fallback) => {
    if (isProduction) return required(name);
    return process.env[name] || fallback;
};

const env = {
    isProduction,
    // Blocks every write path: HTTP mutations, scheduled draws and manual draws.
    // Intended for inspecting a real database safely.
    readOnly: /^(1|true|yes)$/i.test(process.env.READ_ONLY || ''),
    port: Number(process.env.PORT) || 5001,
    mongoUri: required('ATLAS_CONNECTION'),

    adminUser: devFallback('ADMIN_USER', 'admin'),
    // Either a bcrypt hash (preferred) or a plaintext password for local dev.
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || null,
    adminPassword: process.env.ADMIN_PASSWORD_HASH ? null : devFallback('ADMIN_PASSWORD', 'password123'),

    jwtSecret: devFallback('JWT_SECRET', 'dev-only-insecure-secret'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',

    // Comma-separated origins. Empty means "reflect any origin".
    corsOrigins: (process.env.CORS_ORIGIN || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
};

if (isProduction && env.jwtSecret === 'dev-only-insecure-secret') {
    console.error('JWT_SECRET must be set to a strong random value in production.');
    process.exit(1);
}

module.exports = env;
