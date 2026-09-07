// models/Contribution.js
const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        committeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Committee', required: true },
        amount: { type: Number, required: true, min: 0 },
        date: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Supports the "has this user paid this month?" lookup.
contributionSchema.index({ committeeId: 1, userId: 1, date: -1 });

module.exports = mongoose.model('Contribution', contributionSchema);
