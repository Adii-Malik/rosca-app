import React, { useState, useEffect } from 'react';
import { fetchUsers, fetchCommittees } from '../services/api';

const ContributionForm = ({ onContributionAdded, editingContribution }) => {
    const [amount, setAmount] = useState('');
    const [userId, setUserId] = useState('');
    const [committeeId, setCommitteeId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Set default to today's date
    const [users, setUsers] = useState([]);
    const [committees, setCommittees] = useState([]);
    const [selectedCommittee, setSelectedCommittee] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadUsersAndCommittees = async () => {
            try {
                const userList = await fetchUsers();
                const committeeList = await fetchCommittees();
                setUsers(userList);
                setCommittees(committeeList);
            } catch (error) {
                console.error("Error loading users or committees:", error);
            }
        };
        loadUsersAndCommittees();
    }, []);

    useEffect(() => {
        if (editingContribution) {
            setAmount(editingContribution.amount || '');
            setUserId(editingContribution.userId?._id || '');
            setCommitteeId(editingContribution.committeeId?._id || '');
            setDate(editingContribution.date
                ? new Date(editingContribution.date).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0] // Keep today's date if no date is provided
            );
            const committee = committees.find(c => c._id === editingContribution.committeeId?._id);
            setSelectedCommittee(committee);
        } else {
            setAmount('');
            setUserId('');
            setCommitteeId('');
            setDate(new Date().toISOString().split('T')[0]); // Reset to today's date if not editing
            setSelectedCommittee(null);
        }
    }, [editingContribution, committees]);

    const handleCommitteeChange = (e) => {
        const selectedCommitteeId = e.target.value;
        const selectedCommittee = committees.find(committee => committee._id === selectedCommitteeId);
        setSelectedCommittee(selectedCommittee);
        setCommitteeId(selectedCommitteeId);
        setAmount(''); // Reset amount when committee changes

        if (selectedCommittee) {
            // Calculate the contribution amount based on the selected committee
            calculateAmountForUser(userId, selectedCommittee);
        }
    };

    const handleUserChange = (e) => {
        const selectedUserId = e.target.value;
        setUserId(selectedUserId);

        if (selectedCommittee) {
            // Recalculate amount based on the new user selection
            calculateAmountForUser(selectedUserId, selectedCommittee);
        }
    };

    const calculateAmountForUser = (selectedUserId, committee) => {
        if (!committee || !selectedUserId) {
            setAmount('');
            return;
        }

        // Check if the selected user is part of the committee
        const currentUser = committee.participants.find(participant => participant.user === selectedUserId);
        if (!currentUser) {
            setError('Selected user is not registered in this committee.');
            setAmount('');
            return;
        } else {
            setError(''); // Clear error if user is part of the committee
        }

        // Calculate total contribution limit from all participants
        const totalContributionLimit = committee.participants.reduce((total, participant) => {
            return total + (participant.contributionLimit || 1);
        }, 0);

        // Calculate the user's contribution limit
        const userContributionLimit = currentUser.contributionLimit || 1; // Default to 1 if not found

        // Calculate the amount based on the user's contribution limit
        const calculatedAmount = totalContributionLimit > 0 ? (committee.totalPooledAmount * userContributionLimit) / totalContributionLimit : 0;
        setAmount(calculatedAmount); // Set the calculated amount
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (error) {
            console.error("Cannot submit: ", error);
            return; // Prevent submission if there's an error
        }

        try {
            const contributionData = { amount, userId, committeeId, date };
            await onContributionAdded(contributionData);

            // Reset form after successful submission
            setAmount('');
            setUserId('');
            setCommitteeId('');
            setDate(new Date().toISOString().split('T')[0]);
            setSelectedCommittee(null);
            setError(''); // Clear any errors
        } catch (err) {
            // Check for specific error messages from the backend
            if (err.response && err.response.status === 400) {
                setError(err.response.data.message || "An error occurred while adding the contribution.");
            } else {
                console.error("Error submitting contribution:", err);
                setError("An unexpected error occurred. Please try again later.");
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-container">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-5">
                    {error}
                </div>
            )}            <div className="form-group">
                <label>Amount</label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="Enter amount"
                    disabled={!!selectedCommittee} // Disable the amount field if a committee is selected
                />
            </div>
            <div className="form-group">
                <label>User</label>
                <select value={userId} onChange={handleUserChange} required>
                    <option value="">Select User</option>
                    {users.map((user) => (
                        <option key={user._id} value={user._id}>
                            {user.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label>Committee</label>
                <select value={committeeId} onChange={handleCommitteeChange} required>
                    <option value="">Select Committee</option>
                    {committees.map((committee) => (
                        <option key={committee._id} value={committee._id}>
                            {committee.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label>Date</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                />
            </div>
            <button type="submit" className="btn-primary">
                {editingContribution ? 'Update Contribution' : 'Add Contribution'}
            </button>
        </form>
    );
};

export default ContributionForm;