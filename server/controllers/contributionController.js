// controllers/contributionController.js
const Contribution = require('../models/Contribution');

exports.createContribution = async (req, res) => {
    const { userId, committeeId, amount, date } = req.body;
    try {
        // Parse the provided date to get the month and year
        const contributionDate = new Date(date);

        // Fetch contributions for the current month
        const existingContribution = await Contribution.find({
            userId,
            committeeId,
            date: {
                $gte: new Date(new Date().getFullYear(), contributionDate.getMonth(), 1),
                $lt: new Date(new Date().getFullYear(), contributionDate.getMonth() + 1, 1) // to include contributions for the whole month
            }
        });

        if (existingContribution.length) {
            return res.status(400).json({ message: "Contribution for this month already exists for the user." });
        }

        // Create and save the new contribution
        const newContribution = new Contribution({ userId, committeeId, amount, date });
        await newContribution.save();

        res.status(201).json(newContribution);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getContributions = async (req, res) => {
    try {
        const contributions = await Contribution.find().populate('userId committeeId');
        res.status(200).json(contributions);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateContribution = async (req, res) => {
    const { id } = req.params;
    const { amount, userId, committeeId, date } = req.body;

    try {
        const updatedContribution = await Contribution.findByIdAndUpdate(
            id,
            { amount, userId, committeeId, date },
            { new: true }
        )
            .populate('userId')  // Populating the userId field
            .populate('committeeId');  // Populating the committeeId field

        if (!updatedContribution) {
            return res.status(404).json({ message: 'Contribution not found' });
        }

        res.status(200).json(updatedContribution); // Send back the updated contribution
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


exports.deleteContribution = async (req, res) => {
    const { id } = req.params;
    try {
        await Contribution.findByIdAndDelete(id);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};