// /controllers/drawController.js
const DrawRecord = require('../models/DrawRecord');
const drawService = require('../services/drawService');

// There is deliberately no endpoint for inserting a draw record directly. One
// existed, unused by the app, and it wrote a record with no round or period
// attached — which now shifts every later round out of step with the term.
// Winners arrive either by a draw or by `awardRound`, both of which place the
// record in its proper round.

exports.getDrawRecords = async (req, res) => {
    try {
        const drawRecords = await DrawRecord.find().populate('userId').sort({ date: -1 });
        res.status(200).json(drawRecords);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteDrawRecord = async (req, res) => {
    const { id } = req.params;
    try {
        await DrawRecord.findByIdAndDelete(id);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * Awards the current round to a chosen member rather than drawing for it.
 * Used for conventions like the collector taking the first round.
 */
exports.awardRound = async (req, res, next) => {
    const { committeeId, userId } = req.body || {};
    if (!committeeId || !userId) {
        return res.status(400).json({ message: 'A committee and a member are required.' });
    }

    try {
        const { participant, record, committee } = await drawService.assignRound(committeeId, userId);

        const populated = await DrawRecord.findById(record._id).populate('userId', 'name');

        // Anyone with the dashboard open should see it appear.
        req.app.get('io')?.emit('roundAwarded', {
            committeeId: String(committeeId),
            committeeName: committee.name,
            winnerName: participant.user.name,
        });

        res.status(201).json(populated);
    } catch (error) {
        if (error instanceof drawService.DrawError) {
            return res.status(409).json({ message: error.message });
        }
        next(error);
    }
};
