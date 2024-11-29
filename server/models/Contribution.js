const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Fixed ref
    committeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Committee', required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Contribution', contributionSchema);
