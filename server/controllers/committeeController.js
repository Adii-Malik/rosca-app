// controllers/committeeController.js
const Committee = require('../models/Committee');
const Contribution = require('../models/Contribution');
const DrawRecord = require('../models/DrawRecord');

/** Whole months from `start`'s month to `end`'s month, counting both. */
const monthsInclusive = (start, end) =>
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

/**
 * The term length is the share count, so the end date has to agree with it.
 * Counts months inclusively — a committee starting in September and ending in
 * June runs ten rounds, September through June -- which is how people read the
 * dates they typed. Returns a message when they disagree, or null when they fit.
 */
const describeTermMismatch = (startDate, endDate, rounds) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 'Start and end dates must both be valid dates.';
    }
    if (end < start) return 'The end date must fall on or after the start date.';

    const months = monthsInclusive(start, end);
    if (months === rounds) return null;

    const expectedEnd = new Date(start);
    expectedEnd.setMonth(expectedEnd.getMonth() + rounds - 1);
    const monthLabel = expectedEnd.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    return (
        `This committee has ${rounds} share${rounds === 1 ? '' : 's'}, so it needs ` +
        `${rounds} round${rounds === 1 ? '' : 's'} — but the dates cover ${months} ` +
        `month${months === 1 ? '' : 's'}. Either end it in ${monthLabel} or adjust the shares.`
    );
};

exports.createCommittee = async (req, res) => {
    try {
        const {
            name, participants, totalPooledAmount, startDate, endDate, withdrawDay,
            withdrawHour, withdrawMinute, timezone, autoDraw,
        } = req.body;

        // Calculate the total contribution limit from all participants
        const totalContributionLimit = participants.reduce((total, participant) => {
            return total + (participant.contributionLimit || 1); // Default to 1 if not provided
        }, 0);

        // One round pays out one share, so the term is exactly as long as there
        // are shares. Deriving it from the dates instead used to let the two
        // disagree — a committee of 10 shares whose dates spanned 9 months left
        // one share never paid out -- so the dates are validated against the
        // share count rather than being the source of it.
        const duration = totalContributionLimit;
        const mismatch = describeTermMismatch(startDate, endDate, duration);
        if (mismatch) return res.status(400).json({ message: mismatch });

        // Calculate the monthly amount based on the total contribution limit
        const monthlyAmount = totalContributionLimit > 0 ? totalPooledAmount / totalContributionLimit : 0;

        // Map participants to include user IDs and contribution limits
        const mappedParticipants = participants.map(participant => ({
            user: participant.userId, // Assuming participant contains userId
            contributionLimit: participant.contributionLimit || 1 // Default to 1 if not provided
        }));

        const newCommittee = new Committee({
            name,
            participants: mappedParticipants, // Use the mapped participants
            totalPooledAmount,
            monthlyAmount,
            duration,
            startDate,
            endDate,
            withdrawDay,
            withdrawHour,
            withdrawMinute,
            timezone,
            autoDraw,
        });

        await newCommittee.save();

        // Populate the participants.user field
        const populatedCommittee = await Committee.findById(newCommittee._id).populate('participants.user');

        res.status(201).json(populatedCommittee);
    } catch (error) {
        console.error('Error creating committee:', error);
        res.status(500).json({ message: 'Error creating committee' });
    }
};

// Get all committees, each with a count of the records that reference it so the
// UI can say exactly what a deletion would orphan.
exports.getCommittees = async (req, res) => {
    try {
        const committees = await Committee.find()
            .populate('participants.user', 'name')
            .sort({ status: 1, startDate: -1 });

        const ids = committees.map((c) => c._id);
        const [draws, contributions] = await Promise.all([
            DrawRecord.aggregate([
                { $match: { committeeId: { $in: ids } } },
                { $group: { _id: '$committeeId', n: { $sum: 1 } } },
            ]),
            Contribution.aggregate([
                { $match: { committeeId: { $in: ids } } },
                { $group: { _id: '$committeeId', n: { $sum: 1 } } },
            ]),
        ]);

        const drawCounts = new Map(draws.map((d) => [String(d._id), d.n]));
        const contributionCounts = new Map(contributions.map((c) => [String(c._id), c.n]));

        res.status(200).json(
            committees.map((doc) => {
                const committee = doc.toObject();
                const id = String(committee._id);
                return {
                    ...committee,
                    drawCount: drawCounts.get(id) || 0,
                    contributionCount: contributionCounts.get(id) || 0,
                };
            })
        );
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get specific committee
exports.getCommittee = async (req, res) => {
    try {
        const { id } = req.params;
        const committee = await Committee.findById(id).populate('participants.user', 'name');
        res.status(200).json(committee);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update a committee
exports.updateCommittee = async (req, res) => {
    const { id } = req.params;
    const {
        name, participants, totalPooledAmount, startDate, endDate, withdrawDay,
        withdrawHour, withdrawMinute, timezone, autoDraw,
    } = req.body;

    try {
        // A finished committee is a historical record: the archive recomputes
        // each member's ledger from its participants and payout, so editing one
        // would silently rewrite what is reported to have happened.
        const existing = await Committee.findById(id).select('status name');
        if (!existing) return res.status(404).json({ message: 'Committee not found' });
        if (existing.status === 'completed') {
            return res.status(409).json({
                message: `"${existing.name}" has finished. Reopen it before making changes.`,
            });
        }

        // Calculate the total contribution limit from all participants
        const totalContributionLimit = participants.reduce((total, participant) => {
            return total + (participant.contributionLimit || 1); // Default to 1 if not provided
        }, 0);

        // The term is the share count — see createCommittee.
        const duration = totalContributionLimit;
        const mismatch = describeTermMismatch(startDate, endDate, duration);
        if (mismatch) return res.status(400).json({ message: mismatch });

        // Calculate the monthly amount based on the total contribution limit
        const monthlyAmount = totalContributionLimit > 0 ? totalPooledAmount / totalContributionLimit : 0;

        // Map participants to include user IDs and contribution limits
        const mappedParticipants = participants.map(participant => ({
            user: participant.userId, // Assuming participant contains userId
            contributionLimit: participant.contributionLimit || 1 // Default to 1 if not provided
        }));

        const updatedCommittee = await Committee.findByIdAndUpdate(
            id,
            {
                name,
                participants: mappedParticipants, // Use the mapped participants
                totalPooledAmount,
                monthlyAmount, // Include the calculated monthly amount
                duration, // Include the calculated duration
                startDate,
                endDate,
                withdrawDay,
                withdrawHour,
                withdrawMinute,
                timezone,
                autoDraw,
            },
            { new: true }
        ).populate('participants.user');;

        if (!updatedCommittee) {
            return res.status(404).json({ message: 'Committee not found' });
        }

        res.status(200).json(updatedCommittee);
    } catch (error) {
        console.error('Error updating committee:', error);
        res.status(400).json({ message: error.message });
    }
};

// Delete a committee
exports.deleteCommittee = async (req, res) => {
    const { id } = req.params;
    try {
        await Committee.findByIdAndDelete(id);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
// Close a committee by hand, or reopen one closed too early (a wrong end date,
// or a term that ran longer than planned).
exports.setCommitteeStatus = async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'completed'].includes(status)) {
        return res.status(400).json({ message: "status must be 'active' or 'completed'." });
    }

    try {
        const committee = await Committee.findByIdAndUpdate(
            id,
            status === 'completed'
                ? { status, completedAt: new Date(), completionReason: 'closed-manually' }
                : { status, completedAt: null, completionReason: null },
            { new: true }
        ).populate('participants.user', 'name');

        if (!committee) return res.status(404).json({ message: 'Committee not found' });
        res.status(200).json(committee);
    } catch (error) {
        next(error);
    }
};
