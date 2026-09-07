// services/drawService.js
// The draw is decided entirely from database state. Nothing the client sends is
// trusted beyond the committee id — previously the browser supplied the
// participant list and draw history, which meant it could choose the winner.
const crypto = require('crypto');
const Committee = require('../models/Committee');
const Contribution = require('../models/Contribution');
const DrawRecord = require('../models/DrawRecord');
const schedule = require('../lib/schedule');

// How long the wheel spins before the server reveals the winner. The client
// then decelerates onto them, so the draw lasts this plus the landing — long
// enough to build to the reveal, short enough not to be a wait.
const ANIMATION_MS = Number(process.env.DRAW_ANIMATION_MS) || 7000;

class DrawError extends Error {}

// Share amounts divide a pool that rarely divides evenly, so "paid in full" is
// judged to the nearest rupee rather than exactly.
const ROUNDING_TOLERANCE = 1;

// How far past its announced moment the server will still run a draw on its
// own. This covers a draw missed because the process was down or restarting —
// minutes, normally — without letting a round that has been waiting on money
// for days fire the instant the last payment is recorded.
const AUTO_DRAW_GRACE_MS = Number(process.env.DRAW_AUTO_GRACE_MS) || 60 * 60 * 1000;

// Cryptographically fair pick — Math.random is not appropriate for deciding
// who receives money.
const pickRandom = (items) => items[crypto.randomInt(items.length)];

/**
 * The round this committee owes next: the earliest one it has not drawn.
 *
 * Rounds are positions in the term, one per month, so a round that was not drawn
 * on its day is still owed afterwards. A committee that starts in September and
 * pays out through June owes ten rounds, and the September round stays
 * outstanding until it actually runs — drawing it late records it against
 * September, where it belongs.
 *
 * Found by looking for the first undrawn period rather than by counting
 * records, so deleting a round that was drawn in error reopens that round
 * instead of leaving the sequence pointing past it at one already taken.
 */
const nextRoundFor = (committee, drawRecords = [], now = new Date()) => {
    const drawn = new Set(drawRecords.map((r) => r.periodKey).filter(Boolean));

    for (let roundNumber = 1; roundNumber <= committee.duration; roundNumber += 1) {
        const periodKey = schedule.periodKeyForRound(committee, roundNumber);
        if (drawn.has(periodKey)) continue;

        // The announced moment, if this round has one it has not long passed.
        // Absent means an admin runs this round by hand: see autoDrawInstantFor.
        const autoAt = schedule.autoDrawInstantFor(committee, roundNumber);
        const autoDrawAt =
            autoAt && now - autoAt <= AUTO_DRAW_GRACE_MS && committee.autoDraw !== false
                ? autoAt
                : null;

        return {
            roundNumber,
            beyondTerm: false,
            periodKey,
            dueAt: schedule.dueAtForRound(committee, roundNumber),
            isDue: schedule.roundIsDue(committee, roundNumber, now),
            autoDrawAt,
            autoDrawDue: Boolean(autoDrawAt) && now >= autoDrawAt,
        };
    }

    return {
        roundNumber: committee.duration + 1,
        beyondTerm: true,
        periodKey: null,
        dueAt: null,
        isDue: false,
        autoDrawAt: null,
        autoDrawDue: false,
    };
};

/**
 * Who has and has not paid in for a round, and whether the pool is complete.
 *
 * The whole pool is handed to one member, so it has to be collected first.
 * Requiring a single contribution — the previous rule — let a draw pay out
 * money that had not arrived.
 */
const fundingFor = (committee, contributions, periodKey) => {
    const tz = schedule.committeeTimezone(committee);
    const forPeriod = contributions.filter(
        (c) => schedule.periodKeyFor(c.date, tz) === periodKey
    );

    const paidByUser = new Map();
    for (const contribution of forPeriod) {
        const id = String(contribution.userId);
        paidByUser.set(id, (paidByUser.get(id) || 0) + (contribution.amount || 0));
    }

    const totalShares = committee.participants.reduce((sum, p) => sum + (p.contributionLimit || 1), 0);

    const members = committee.participants
        .filter((p) => p.user)
        .map((participant) => {
            const shares = participant.contributionLimit || 1;
            const owed = totalShares > 0 ? (committee.totalPooledAmount * shares) / totalShares : 0;
            const userId = String(participant.user._id || participant.user);
            const paid = paidByUser.get(userId) || 0;
            return {
                userId,
                name: participant.user.name,
                shares,
                owed,
                paid,
                outstanding: Math.max(owed - paid, 0),
                settled: paid + ROUNDING_TOLERANCE >= owed,
            };
        });

    const unpaid = members.filter((m) => !m.settled);
    return {
        members,
        unpaid,
        collected: members.reduce((sum, m) => sum + m.paid, 0),
        outstanding: unpaid.reduce((sum, m) => sum + m.outstanding, 0),
        funded: unpaid.length === 0 && members.length > 0,
    };
};

/**
 * The shortfall as an amount, e.g. "Rs 10,000". Deliberately not a list of
 * names: who still owes belongs in the members list, where it is shown once.
 */
const describeShortfall = (funding) =>
    `Rs ${Math.round(funding.outstanding).toLocaleString('en-PK')}`;

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

    const drawRecords = await DrawRecord.find({ committeeId });
    const round = nextRoundFor(committee, drawRecords, now);

    if (round.beyondTerm) {
        throw new DrawError('Every round of this committee has already been drawn.');
    }
    if (!round.isDue) {
        const when = round.dueAt.toLocaleString('en-GB', {
            timeZone: schedule.committeeTimezone(committee),
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
        });
        throw new DrawError(`Round ${round.roundNumber} is not due yet — it opens on ${when}.`);
    }

    // Scoped to the round's own month in the committee's timezone, so drawing a
    // late round still checks the month that round belongs to.
    const { start, end } = schedule.periodBounds(round.periodKey, schedule.committeeTimezone(committee));
    const contributions = await Contribution.find({ committeeId, date: { $gte: start, $lt: end } });
    const funding = fundingFor(committee, contributions, round.periodKey);

    if (!funding.funded) {
        throw new DrawError(
            `Round ${round.roundNumber} cannot be drawn until the pool is complete — ` +
            `${describeShortfall(funding)} of it is still to be collected.`
        );
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
        periodKey: round.periodKey,
        roundNumber: round.roundNumber,
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
            throw new DrawError('This round has already been drawn for this committee.');
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
    nextRoundFor,
    fundingFor,
    describeShortfall,
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

    const drawRecords = await DrawRecord.find({ committeeId });
    const round = nextRoundFor(committee, drawRecords, now);
    if (round.beyondTerm) {
        throw new DrawError('Every round of this committee has already been drawn.');
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
        periodKey: round.periodKey,
        roundNumber: round.roundNumber,
        payoutAmount: committee.totalPooledAmount,
        trigger: 'assigned',
        // No eligible snapshot: nothing was drawn, so there is nothing to replay.
    });

    return { committee, participant, record, periodKey: round.periodKey };
};

module.exports.assignRound = assignRound;
