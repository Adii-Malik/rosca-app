// controllers/dashboardController.js
const Committee = require('../models/Committee');
const Contribution = require('../models/Contribution');
const DrawRecord = require('../models/DrawRecord');

exports.getDashbaord = async (req, res) => {
    try {
        // Fetch all committees that are in progress
        const committees = await Committee.find().populate('participants.user', 'name');

        // Get current month
        const currentMonth = new Date().getMonth();

        // Calculate months remaining for each committee
        const committeesWithMonthsRemaining = committees.map(committee => {
            const endDate = new Date(committee.endDate); // Assuming endDate is a field in your committee model
            const monthsRemaining = (endDate.getFullYear() - new Date().getFullYear()) * 12 + (endDate.getMonth() - currentMonth);
            return {
                ...committee.toObject(),
                monthsRemaining: monthsRemaining >= 0 ? monthsRemaining : 0
            };
        });

        // Fetch contributions for the current month
        const contributions = await Contribution.find({
            date: {
                $gte: new Date(new Date().getFullYear(), currentMonth, 1),
                $lt: new Date(new Date().getFullYear(), currentMonth + 1, 1) // to include contributions for the whole month
            }
        });

        // Fetch draw records for all committees
        const drawRecords = await DrawRecord.find().populate('userId', 'name');

        // Create a structure to hold committees with their contributors and non-contributors
        const committeesWithContributors = committeesWithMonthsRemaining.map(committee => {
            const totalContributionLimit = committee.participants.reduce((total, participant) => {
                return total + (participant.contributionLimit || 1);
            }, 0);

            // Enhance participants with contribution info
            const enhancedParticipants = committee.participants.map((participant) => {
                const userContributionLimit = participant.contributionLimit || 1;
                const calculatedAmount = totalContributionLimit > 0
                    ? (committee.totalPooledAmount * userContributionLimit) / totalContributionLimit
                    : 0;

                return {
                    ...participant,
                    contributionAmount: calculatedAmount,
                };
            });
            // Get contributions related to the current committee
            const committeeContributions = contributions.filter(contribution => contribution.committeeId.toString() === committee._id.toString());

            // Get contributed user IDs
            const contributedUserIds = committeeContributions.map(contribution => contribution.userId.toString());

            // Map enhanced participants to contributors and non-contributors
            const contributedUsers = enhancedParticipants
                .filter((participant) => contributedUserIds.includes(participant.user._id.toString()));

            const nonContributedUsers = enhancedParticipants
                .filter((participant) => !contributedUserIds.includes(participant.user._id.toString()));

            // Get draw records related to the current committee
            const committeeDrawRecords = drawRecords.filter(
                (draw) => draw.committeeId.toString() === committee._id.toString()
            );

            return {
                ...committee,
                contributedUsers,
                nonContributedUsers,
                drawRecords: committeeDrawRecords,
            };
        });

        res.status(200).json({
            committees: committeesWithContributors,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};