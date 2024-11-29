// src/pages/UserManagement.js
import React, { useEffect, useState } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser } from '../services/api';
import UserForm from '../components/UserForm';
import UserList from '../components/UserList';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);

    const loadUsers = async () => {
        const userList = await fetchUsers();
        setUsers(userList);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleUserAdded = async (userData) => {
        const newUser = await createUser(userData);
        setUsers((prevUsers) => [...prevUsers, newUser]);
    };

    const handleUserUpdated = async (userId, updatedData) => {
        const updatedUser = await updateUser(userId, updatedData);
        setUsers((prevUsers) => prevUsers.map(user => (user._id === userId ? updatedUser : user)));
        setEditingUser(null); // Clear editing user after update
    };

    const handleUserDeleted = async (userId) => {
        await deleteUser(userId);
        setUsers((prevUsers) => prevUsers.filter(user => user._id !== userId));
    };

    const handleEditUser = (user) => {
        setEditingUser(user); // Set the user to be edited
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">User  Management</h1>
            <UserForm onUserAdded={handleUserAdded} onUserUpdated={handleUserUpdated} user={editingUser} />
            <UserList users={users} onUserUpdated={handleEditUser} onUserDeleted={handleUserDeleted} />
        </div>
    );
};

export default UserManagement;