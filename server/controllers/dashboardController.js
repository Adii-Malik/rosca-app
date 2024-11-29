// controllers/dashboardController.js
const Committee = require('../models/Committee'); // Assuming you have a Committee model
const Contribution = require('../models/Contribution'); // Assuming you have a Contribution model
const User = require('../models/User'); // Assuming you have a User model

exports.getDashbaord = async (req, res) => {
    try {
        // Fetch all committees that are in progress
        const committees = await Committee.find();

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

        // Get all users
        const users = await User.find(); // Assuming you have a User model

        // Create a map of user IDs to user objects for easy lookup
        const userMap = users.reduce((map, user) => {
            map[user._id.toString()] = user;
            return map;
        }, {});

        // Create a structure to hold committees with their contributors and non-contributors
        const committeesWithContributors = committeesWithMonthsRemaining.map(committee => {
            // Get contributions related to the current committee
            const committeeContributions = contributions.filter(contribution => contribution.committeeId.toString() === committee._id.toString());

            // Get contributed user IDs
            const contributedUserIds = committeeContributions.map(contribution => contribution.userId.toString());

            // Get contributed and non-contributed users
            const contributedUsers = contributedUserIds.map(id => userMap[id]).filter(Boolean);
            const nonContributedUsers = users.filter(user => !contributedUserIds.includes(user._id.toString()));

            return {
                ...committee,
                contributedUsers,
                nonContributedUsers,
            };
        });

        res.status(200).json({
            committees: committeesWithContributors,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};