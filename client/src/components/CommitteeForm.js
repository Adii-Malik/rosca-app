// src/components/CommitteeForm.js
import React, { useState, useEffect } from 'react';
import UserSelect from './UserSelect'; // Import the UserSelect component

const CommitteeForm = ({ onCommitteeAdded, onCommitteeUpdated, committee, users }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [participants, setParticipants] = useState([]); // Changed to an array
    const [totalPooledAmount, setTotalPooledAmount] = useState(0);
    const [duration, setDuration] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [withdrawDay, setWithdrawDay] = useState('');
    const [contributionLimits, setContributionLimits] = useState({}); // New state for contribution limits

    // Populate form fields if a committee is being edited
    useEffect(() => {
        if (committee) {
            setName(committee.name);
            setDescription(committee.description);
            setParticipants(committee.participants.map(participant => participant.user._id)); // Assuming participants are stored as ObjectId
            setTotalPooledAmount(committee.totalPooledAmount);
            setDuration(committee.duration);
            setStartDate(committee.startDate.split('T')[0]); // Format date for input
            setEndDate(committee.endDate.split('T')[0]); // Format date for input
            setWithdrawDay(committee.withdrawDay);

            // Set contribution limits based on the committee data
            const limits = {};
            committee.participants.forEach(participant => {
                limits[participant.user._id] = participant.contributionLimit || 1; // Default to 1 if not set
            });
            setContributionLimits(limits);
        } else {
            setName('');
            setDescription('');
            setParticipants([]);
            setTotalPooledAmount(0);
            setDuration('');
            setStartDate('');
            setEndDate('');
            setWithdrawDay(1);
            setContributionLimits({});
        }
    }, [committee]);

    const handleContributionLimitChange = (userId, limit) => {
        setContributionLimits(prevLimits => ({
            ...prevLimits,
            [userId]: limit
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prepare the participants data as an array of objects
        const formattedParticipants = participants.map(userId => ({
            userId: userId, // User ID
            contributionLimit: contributionLimits[userId] || 1 // Contribution limit, defaulting to 1
        }));

        const committeeData = {
            name,
            description,
            participants: formattedParticipants,
            totalPooledAmount,
            duration,
            startDate,
            endDate,
            withdrawDay
        };

        if (committee) {
            // If a committee is being edited, call the update function
            await onCommitteeUpdated(committee._id, committeeData);
        } else {
            // If it's a new committee, call the add function
            await onCommitteeAdded(committeeData);
        }

        // Clear the form
        setName('');
        setDescription('');
        setParticipants([]);
        setTotalPooledAmount(0);
        setDuration('');
        setStartDate('');
        setEndDate('');
        setWithdrawDay(1);
        setContributionLimits({});
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-center">{committee ? 'Update Committee' : 'Add Committee'}</h2>

            {/* Committee Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Committee Name</label>
                <input
                    type="text"
                    placeholder="Enter committee name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
            </div>

            {/* User Select (Participants) */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Select Participants</label>
                <UserSelect selectedUsers={participants} setSelectedUsers={setParticipants} />
            </div>

            {/* Contribution Limits for Selected Participants */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Contribution Limits</label>
                {participants.map(userId => {
                    const user = users.find(u => u._id === userId); // Find the user by ID
                    return (
                        <div key={userId} className="flex items-center space-x-2">
                            <label htmlFor={`contribution-${userId}`} className="block text-sm font-medium text-gray-700">
                                {user ? user.name : `User  ID: ${userId}`} {/* Display user name or ID if not found */}
                            </label>
                            <input
                                id={`contribution-${userId}`} // Unique ID for accessibility
                                type="number"
                                value={contributionLimits[userId] || 1}
                                onChange={(e) => handleContributionLimitChange(userId, e.target.value)}
                                className="mt-1 block w-20 px-2 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="1"
                                required
                            />
                        </div>
                    );
                })}
            </div>

            {/* Grouped Inputs: Total Amount & Duration */}
            <div className="grid grid-cols-2 gap-4">
                {/* Total Pooled Amount */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Total Pooled Amount</label>
                    <input
                        type="number"
                        placeholder="Enter total pooled amount"
                        value={totalPooledAmount}
                        onChange={(e) => setTotalPooledAmount(e.target.value)}
                        className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                {/* Withdraw Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Withdraw Day</label>
                    <input
                        type="number"
                        value={withdrawDay}
                        onChange={(e) => setWithdrawDay(e.target.value)}
                        className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Grouped Inputs: Start & End Date */}
            <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                {/* End Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 text-center">
                <button
                    type="submit"
                    className="bg-blue-500 text-white py-2 px-6 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {committee ? 'Update Committee' : 'Add Committee'}
                </button>
            </div>
        </form>
    );
};

export default CommitteeForm;
