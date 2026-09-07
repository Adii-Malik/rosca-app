// config/db.js
const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
    try {
        // useNewUrlParser / useUnifiedTopology were removed in the Mongoose 8 driver
        // and now emit warnings, so they are no longer passed.
        // Mongoose builds declared indexes on connect. That is a schema write, so
        // a genuine read-only inspection has to switch it off — the HTTP guard
        // only covers requests, not this.
        await mongoose.connect(env.mongoUri, {
            serverSelectionTimeoutMS: 10000,
            autoIndex: !env.readOnly,
        });
        if (env.readOnly) console.log('DB connected (read-only: index building disabled).');
        else console.log('DB connected.');
    } catch (error) {
        console.error('DB connection error:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
