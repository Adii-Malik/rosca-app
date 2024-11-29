const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    membershipStatus: { type: String, default: 'active' },
});

module.exports = mongoose.model('User', userSchema); // Fixed ref
