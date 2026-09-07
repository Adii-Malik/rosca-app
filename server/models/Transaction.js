// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        // The ref was previously 'User  ' (trailing spaces), so populate silently failed.
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        committeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Committee', required: true, index: true },
        amount: { type: Number, required: true, min: 0 },
        type: { type: String, enum: ['contribution', 'payout'], required: true },
        date: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
