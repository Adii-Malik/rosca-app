import React, { useEffect, useState } from 'react';
import { fetchDashboard, fetchDraws, createDraw, deleteDraw } from '../services/api';
import Dashboard from '../components/Dashboard';
import './HomeManagement.css';

const HomeManagement = () => {
    const [dashboardData, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [drawRecords, setDrawRecords] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchData = async () => {
        try {
            const response = await fetchDashboard();
            setData(response);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDrawRecords = async () => {
        try {
            const response = await fetchDraws();
            setDrawRecords(response);
        } catch (error) {
            console.error('Error fetching draw records:', error);
        }
    };

    const handleDrawUser = async (committeeId) => {
        const committeeData = dashboardData.committees.find(committee => committee._id === committeeId);
        if (!committeeData) {
            alert('Committee not found!');
            return;
        }

        // Check if there are any contributed users
        if (committeeData.contributedUsers.length === 0) {
            alert('No users have contributed this month!');
            return;
        }

        // Get already drawn users for the selected committee
        const alreadyDrawnUsers = drawRecords.filter(record => record.committeeId === committeeId);

        // Get available users who have contributed but haven't been drawn yet
        const availableUsers = committeeData.contributedUsers.filter(user =>
            !alreadyDrawnUsers.some(record => record.userId === user._id)
        );

        // Check if there are available users to draw
        if (availableUsers.length === 0) {
            alert('All users have already been drawn for this committee!');
            return;
        }

        // Randomly select a user from available users
        const randomIndex = Math.floor(Math.random() * availableUsers.length);
        const drawnUser = availableUsers[randomIndex];

        // Check how many draws the drawn user has made in total for this committee
        const userDrawsForCommittee = drawRecords.filter(record =>
            record.userId._id === drawnUser._id && record.committeeId === committeeId
        );

        // Check if the user has reached their contribution limit
        const participant = committeeData.participants.find(p => p._id === drawnUser._id);
        if (participant && userDrawsForCommittee.length >= participant.contributionLimit) {
            alert(`User  ${drawnUser.name} has reached their draw limit for this committee!`);
            return;
        }

        // Check if the user has already drawn this month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const drawsThisMonth = drawRecords.filter(record =>
            record.committeeId === committeeId &&
            new Date(record.date).getMonth() === currentMonth &&
            new Date(record.date).getFullYear() === currentYear
        );

        // Check if the user has already drawn this month
        if (drawsThisMonth.length > 0) {
            alert('A draw has already been made for this committee this month!');
            return;
        }

        // Create a new draw record
        const newDrawRecord = {
            userId: drawnUser._id,
            committeeId: committeeId,
            date: new Date().toISOString(),
        };

        // Call the API to create a new draw record
        await createDraw(newDrawRecord);
        fetchDrawRecords(); // Refresh draw records after creating a new one
    };

    const handleDeleteDraw = async (drawId) => {
        try {
            await deleteDraw(drawId);
            // Update the local state to remove the deleted draw record
            setDrawRecords(drawRecords.filter(record => record._id !== drawId));
        } catch (error) {
            console.error('Error deleting draw record:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchDrawRecords();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Dashboard
            committees={dashboardData.committees}
            onDrawUser={handleDrawUser}
            drawRecords={drawRecords}
            onDrawReceordDelete={handleDeleteDraw}
        />
    );
};

export default HomeManagement;