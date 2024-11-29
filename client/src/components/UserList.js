// src/components/UserList.js
import React from 'react';

const UserList = ({ users, onUserUpdated, onUserDeleted }) => {
    if (!Array.isArray(users)) {
        return <div>No users available</div>;
    }

    return (
        <div className="mt-4">
            <h2 className="text-xl font-semibold">User  List</h2>
            <table className="min-w-full bg-white border border-gray-300 mt-2">
                <thead>
                    <tr>
                        <th className="border px-4 py-2">Name</th>
                        <th className="border px-4 py-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user._id}>
                            <td className="border px-4 py-2">{user.name}</td>
                            <td className="border px-4 py-2">
                                <button onClick={() => onUserUpdated(user)} className="bg-yellow-500 text-white p-1 rounded hover:bg-yellow-600">Edit</button>
                                <button onClick={() => onUserDeleted(user._id)} className="bg-red-500 text-white p-1 rounded hover:bg-red-600 ml-2">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserList;