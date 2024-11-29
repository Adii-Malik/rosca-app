const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contributionLimit: { type: Number, default: 1 } // Default contribution limit
});

const committeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    participants: [participantSchema], // Change to an array of participant objects
    totalPooledAmount: { type: Number, default: 0 },
    monthlyAmount: { type: Number, default: 0 },
    duration: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    withdrawDay: { type: Number, required: true }
});

module.exports = mongoose.model('Committee', committeeSchema);