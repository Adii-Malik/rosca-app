// models/DrawRecord.js
const mongoose = require('mongoose');

// Who was on the wheel when the draw ran. Stored so a draw can be replayed
// exactly as it happened — the live broadcast used to be the only chance to see
// it, and the winner alone is not enough to reconstruct the spin.
const eligibleEntrySchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String },
        contributionLimit: { type: Number, default: 1 },
    },
    { _id: false }
);

const drawRecordSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        committeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Committee', required: true, index: true },
        // Previously typed String, which made date range queries compare text.
        date: { type: Date, required: true, default: Date.now },

        // Round identifier in the committee's own timezone, e.g. "2026-09".
        // Legacy records predate this and leave it null.
        periodKey: { type: String, default: null },
        roundNumber: { type: Number, default: null },

        // The payout at the time of the draw. Reading it from the committee
        // later would misreport history if the amount is ever changed.
        payoutAmount: { type: Number, default: null },

        eligibleSnapshot: { type: [eligibleEntrySchema], default: undefined },
        // 'assigned' means an admin handed the round to someone directly — the
        // collector taking round one, say — rather than it being drawn.
        trigger: { type: String, enum: ['scheduled', 'manual', 'assigned'], default: 'manual' },
    },
    { timestamps: true }
);

drawRecordSchema.index({ committeeId: 1, date: -1 });

// One draw per committee per round, enforced by the database rather than by a
// check that two concurrent requests could both pass. Sparse so the legacy
// records with a null periodKey do not collide with each other.
drawRecordSchema.index(
    { committeeId: 1, periodKey: 1 },
    { unique: true, partialFilterExpression: { periodKey: { $type: 'string' } } }
);

module.exports = mongoose.model('DrawRecord', drawRecordSchema);
