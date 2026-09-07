// middleware/readOnly.js
// A hard guard for pointing the app at a production database to look around.
// Without it, "we'll only read" depends on nobody clicking the wrong button —
// this makes writes impossible rather than merely discouraged.
const env = require('../config/env');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const readOnlyGuard = (req, res, next) => {
    if (!env.readOnly || SAFE_METHODS.has(req.method)) return next();

    res.status(403).json({
        message:
            'The server is in read-only mode, so nothing can be changed. ' +
            'Unset READ_ONLY in the environment to allow writes.',
        readOnly: true,
    });
};

module.exports = { readOnlyGuard };
