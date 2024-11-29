// /controllers/drawController.js
const DrawRecord = require('../models/DrawRecord');

exports.createDrawRecord = async (req, res) => {
    try {
        const { userId, committeeId, date } = req.body;
        const drawRecord = new DrawRecord({ userId, committeeId, date });
        await drawRecord.save();
        res.status(201).json(drawRecord);
    } catch (error) {
        res.status(500).json({ message: 'Error creating draw record', error });
    }
};

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
