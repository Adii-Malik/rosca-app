import React from 'react';

const Dashboard = ({ committees, onDrawUser, drawRecords, onDrawReceordDelete }) => {
    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            {/* Header Section */}
            <header className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Welcome to ROSCA Dashboard</h1>
                <div className="flex justify-center gap-8 mt-4">
                    <div className="bg-blue-500 text-white p-4 rounded-lg text-center">
                        <strong>{committees.length}</strong>
                        <div>Committees</div>
                    </div>
                    <div className="bg-blue-500 text-white p-4 rounded-lg text-center">
                        <strong>Rs {committees.reduce((acc, c) => acc + c.totalPooledAmount, 0)}</strong>
                        <div>Total Amount</div>
                    </div>
                </div>
            </header>

            {/* Committees Overview */}
            <div className="widget-container">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Committees Overview</h2>
                {committees.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                        {committees.map((committee) => {
                            const committeeDrawRecords = drawRecords.filter(record => record.committeeId === committee._id);
                            return (
                                <div key={committee._id} className="bg-white p-6 rounded-lg shadow-md">
                                    {/* Committee Details */}
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-semibold">{committee.name}</h3>
                                        <span className="text-sm text-gray-600">{new Date(committee.startDate).toLocaleDateString()} - {new Date(committee.endDate).toLocaleDateString()}</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                        <div className="bg-gray-200 h-2 rounded-full">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full"
                                                style={{
                                                    width: `${((committee.totalMonths - committee.monthsRemaining) / committee.totalMonths) * 100}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="text-sm text-gray-700">
                                        <div><strong>Total Amount:</strong> Rs {committee.totalPooledAmount}</div>
                                        <div><strong>Remaining Months:</strong> {committee.monthsRemaining}</div>
                                    </div>

                                    {/* Draw User Button */}
                                    <button
                                        onClick={() => onDrawUser(committee._id)}
                                        className="w-full mt-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                                    >
                                        Draw User
                                    </button>

                                    {/* Drawn Users History */}
                                    <div className="mt-6">
                                        <h4 className="font-semibold text-lg">Drawn Users History</h4>
                                        <ul className="mt-2">
                                            {committeeDrawRecords.length > 0 ? (
                                                committeeDrawRecords.map(record => (
                                                    <li key={record._id} className="flex justify-between items-center py-2">
                                                        <span>
                                                            <strong>{record.userId.name}</strong> was drawn on {new Date(record.date).toLocaleDateString()}
                                                        </span>
                                                        <button
                                                            onClick={() => onDrawReceordDelete(record._id)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            Delete
                                                        </button>
                                                    </li>
                                                ))
                                            ) : (
                                                <p>No users drawn yet.</p>
                                            )}
                                        </ul>
                                    </div>

                                    {/* Contributions */}
                                    <div className="mt-6">
                                        <h4 className="font-semibold text-lg">Contributions This Month</h4>
                                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Paid Users Card */}
                                            <div className="bg-green-100 p-4 rounded-lg shadow-md">
                                                <h5 className="font-medium text-green-800">Paid Users</h5>
                                                {committee.contributedUsers.length > 0 ? (
                                                    <ul className="list-disc pl-5">
                                                        {committee.contributedUsers.map(user => (
                                                            <li key={user._id} className="flex justify-between items-center">
                                                                <span>{user.name}</span>
                                                                <span className="text-green-600">Rs 500</span> {/* Dummy amount */}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p>No contributions yet.</p>
                                                )}
                                            </div>

                                            {/* Pending Users Card */}
                                            <div className="bg-red-100 p-4 rounded-lg shadow-md">
                                                <h5 className="font-medium text-red-800">Pending Users</h5>
                                                {committee.nonContributedUsers.length > 0 ? (
                                                    <ul className="list-disc pl-5">
                                                        {committee.nonContributedUsers.map(user => (
                                                            <li key={user._id} className="flex justify-between items-center">
                                                                <span>{user.name}</span>
                                                                <span className="text-red-600">Rs 500</span> {/* Dummy amount */}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p>All users contributed.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p>No committees in progress.</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
