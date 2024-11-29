import React, { useEffect, useState } from 'react';
import { fetchContributions, createContribution, updateContribution, deleteContribution, fetchUser, fetchCommittee } from '../services/api';
import ContributionForm from '../components/ContributionForm';
import ContributionList from '../components/ContributionList';

const ContributionManagement = () => {
    const [contributions, setContributions] = useState([]);
    const [editingContribution, setEditingContribution] = useState(null);

    const loadContributions = async () => {
        try {
            const contributionList = await fetchContributions();
            setContributions(contributionList);
        } catch (error) {
            console.error("Error fetching contributions:", error);
        }
    };

    useEffect(() => {
        loadContributions();
    }, []);

    const handleContributionAdded = async (contributionData) => {
        if (editingContribution) {
            // If editing, update the existing contribution
            const updatedContribution = await updateContribution({
                ...contributionData, _id: editingContribution._id
            });

            // Update the contributions list with the updated contribution
            setContributions((prevContributions) =>
                prevContributions.map((contribution) =>
                    contribution._id === updatedContribution._id ? updatedContribution : contribution
                )
            );
            setEditingContribution(null); // Reset editing state after update
        } else {
            // If adding new, create a new contribution
            const newContribution = await createContribution(contributionData);

            // Fetch the user and committee details based on IDs
            const user = await fetchUser(newContribution.userId); // Fetch user details
            const committee = await fetchCommittee(newContribution.committeeId); // Fetch committee details

            // Update the new contribution with full user and committee details
            const fullContribution = {
                ...newContribution,
                userId: user, // Replace with full user object
                committeeId: committee // Replace with full committee object
            };

            // Update contributions state with the full contribution
            setContributions((prevContributions) => [...prevContributions, fullContribution]);
        }
    };

    const handleEdit = (contribution) => {
        setEditingContribution(contribution);
    };

    const handleDelete = async (id) => {
        try {
            await deleteContribution(id);
            setContributions((prevContributions) => prevContributions.filter((contribution) => contribution._id !== id));
        } catch (error) {
            console.error("Error deleting contribution:", error);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Contribution Management</h1>
            <ContributionForm
                onContributionAdded={handleContributionAdded}
                editingContribution={editingContribution}
            />
            <ContributionList
                contributions={contributions}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />
        </div>
    );
};

export default ContributionManagement;
