// controllers/committeeController.js
const Committee = require('../models/Committee');

exports.createCommittee = async (req, res) => {
    try {
        const { name, participants, totalPooledAmount, startDate, endDate, withdrawDay } = req.body;

        // Calculate the duration in months
        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

        // Calculate the total contribution limit from all participants
        const totalContributionLimit = participants.reduce((total, participant) => {
            return total + (participant.contributionLimit || 1); // Default to 1 if not provided
        }, 0);

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
            withdrawDay
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

// Get all committees
exports.getCommittees = async (req, res) => {
    try {
        const committees = await Committee.find().populate('participants.user', 'name');
        res.status(200).json(committees);
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
    const { name, participants, totalPooledAmount, startDate, endDate, withdrawDay } = req.body;

    try {
        // Calculate the duration in months
        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

        // Calculate the total contribution limit from all participants
        const totalContributionLimit = participants.reduce((total, participant) => {
            return total + (participant.contributionLimit || 1); // Default to 1 if not provided
        }, 0);

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
                withdrawDay
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