// controllers/dashboardController.js
const Committee = require('../models/Committee');
const Contribution = require('../models/Contribution');
const DrawRecord = require('../models/DrawRecord');
const schedule = require('../lib/schedule');
const drawService = require('../services/drawService');

/** Whole months between now and `endDate`, floored at zero. */
const monthsRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
    return Math.max(months, 0);
};

exports.getDashboard = async (req, res, next) => {
    try {
        const [committees, drawRecords] = await Promise.all([
            // Finished committees move to the archive rather than lingering here.
            // `$ne: 'completed'` so committees created before the status field
            // existed still count as active.
            Committee.find({ status: { $ne: 'completed' } }).populate('participants.user', 'name'),
            DrawRecord.find().populate('userId', 'name'),
        ]);

        const payload = await Promise.all(
            committees.map(async (doc) => {
                const committee = doc.toObject();
                const tz = schedule.committeeTimezone(committee);

                const committeeDrawRecords = drawRecords.filter(
                    (draw) => String(draw.committeeId) === String(committee._id)
                );

                const round = drawService.nextRoundFor(committee, committeeDrawRecords);
                const nowPeriodKey = schedule.periodKeyFor(new Date(), tz);
                const startPeriodKey = schedule.periodKeyFor(new Date(committee.startDate), tz);

                // Which month's collection to show. This is the current month
                // almost always, and deliberately not "the next round the
                // committee owes": once September's round is drawn the next
                // round is October, and showing October's empty sheet while it
                // is still September makes every member look unpaid.
                //
                // It looks back only when an earlier round is genuinely still
                // undrawn — the one case where the month that needs chasing is
                // not the current one. Period keys sort lexically.
                const collectingPeriodKey = [
                    startPeriodKey,
                    [nowPeriodKey, round.periodKey || nowPeriodKey].sort()[0],
                ].sort()[1];

                const collecting = schedule.periodBounds(collectingPeriodKey, tz);
                const committeeContributions = await Contribution.find({
                    committeeId: committee._id,
                    date: { $gte: collecting.start, $lt: collecting.end },
                });

                // The same reckoning the draw itself uses, so the screen cannot
                // say a member still owes while the draw considers the pool
                // complete — a share of an odd pool leaves fractional rupees,
                // and the two used to round them differently.
                const funding = drawService.fundingFor(
                    committee,
                    committeeContributions,
                    collectingPeriodKey
                );
                const fundingByUser = new Map(funding.members.map((m) => [m.userId, m]));

                // Whether the next round can run is a question about that
                // round's own month, which is only the same month when the two
                // above coincide.
                let roundFunding = funding;
                if (!round.beyondTerm && round.periodKey !== collectingPeriodKey) {
                    const bounds = schedule.periodBounds(round.periodKey, tz);
                    roundFunding = drawService.fundingFor(
                        committee,
                        await Contribution.find({
                            committeeId: committee._id,
                            date: { $gte: bounds.start, $lt: bounds.end },
                        }),
                        round.periodKey
                    );
                }

                const participants = committee.participants
                    .filter((p) => p.user)
                    .map((participant) => {
                        const paid = fundingByUser.get(String(participant.user._id));
                        return {
                            ...participant,
                            contributionAmount: paid?.owed ?? 0,
                            paidAmount: paid?.paid ?? 0,
                            outstandingAmount: paid?.outstanding ?? 0,
                            isSettled: Boolean(paid?.settled),
                            hasPaidPartially: Boolean(paid && paid.paid > 0 && !paid.settled),
                        };
                    });

                // The segmented term indicator needs to distinguish a committee
                // that has not begun from one in its first round.
                const hasStarted = nowPeriodKey >= startPeriodKey;

                return {
                    ...committee,
                    hasStarted,
                    roundsPlayed: committeeDrawRecords.length,
                    monthsRemaining: monthsRemaining(committee.endDate),
                    // The month whose collection is on screen, and separately
                    // the round waiting to be drawn. They are the same month
                    // until a round is drawn early or runs late.
                    periodKey: collectingPeriodKey,
                    roundPeriodKey: round.periodKey,
                    roundNumber: round.beyondTerm ? committee.duration : round.roundNumber,
                    // Whether it can be drawn, and if not, which of the two
                    // reasons applies. Left as flags rather than a sentence: the
                    // wording belongs next to the layout it has to fit.
                    roundIsDue: round.isDue,
                    roundFunded: roundFunding.funded,
                    // Whether the server will start this draw by itself. False
                    // for a round past its announced moment, which an admin runs
                    // when members are gathered rather than it going off alone.
                    roundWillAutoDraw: Boolean(round.autoDrawAt),
                    // True once its day has passed and it still has not been
                    // drawn, which is the state that needs chasing.
                    roundOverdue: round.isDue && !roundFunding.funded,
                    // Money is in and its moment has passed: nothing left but to
                    // run it.
                    roundReadyToDraw: round.isDue && roundFunding.funded && !round.autoDrawAt,
                    allRoundsDrawn: round.beyondTerm,
                    // The countdown refers to the moment the server will actually
                    // draw, rather than a time hardcoded in the browser.
                    nextDrawAt: (round.dueAt || new Date()).toISOString(),
                    participants,
                    // Anyone who has paid something appears as a contributor,
                    // matching the previous behaviour, but the amounts are real.
                    contributedUsers: participants.filter((p) => p.paidAmount > 0),
                    nonContributedUsers: participants.filter((p) => p.paidAmount === 0),
                    collectedAmount: participants.reduce((sum, p) => sum + p.paidAmount, 0),
                    outstandingAmount: participants.reduce((sum, p) => sum + p.outstandingAmount, 0),
                    drawRecords: committeeDrawRecords,
                };
            })
        );

        res.status(200).json({ committees: payload });
    } catch (error) {
        next(error);
    }
};
