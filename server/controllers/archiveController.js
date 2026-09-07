// controllers/archiveController.js
// Finished committees used to sit on the dashboard forever. They now move here,
// with the full record of what happened: every round, who won, and what each
// member put in.
const Committee = require('../models/Committee');
const Contribution = require('../models/Contribution');
const DrawRecord = require('../models/DrawRecord');

exports.getArchive = async (req, res, next) => {
    try {
        const committees = await Committee.find({ status: 'completed' })
            .populate('participants.user', 'name')
            .sort({ completedAt: -1, endDate: -1 });

        if (!committees.length) return res.status(200).json({ committees: [] });

        const ids = committees.map((c) => c._id);
        const [draws, contributions] = await Promise.all([
            DrawRecord.find({ committeeId: { $in: ids } }).populate('userId', 'name').sort({ date: 1 }),
            Contribution.find({ committeeId: { $in: ids } }),
        ]);

        const payload = committees.map((doc) => {
            const committee = doc.toObject();
            const id = String(committee._id);

            const committeeDraws = draws.filter((d) => String(d.committeeId) === id);
            const committeeContributions = contributions.filter((c) => String(c.committeeId) === id);

            const paidByUser = new Map();
            for (const contribution of committeeContributions) {
                const userId = String(contribution.userId);
                paidByUser.set(userId, (paidByUser.get(userId) || 0) + (contribution.amount || 0));
            }

            const payoutsByUser = new Map();
            for (const draw of committeeDraws) {
                const userId = String(draw.userId?._id || draw.userId);
                const amount = draw.payoutAmount ?? committee.totalPooledAmount;
                payoutsByUser.set(userId, (payoutsByUser.get(userId) || 0) + amount);
            }

            const members = committee.participants
                .filter((p) => p.user)
                .map((p) => {
                    const userId = String(p.user._id);
                    const contributed = paidByUser.get(userId) || 0;
                    const received = payoutsByUser.get(userId) || 0;
                    return {
                        userId,
                        name: p.user.name,
                        shares: p.contributionLimit || 1,
                        totalContributed: contributed,
                        totalReceived: received,
                        // Positive means they took out more than they put in.
                        net: received - contributed,
                        timesWon: committeeDraws.filter(
                            (d) => String(d.userId?._id || d.userId) === userId
                        ).length,
                    };
                });

            return {
                ...committee,
                rounds: committeeDraws.map((draw, index) => ({
                    _id: draw._id,
                    roundNumber: draw.roundNumber ?? index + 1,
                    periodKey: draw.periodKey,
                    date: draw.date,
                    winner: draw.userId ? { _id: draw.userId._id, name: draw.userId.name } : null,
                    payoutAmount: draw.payoutAmount ?? committee.totalPooledAmount,
                    trigger: draw.trigger,
                    // Legacy draws have no snapshot and so cannot be replayed.
                    canReplay: Array.isArray(draw.eligibleSnapshot) && draw.eligibleSnapshot.length > 0,
                })),
                members,
                totalContributed: members.reduce((sum, m) => sum + m.totalContributed, 0),
                totalPaidOut: members.reduce((sum, m) => sum + m.totalReceived, 0),
                roundsPlayed: committeeDraws.length,
            };
        });

        res.status(200).json({ committees: payload });
    } catch (error) {
        next(error);
    }
};

/** Everything needed to replay one draw's wheel animation. */
exports.getDrawReplay = async (req, res, next) => {
    try {
        const draw = await DrawRecord.findById(req.params.id)
            .populate('userId', 'name')
            .populate('committeeId', 'name totalPooledAmount');

        if (!draw) return res.status(404).json({ message: 'Draw not found.' });

        if (!draw.eligibleSnapshot?.length) {
            return res.status(409).json({
                message: 'This draw was recorded before replays were supported, so it cannot be replayed.',
            });
        }

        res.status(200).json({
            _id: draw._id,
            date: draw.date,
            periodKey: draw.periodKey,
            roundNumber: draw.roundNumber,
            committeeData: {
                _id: draw.committeeId?._id,
                name: draw.committeeId?.name,
                totalPooledAmount: draw.payoutAmount ?? draw.committeeId?.totalPooledAmount,
            },
            // Shaped like the live payload so the same wheel component drives both.
            eligibleUsers: draw.eligibleSnapshot.map((entry) => ({
                user: { _id: entry.userId, name: entry.name },
                contributionLimit: entry.contributionLimit,
            })),
            winner: {
                user: { _id: draw.userId?._id, name: draw.userId?.name },
            },
        });
    } catch (error) {
        next(error);
    }
};
