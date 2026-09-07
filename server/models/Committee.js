const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Number of shares held: how much this member pays each month, and how many
    // payouts they may receive over the committee's life.
    contributionLimit: { type: Number, default: 1, min: 1 },
});

const committeeSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        participants: [participantSchema],
        totalPooledAmount: { type: Number, default: 0, min: 0 },
        monthlyAmount: { type: Number, default: 0, min: 0 },
        duration: { type: Number, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },

        // ---- Withdrawal schedule ----
        // The day of month the draw runs. Clamped to the month's length, so 31
        // still fires in February.
        withdrawDay: { type: Number, required: true, min: 1, max: 31 },
        // The hour was previously hardcoded to 15:00 in the browser and nothing
        // ever acted on it. It is now stored and the server draws at this time.
        withdrawHour: { type: Number, default: 15, min: 0, max: 23 },
        withdrawMinute: { type: Number, default: 0, min: 0, max: 59 },
        timezone: { type: String, default: 'Asia/Karachi' },
        // When false the server will not draw automatically; an admin still can.
        autoDraw: { type: Boolean, default: true },

        // ---- Lifecycle ----
        // Committees used to live on the dashboard forever. They are now closed
        // once the term ends or everyone has been paid out.
        status: { type: String, enum: ['active', 'completed'], default: 'active', index: true },
        completedAt: { type: Date, default: null },
        completionReason: {
            type: String,
            enum: ['term-ended', 'all-paid-out', 'closed-manually', null],
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Committee', committeeSchema);
