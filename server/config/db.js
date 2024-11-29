// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.ATLAS_CONNECTION, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("DB connected.");
    } catch (error) {
        console.error("DB connection error:", error);
        process.exit(1);
    }
};

module.exports = connectDB;