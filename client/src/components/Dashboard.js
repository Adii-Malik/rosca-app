import React, { useState, useEffect } from "react";

const Dashboard = ({ committees, onDrawUser, drawRecords, onDrawReceordDelete }) => {
    const calculateCountdown = (withdrawDay) => {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, withdrawDay);
        const timeDiff = nextMonth - now;
        if (timeDiff < 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }; // If time has passed

        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        return { days, hours, minutes, seconds };
    };

    const [timers, setTimers] = useState(
        committees.map((committee) => ({
            committeeId: committee._id,
            ...calculateCountdown(committee.withdrawDay),
        }))
    );

    useEffect(() => {
        const timerInterval = setInterval(() => {
            setTimers((prevTimers) =>
                prevTimers.map((timer) => ({
                    ...timer,
                    ...calculateCountdown(
                        committees.find((committee) => committee._id === timer.committeeId)?.withdrawDay
                    ),
                }))
            );
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [committees]);
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
            <div>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Committees Overview</h2>
                {committees.length > 0 ? (
                    committees.map((committee) => {
                        const timer = timers.find((t) => t.committeeId === committee._id);
                        const committeeDrawRecords = drawRecords.filter(
                            (record) => record.committeeId === committee._id
                        );

                        return (
                            <div key={committee._id} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Section */}
                                <div className="bg-white p-6 rounded-lg shadow-md">
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

                                    {/* Timer Widget */}
                                    <div className="bg-gray-100 p-4 rounded-lg mb-4">
                                        <h4 className="text-lg font-medium text-gray-700 mb-2">
                                            Time Until Next Withdrawal
                                        </h4>
                                        {timer ? (
                                            <div className="flex justify-between text-gray-800 font-mono">
                                                <span>{timer.days}d</span>
                                                <span>{timer.hours}h</span>
                                                <span>{timer.minutes}m</span>
                                                <span>{timer.seconds}s</span>
                                            </div>
                                        ) : (
                                            <p>Loading...</p>
                                        )}
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
                                </div>

                                {/* Right Section */}
                                <div className="bg-white p-6 rounded-lg shadow-md">
                                    {/* Contributions */}
                                    <div className="">
                                        <h4 className="font-semibold text-xl text-gray-700 mb-4">Contributions This Month</h4>
                                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {/* Paid Users Card */}
                                            <div className="bg-gradient-to-r from-green-400 to-green-600 p-6 rounded-lg shadow-lg">
                                                <h5 className="font-medium text-white text-lg mb-4 flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Paid Users
                                                </h5>
                                                {committee.contributedUsers.length > 0 ? (
                                                    <ul className="list-disc pl-5 space-y-3 text-white">
                                                        {committee.contributedUsers.map(user => (
                                                            <li key={user._id} className="flex justify-between items-center">
                                                                <span>{user.name}</span>
                                                                <span className="font-semibold">Rs 500</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-white">No contributions yet.</p>
                                                )}
                                            </div>

                                            {/* Pending Users Card */}
                                            <div className="bg-gradient-to-r from-red-400 to-red-600 p-6 rounded-lg shadow-lg">
                                                <h5 className="font-medium text-white text-lg mb-4 flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m7-7H5" />
                                                    </svg>
                                                    Pending Users
                                                </h5>
                                                {committee.nonContributedUsers.length > 0 ? (
                                                    <ul className="list-disc pl-5 space-y-3 text-white">
                                                        {committee.nonContributedUsers.map(user => (
                                                            <li key={user._id} className="flex justify-between items-center">
                                                                <span>{user.name}</span>
                                                                <span className="font-semibold">Rs 500</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-white">All users contributed.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p>No committees in progress.</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
