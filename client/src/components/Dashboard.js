import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from '../context/AuthContext';

const Dashboard = ({ committees, onDrawUser, drawRecords, onDrawReceordDelete, isDrawing }) => {
    const { isAuthenticated } = useContext(AuthContext);

    const calculateCountdown = (withdrawDay) => {
        const now = new Date();
        const currentMonthWithdrawDate = new Date(now.getFullYear(), now.getMonth(), withdrawDay);
        const nextMonthWithdrawDate = new Date(now.getFullYear(), now.getMonth() + 1, withdrawDay);

        let targetDate;
        if (now < currentMonthWithdrawDate) {
            // If the withdrawal date for the current month is still in the future
            targetDate = currentMonthWithdrawDate;
        } else {
            // Otherwise, use the withdrawal date for the next month
            targetDate = nextMonthWithdrawDate;
        }

        const timeDiff = targetDate - now;
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

    function calculateProgress(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();

        // Calculate total duration in days
        const totalDuration = Math.floor((end - start) / (1000 * 60 * 60 * 24)); // Total days

        // Calculate current progress in days
        const currentProgress = Math.floor((now - start) / (1000 * 60 * 60 * 24)); // Days from start to current date

        // Ensure currentProgress does not go below 0
        if (currentProgress < 0) {
            return 0; // Not started
        }

        // Calculate progress percentage
        const progressPercentage = (currentProgress / totalDuration) * 100;

        // Ensure progress does not exceed 100%
        return Math.min(progressPercentage, 100);
    }

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
                <h1 className="text-3xl font-bold text-gray-800">Welcome to Committees Dashboard</h1>
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
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-semibold text-gray-800">{committee.name}</h3>
                                        <span className="text-sm text-gray-600">{new Date(committee.startDate).toLocaleDateString()} - {new Date(committee.endDate).toLocaleDateString()}</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-6">
                                        <div className="bg-gray-200 h-2 rounded-full">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full"
                                                style={{
                                                    width: `${calculateProgress(committee.startDate, committee.endDate)}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Timer Widget */}
                                    <div className="bg-gray-100 p-4 rounded-lg mb-6">
                                        <h4 className="text-lg font-medium text-gray-700 mb-4">
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
                                            <p className="text-gray-600">Loading...</p>
                                        )}
                                    </div>

                                    <div className="text-sm text-gray-700 mb-4">
                                        <div><strong>Total Amount:</strong> Rs {committee.totalPooledAmount}</div>
                                        <div><strong>Remaining Months:</strong> {committee.monthsRemaining}</div>
                                    </div>

                                    {/* Draw User Button */}
                                    {isAuthenticated && (
                                        <button
                                            onClick={() => onDrawUser(committee._id)}
                                            disabled={isDrawing}
                                            className="w-full mt-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                                        >
                                            {isDrawing ? 'Drawing...' : 'Draw User'}
                                        </button>
                                    )}

                                    {/* Drawn Users History */}
                                    <div className="mt-8">
                                        <h4 className="font-semibold text-lg text-gray-800 mb-4">Drawn Users History</h4>
                                        <div className="space-y-4">
                                            {committeeDrawRecords.length > 0 ? (
                                                committeeDrawRecords.map(record => (
                                                    <div key={record._id} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <strong>{record.userId ? record.userId.name : 'Unknown User'}</strong>
                                                                <div className="text-sm text-gray-600">
                                                                    Drawn on {new Date(record.date).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                            <div className="text-gray-800">
                                                                <strong>Rs {committee.totalPooledAmount}</strong>
                                                            </div>
                                                        </div>
                                                        {isAuthenticated && (
                                                            <button
                                                                onClick={() => onDrawReceordDelete(record._id)}
                                                                className="mt-2 text-red-500 hover:text-red-700"
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-600">No users drawn yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Unified Contributions Section */}
                                <div className="bg-white p-6 rounded-lg shadow-md">
                                    {/* Contributions */}
                                    <h4 className="font-semibold text-xl text-gray-700 mb-4">Contributions This Month</h4>
                                    {committee.contributedUsers.length > 0 || committee.nonContributedUsers.length > 0 ? (
                                        <ul className="mt-4 space-y-4">
                                            {committee.contributedUsers.map(user => (
                                                <li key={user._id} className="flex justify-between items-center p-4 rounded-lg shadow-sm bg-green-100">
                                                    <span className="text-green-700 font-medium flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        {user.user.name}
                                                    </span>
                                                    <span className="text-green-700 font-semibold">Paid: Rs {user.contributionAmount}</span>
                                                </li>
                                            ))}
                                            {committee.nonContributedUsers.map(user => (
                                                <li key={user._id} className="flex justify-between items-center p-4 rounded-lg shadow-sm bg-red-100">
                                                    <span className="text-red-700 font-medium flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m7-7H5" />
                                                        </svg>
                                                        {user.user.name}
                                                    </span>
                                                    <span className="text-red-700 font-semibold">Pending: Rs {user.contributionAmount}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-4 text-gray-600">No contributions data available for this month.</p>
                                    )}
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
