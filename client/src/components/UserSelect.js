// src/components/UserSelect.js
import React, { useEffect, useState } from 'react';
import { fetchUsers } from '../services/api'; // Assume this service fetches users

const UserSelect = ({ selectedUsers, setSelectedUsers }) => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadUsers = async () => {
            const userList = await fetchUsers();
            setUsers(userList);
        };
        loadUsers();
    }, []);

    const handleSelectUser = (userId) => {
        if (!selectedUsers.includes(userId)) {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    const handleRemoveUser = (userId) => {
        setSelectedUsers(selectedUsers.filter(id => id !== userId));
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="border p-2 rounded">
            <input
                type="text"
                placeholder="Search Users"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border p-2 w-full rounded mb-2"
            />
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded">
                {filteredUsers.map(user => (
                    <div key={user._id} className="flex justify-between items-center p-2 hover:bg-gray-100">
                        <span>{user.name}</span>
                        <button
                            type="button" // Prevents the form from submitting
                            onClick={() => handleSelectUser(user._id)}
                            className="text-blue-500"
                        >
                            Select
                        </button>
                    </div>
                ))}
            </div>
            <div className="mt-2">
                <h4>Selected Users:</h4>
                <ul>
                    {selectedUsers.map(userId => {
                        const user = users.find(u => u._id === userId);
                        return (
                            <li key={userId} className="flex justify-between items-center">
                                <span>{user ? user.name : 'Unknown User'}</span>
                                <button
                                    type="button" // Prevents the form from submitting
                                    onClick={() => handleRemoveUser(userId)}
                                    className="text-red-500"
                                >
                                    Remove
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export default UserSelect;
