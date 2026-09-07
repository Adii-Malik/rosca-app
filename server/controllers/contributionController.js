// controllers/contributionController.js
const Contribution = require('../models/Contribution');
const Committee = require('../models/Committee');

// Bounds of the calendar month that `date` falls in. The previous version mixed
// the *current* year with the *submitted* month, so backdating a contribution
// to another year checked the wrong window.
const monthBoundsFor = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return { start, end };
};

exports.createContribution = async (req, res, next) => {
    const { userId, committeeId, amount, date } = req.body;
    try {
        const contributionDate = date ? new Date(date) : new Date();
        if (Number.isNaN(contributionDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date.' });
        }

        // A finished committee no longer collects money.
        const committee = await Committee.findById(committeeId).select('status name');
        if (!committee) return res.status(404).json({ message: 'Committee not found.' });
        if (committee.status === 'completed') {
            return res.status(409).json({
                message: `"${committee.name}" has finished; contributions can no longer be recorded for it.`,
            });
        }

        const { start, end } = monthBoundsFor(contributionDate);

        const existing = await Contribution.findOne({
            userId,
            committeeId,
            date: { $gte: start, $lt: end },
        });

        if (existing) {
            return res.status(409).json({
                message: 'A contribution for this month already exists for this user.',
            });
        }

        const newContribution = await Contribution.create({
            userId,
            committeeId,
            amount,
            date: contributionDate,
        });

        const populated = await newContribution.populate(['userId', 'committeeId']);
        res.status(201).json(populated);
    } catch (error) {
        next(error);
    }
};

exports.getContributions = async (req, res, next) => {
    try {
        // Optional filters keep the payload small once there is real history.
        const filter = {};
        if (req.query.committeeId) filter.committeeId = req.query.committeeId;
        if (req.query.userId) filter.userId = req.query.userId;

        const contributions = await Contribution.find(filter)
            .populate('userId committeeId')
            .sort({ date: -1 });
        res.status(200).json(contributions);
    } catch (error) {
        next(error);
    }
};

exports.updateContribution = async (req, res, next) => {
    const { id } = req.params;
    const { amount, userId, committeeId, date } = req.body;

    try {
        const updated = await Contribution.findByIdAndUpdate(
            id,
            { amount, userId, committeeId, date },
            { new: true, runValidators: true }
        )
            .populate('userId')
            .populate('committeeId');

        if (!updated) {
            return res.status(404).json({ message: 'Contribution not found' });
        }

        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

exports.deleteContribution = async (req, res, next) => {
    const { id } = req.params;
    try {
        const deleted = await Contribution.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'Contribution not found' });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

/**
 * Records contributions for several members of one committee in a single call.
 * Entering a month's payments one member at a time was the slowest part of using
 * the app.
 *
 * Members who already have a contribution for that month are reported as skipped
 * rather than failing the whole batch, so a partial re-run is safe.
 */
exports.createContributionsBulk = async (req, res, next) => {
    const { committeeId, date, entries } = req.body || {};

    if (!committeeId) return res.status(400).json({ message: 'A committee is required.' });
    if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ message: 'Select at least one member.' });
    }

    try {
        const committee = await Committee.findById(committeeId);
        if (!committee) return res.status(404).json({ message: 'Committee not found.' });
        if (committee.status === 'completed') {
            return res.status(409).json({
                message: `"${committee.name}" has finished; contributions can no longer be recorded for it.`,
            });
        }

        const contributionDate = date ? new Date(date) : new Date();
        if (Number.isNaN(contributionDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date.' });
        }
        const { start, end } = monthBoundsFor(contributionDate);

        // Each member's share, so an omitted amount does not depend on the client
        // having calculated it correctly.
        const totalShares = committee.participants.reduce(
            (sum, p) => sum + (p.contributionLimit || 1),
            0
        );
        const shareFor = (userId) => {
            const participant = committee.participants.find(
                (p) => String(p.user) === String(userId)
            );
            if (!participant || totalShares === 0) return null;
            return (committee.totalPooledAmount * (participant.contributionLimit || 1)) / totalShares;
        };

        const existing = await Contribution.find({
            committeeId,
            userId: { $in: entries.map((e) => e.userId) },
            date: { $gte: start, $lt: end },
        });
        const alreadyPaid = new Set(existing.map((c) => String(c.userId)));

        const created = [];
        const skipped = [];

        for (const entry of entries) {
            const share = shareFor(entry.userId);

            if (share === null) {
                skipped.push({ userId: entry.userId, reason: 'not-a-participant' });
                continue;
            }
            if (alreadyPaid.has(String(entry.userId))) {
                skipped.push({ userId: entry.userId, reason: 'already-paid' });
                continue;
            }

            const amount = entry.amount === undefined || entry.amount === null || entry.amount === ''
                ? share
                : Number(entry.amount);

            if (!Number.isFinite(amount) || amount < 0) {
                skipped.push({ userId: entry.userId, reason: 'invalid-amount' });
                continue;
            }

            created.push({ userId: entry.userId, committeeId, amount, date: contributionDate });
        }

        const inserted = created.length
            ? await Contribution.insertMany(created)
            : [];

        // Returned populated so the list can be updated without another request.
        const populated = inserted.length
            ? await Contribution.find({ _id: { $in: inserted.map((c) => c._id) } })
                  .populate('userId committeeId')
            : [];

        res.status(created.length ? 201 : 200).json({
            created: populated,
            skipped,
            summary: { created: populated.length, skipped: skipped.length },
        });
    } catch (error) {
        next(error);
    }
};
