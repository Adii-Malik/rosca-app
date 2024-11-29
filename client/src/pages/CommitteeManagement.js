// src/pages/CommitteeManagement.js
import React, { useEffect, useState } from 'react';
import { fetchCommittees, createCommittee, updateCommittee, deleteCommittee, fetchUsers } from '../services/api';
import CommitteeForm from '../components/CommitteeForm';
import CommitteeList from '../components/CommitteeList';

const CommitteeManagement = () => {
    const [committees, setCommittees] = useState([]);
    const [editingCommittee, setEditingCommittee] = useState(null);
    const [users, setUsers] = useState([]); // State to hold the list of users

    const loadCommittees = async () => {
        const committeeList = await fetchCommittees();
        setCommittees(committeeList);
    };

    const loadUsers = async () => {
        try {
            const userList = await fetchUsers(); // Fetch users from the API
            setUsers(userList); // Set the fetched users to state
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    useEffect(() => {
        loadCommittees();
        loadUsers();
    }, []);

    const handleCommitteeAdded = async (committeeData) => {
        const newCommittee = await createCommittee(committeeData);
        setCommittees((prevCommittees) => [...prevCommittees, newCommittee]);
    };

    const handleCommitteeUpdated = async (committeeId, updatedData) => {
        const updatedCommittee = await updateCommittee(committeeId, updatedData);
        setCommittees((prevCommittees) => prevCommittees.map(committee => (committee._id === committeeId ? updatedCommittee : committee)));
        setEditingCommittee(null); // Clear editing committee after update
    };

    const handleCommitteeDeleted = async (committeeId) => {
        await deleteCommittee(committeeId);
        setCommittees((prevCommittees) => prevCommittees.filter(committee => committee._id !== committeeId));
    };

    const handleEditCommittee = (committee) => {
        setEditingCommittee(committee); // Set the committee to be edited
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Committee Management</h1>
            <CommitteeForm onCommitteeAdded={handleCommitteeAdded} onCommitteeUpdated={handleCommitteeUpdated} committee={editingCommittee} users={users} />
            <CommitteeList committees={committees} onCommitteeUpdated={handleEditCommittee} onCommitteeDeleted={handleCommitteeDeleted} users={users} />
        </div>
    );
};

export default CommitteeManagement;