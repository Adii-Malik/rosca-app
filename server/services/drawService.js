// services/drawService.js
// The draw is decided entirely from database state. Nothing the client sends is
// trusted beyond the committee id — previously the browser supplied the
// participant list and draw history, which meant it could choose the winner.
const crypto = require('crypto');
const Committee = require('../models/Committee');
const Contribution = require('../models/Contribution');
const DrawRecord = require('../models/DrawRecord');
const schedule = require('../lib/schedule');

// How long the wheel animation runs on the client before the winner is revealed.
const ANIMATION_MS = Number(process.env.DRAW_ANIMATION_MS) || 20000;

class DrawError extends Error {}

const monthBounds = (date = new Date()) => ({
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
});

// Cryptographically fair pick — Math.random is not appropriate for deciding
// who receives money.
const pickRandom = (items) => items[crypto.randomInt(items.length)];

/**
 * Participants who may still be drawn: those who have not yet been paid out as
 * many times as their share count allows.
 */
const eligibleParticipants = (committee, drawRecords) => {
    const drawCounts = new Map();
    for (const record of drawRecords) {
        const id = String(record.userId?._id || record.userId);
        drawCounts.set(id, (drawCounts.get(id) || 0) + 1);
    }

    return committee.participants.filter((participant) => {
        if (!participant.user) return false; // participant whose user was deleted
        const id = String(participant.user._id || participant.user);
        return (drawCounts.get(id) || 0) < (participant.contributionLimit || 1);
    });
};

/** True once every participant has received all the payouts they are owed. */
const isFullyPaidOut = (committee, drawRecords) =>
    eligibleParticipants(committee, drawRecords).length === 0;

/**
 * Validates and performs a draw for the current round.
 * Throws DrawError with a user-facing message when the draw is not allowed.
 */
const performDraw = async (committeeId, { trigger = 'manual', now = new Date() } = {}) => {
    const committee = await Committee.findById(committeeId).populate('participants.user', 'name');
    if (!committee) throw new DrawError('Committee not found.');
    if (committee.status === 'completed') {
        throw new DrawError('This committee has finished; no further draws can be made.');
    }

    const periodKey = schedule.periodKeyFor(now, schedule.committeeTimezone(committee));
    const drawRecords = await DrawRecord.find({ committeeId });

    // One draw per committee per round. A unique index backs this up, so two
    // simultaneous attempts cannot both succeed.
    const alreadyDrawn = drawRecords.some((record) => {
        if (record.periodKey) return record.periodKey === periodKey;
        // Legacy records predate periodKey; fall back to a date comparison.
        const { start, end } = monthBounds(now);
        const when = new Date(record.date);
        return when >= start && when < end;
    });
    if (alreadyDrawn) {
        throw new DrawError('A draw has already been made for this committee this month.');
    }

    const { start, end } = monthBounds(now);
    const contributionsThisMonth = await Contribution.countDocuments({
        committeeId,
        date: { $gte: start, $lt: end },
    });
    if (contributionsThisMonth === 0) {
        throw new DrawError('No users have contributed this month.');
    }

    const eligible = eligibleParticipants(committee, drawRecords);
    if (!eligible.length) {
        throw new DrawError('All participants have already received their payout.');
    }

    const winner = pickRandom(eligible);

    return {
        committee,
        eligible,
        winner,
        periodKey,
        roundNumber: drawRecords.length + 1,
        trigger,
    };
};

/**
 * Persists the winner along with everything needed to replay the draw later.
 * Kept separate from performDraw so the record is written once the draw has
 * actually been broadcast.
 */
const recordWinner = async (committeeId, { winner, eligible, periodKey, roundNumber, committee, trigger }) => {
    try {
        return await DrawRecord.create({
            userId: winner.user._id,
            committeeId,
            date: new Date(),
            periodKey,
            roundNumber,
            payoutAmount: committee.totalPooledAmount,
            trigger,
            eligibleSnapshot: eligible.map((p) => ({
                userId: p.user._id,
                name: p.user.name,
                contributionLimit: p.contributionLimit || 1,
            })),
        });
    } catch (error) {
        // Unique index violation: another draw for this round landed first.
        if (error.code === 11000) {
            throw new DrawError('A draw has already been made for this committee this month.');
        }
        throw error;
    }
};

module.exports = {
    DrawError,
    ANIMATION_MS,
    performDraw,
    recordWinner,
    eligibleParticipants,
    isFullyPaidOut,
    monthBounds,
};

/**
 * Hands a round to a specific participant instead of drawing for it. Committees
 * commonly reserve the first round for whoever collects and runs them, and
 * rounds are sometimes agreed in advance for other reasons.
 *
 * Deliberately does not require contributions for the month: an assigned round
 * often happens as a committee starts, before anyone has paid in.
 */
const assignRound = async (committeeId, userId, { now = new Date() } = {}) => {
    const committee = await Committee.findById(committeeId).populate('participants.user', 'name');
    if (!committee) throw new DrawError('Committee not found.');
    if (committee.status === 'completed') {
        throw new DrawError('This committee has finished; no further rounds can be awarded.');
    }

    const periodKey = schedule.periodKeyFor(now, schedule.committeeTimezone(committee));
    const drawRecords = await DrawRecord.find({ committeeId });

    const alreadyDrawn = drawRecords.some((record) => {
        if (record.periodKey) return record.periodKey === periodKey;
        const { start, end } = monthBounds(now);
        const when = new Date(record.date);
        return when >= start && when < end;
    });
    if (alreadyDrawn) {
        throw new DrawError('This committee already has a winner for this month.');
    }

    const participant = committee.participants.find(
        (p) => p.user && String(p.user._id) === String(userId)
    );
    if (!participant) throw new DrawError('That member is not part of this committee.');

    // Same eligibility rule as a draw: nobody receives more payouts than shares.
    const eligible = eligibleParticipants(committee, drawRecords);
    const isEligible = eligible.some((p) => String(p.user._id) === String(userId));
    if (!isEligible) {
        throw new DrawError(`${participant.user.name} has already received every payout their shares allow.`);
    }

    const record = await DrawRecord.create({
        userId: participant.user._id,
        committeeId,
        date: now,
        periodKey,
        roundNumber: drawRecords.length + 1,
        payoutAmount: committee.totalPooledAmount,
        trigger: 'assigned',
        // No eligible snapshot: nothing was drawn, so there is nothing to replay.
    });

    return { committee, participant, record, periodKey };
};

module.exports.assignRound = assignRound;
