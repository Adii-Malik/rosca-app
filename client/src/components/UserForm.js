// src/components/UserForm.js
import React, { useState, useEffect } from 'react';
import { createUser, updateUser } from '../services/api';

const UserForm = ({ onUserAdded, onUserUpdated, user }) => {
    const [name, setName] = useState('');

    // Populate form fields if a user is being edited
    useEffect(() => {
        if (user) {
            setName(user.name);
        } else {
            setName('');
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const userData = { name };

        if (user) {
            // If a user is being edited, call the update function
            await onUserUpdated(user._id, userData);
        } else {
            // If it's a new user, call the add function
            await onUserAdded(userData);
        }

        // Clear the form
        setName('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border p-2 w-full rounded"
                required
            />
            <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
                {user ? 'Update User' : 'Add User'}
            </button>
        </form>
    );
};

export default UserForm;