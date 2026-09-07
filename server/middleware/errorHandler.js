// middleware/errorHandler.js
const env = require('../config/env');

// Anything thrown or passed to next() lands here instead of hanging the request.
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
    if (status >= 500) console.error('Unhandled error:', err);

    res.status(status).json({
        message: status >= 500 && env.isProduction ? 'Something went wrong' : err.message,
    });
};

const notFound = (req, res) => {
    res.status(404).json({ message: `No API route for ${req.method} ${req.originalUrl}` });
};

module.exports = { errorHandler, notFound };
