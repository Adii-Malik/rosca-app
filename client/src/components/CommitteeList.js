import React from 'react';

const CommitteeList = ({ committees, onCommitteeUpdated, onCommitteeDeleted, users }) => {
    if (!Array.isArray(committees)) {
        return <div>No committees available</div>;
    }

    return (
        <div className="mt-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Committee List</h2>
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border px-6 py-3 text-left text-sm font-medium text-gray-600">Name</th>
                        <th className="border px-6 py-3 text-left text-sm font-medium text-gray-600">Participants</th>
                        <th className="border px-6 py-3 text-left text-sm font-medium text-gray-600">Total Pooled Amount</th>
                        <th className="border px-6 py-3 text-left text-sm font-medium text-gray-600">Duration (months)</th>
                        <th className="border px-6 py-3 text-left text-sm font-medium text-gray-600">Start Date</th>
                        <th className="border px-6 py-3 text-left text-sm font-medium text-gray-600">End Date</th>
                        <th className="border px-6 py-3 text-left text-sm font-medium text-gray-600">Withdraw Date</th>
                        <th className="border px-6 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {committees.map((committee) => (
                        <tr key={committee._id} className="hover:bg-gray-50">
                            <td className="border px-6 py-4 text-sm text-gray-700">{committee.name}</td>
                            <td className="border px-6 py-4 text-sm text-gray-700">
                                {/* Check if participants are populated */}
                                {committee.participants.map((participant) => {
                                    const user = users.find(u => u._id === participant.user); // Find the user by ID
                                    return user ? `${user.name} (Limit: ${participant.contributionLimit})` : `User  ID: ${participant.user}`;
                                }).join(', ')}
                            </td>
                            <td className="border px-6 py-4 text-sm text-gray-700">Rs {committee.totalPooledAmount}</td>
                            <td className="border px-6 py-4 text-sm text-gray-700">{committee.duration} months</td>
                            <td className="border px-6 py-4 text-sm text-gray-700">{new Date(committee.startDate).toLocaleDateString()}</td>
                            <td className="border px-6 py-4 text-sm text-gray-700">{new Date(committee.endDate).toLocaleDateString()}</td>
                            <td className="border px-6 py-4 text-sm text-gray-700">{committee.withdrawDay}</td>
                            <td className="border px-6 py-4 text-sm text-gray-700">
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => onCommitteeUpdated(committee)}
                                        className="text-blue-600 hover:bg-blue-50 hover:text-blue-800 font-semibold py-1 px-3 rounded-md transition-all duration-200"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => onCommitteeDeleted(committee._id)}
                                        className="text-red-600 hover:bg-red-50 hover:text-red-800 font-semibold py-1 px-3 rounded-md transition-all duration-200"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CommitteeList;