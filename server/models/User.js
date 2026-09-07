// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        membershipStatus: { type: String, enum: ['active', 'inactive'], default: 'active' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
