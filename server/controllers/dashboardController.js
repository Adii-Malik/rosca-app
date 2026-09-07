// controllers/dashboardController.js
const Committee = require('../models/Committee');
const Contribution = require('../models/Contribution');
const DrawRecord = require('../models/DrawRecord');
const schedule = require('../lib/schedule');

const monthBounds = (date = new Date()) => ({
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
});

/** Whole months between now and `endDate`, floored at zero. */
const monthsRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
    return Math.max(months, 0);
};

exports.getDashboard = async (req, res, next) => {
    try {
        const { start, end } = monthBounds();

        const [committees, contributions, drawRecords] = await Promise.all([
            // Finished committees move to the archive rather than lingering here.
            // `$ne: 'completed'` so committees created before the status field
            // existed still count as active.
            Committee.find({ status: { $ne: 'completed' } }).populate('participants.user', 'name'),
            Contribution.find({ date: { $gte: start, $lt: end } }),
            DrawRecord.find().populate('userId', 'name'),
        ]);

        const payload = committees.map((doc) => {
            const committee = doc.toObject();

            const committeeContributions = contributions.filter(
                (c) => String(c.committeeId) === String(committee._id)
            );

            // Actual amount each member has paid this month. A member may pay in
            // more than one instalment, so contributions are summed rather than
            // treated as a yes/no flag.
            const paidByUser = new Map();
            for (const contribution of committeeContributions) {
                const id = String(contribution.userId);
                paidByUser.set(id, (paidByUser.get(id) || 0) + (contribution.amount || 0));
            }

            const totalShares = committee.participants.reduce(
                (sum, p) => sum + (p.contributionLimit || 1),
                0
            );

            const participants = committee.participants
                .filter((p) => p.user)
                .map((participant) => {
                    const shares = participant.contributionLimit || 1;
                    // What this member owes: their share of the monthly pool.
                    const contributionAmount = totalShares > 0
                        ? (committee.totalPooledAmount * shares) / totalShares
                        : 0;
                    const paidAmount = paidByUser.get(String(participant.user._id)) || 0;

                    return {
                        ...participant,
                        contributionAmount,
                        paidAmount,
                        outstandingAmount: Math.max(contributionAmount - paidAmount, 0),
                        // Fully settled only when the full share has been paid.
                        isSettled: paidAmount >= contributionAmount && contributionAmount > 0,
                        hasPaidPartially: paidAmount > 0 && paidAmount < contributionAmount,
                    };
                });

            const committeeDrawRecords = drawRecords.filter(
                (draw) => String(draw.committeeId) === String(committee._id)
            );

            const collectedAmount = participants.reduce((sum, p) => sum + p.paidAmount, 0);

            const periodKey = schedule.periodKeyFor(new Date(), schedule.committeeTimezone(committee));
            const drawnThisPeriod = committeeDrawRecords.some((draw) =>
                draw.periodKey ? draw.periodKey === periodKey : new Date(draw.date) >= start
            );

            // A committee created after its own draw day still owes a round for
            // its first month, but the scheduler will not fire it retroactively.
            // Flagging it means the month is run deliberately rather than lost.
            const scheduledThisPeriod = schedule.scheduledInstantFor(committee);
            // Compared by month rather than instant: startDate is stored at UTC
            // midnight, which is 05:00 in Karachi, so an instant comparison would
            // call the committee "not started" for the first few hours of its
            // own start day.
            const startPeriodKey = schedule.periodKeyFor(
                new Date(committee.startDate),
                schedule.committeeTimezone(committee)
            );
            const needsManualDraw =
                !drawnThisPeriod &&
                periodKey >= startPeriodKey &&
                scheduledThisPeriod < new Date(committee.startDate);

            // The segmented term indicator needs to distinguish a committee that
            // has not begun from one in its first round.
            const hasStarted = periodKey >= startPeriodKey;

            return {
                ...committee,
                hasStarted,
                roundsPlayed: committeeDrawRecords.length,
                monthsRemaining: monthsRemaining(committee.endDate),
                // The countdown now refers to the moment the server will actually
                // draw, rather than a time hardcoded in the browser.
                nextDrawAt: new Date(Date.now() + schedule.msUntilNext(committee)).toISOString(),
                drawnThisPeriod,
                needsManualDraw,
                periodKey,
                participants,
                // Anyone who has paid something appears as a contributor, matching
                // the previous behaviour, but the amounts are now real.
                contributedUsers: participants.filter((p) => p.paidAmount > 0),
                nonContributedUsers: participants.filter((p) => p.paidAmount === 0),
                collectedAmount,
                outstandingAmount: participants.reduce((sum, p) => sum + p.outstandingAmount, 0),
                drawRecords: committeeDrawRecords,
            };
        });

        res.status(200).json({ committees: payload });
    } catch (error) {
        next(error);
    }
};
