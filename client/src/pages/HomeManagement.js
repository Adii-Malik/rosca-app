import React, { useEffect, useState } from 'react';
import { fetchDashboard, fetchDraws, createDraw, deleteDraw } from '../services/api';
import Dashboard from '../components/Dashboard';
import DrawUserWithFireworks from '../components/DrawUserWithFireworks';

const HomeManagement = () => {
    const [dashboardData, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [drawRecords, setDrawRecords] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawnUser, setDrawnUser] = useState(null);

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

    // Helper function to check if a user has already drawn and is eligible to draw again
    const isUserEligibleToDraw = (user, committeeId, drawRecords) => {
        // Get how many draws the user has made for this committee
        const userDrawsForCommittee = drawRecords.filter(record =>
            record.userId._id === user.user._id && record.committeeId.toString() === committeeId.toString()
        );

        // Check if the user has reached their contribution limit
        return userDrawsForCommittee.length < user.contributionLimit;
    };


    // Function to randomly select a user, ensuring they haven't already drawn
    const selectRandomEligibleUser = (committeeData, drawRecords, committeeId) => {
        const availableUsers = committeeData.participants.filter(user =>
            isUserEligibleToDraw(user, committeeId, drawRecords)
        );

        if (availableUsers.length === 0) {
            alert('All users have already received their draw amount!');
            return null; // No eligible users remaining
        }

        // Randomly select an eligible user
        const randomIndex = Math.floor(Math.random() * availableUsers.length);
        return availableUsers[randomIndex]; // Return the selected eligible user
    };

    const handleDrawUser = async (committeeId) => {
        setIsDrawing(true);

        // Simulate drawing process (e.g., delay for animation)
        await new Promise(resolve => setTimeout(resolve, 2000));

        const committeeData = dashboardData.committees.find(committee => committee._id === committeeId);
        if (!committeeData) {
            alert('Committee not found!');
            setIsDrawing(false);
            return;
        }

        // Check if there are any contributed users
        if (committeeData.contributedUsers.length === 0) {
            alert('No users have contributed this month!');
            setIsDrawing(false);
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
            setIsDrawing(false);
            return;
        }

        const drawnUser = selectRandomEligibleUser(committeeData, drawRecords, committeeId);
        if (drawnUser) {
            // Create a new draw record
            const newDrawRecord = {
                userId: drawnUser.user._id,
                committeeId: committeeId,
                date: new Date().toISOString(),
            };

            // Call the API to create a new draw record
            await createDraw(newDrawRecord);
            setDrawnUser(drawnUser);

            fetchDrawRecords(); // Refresh draw records after creating a new one
        }
        setIsDrawing(false);
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
        <div>
            <DrawUserWithFireworks drawnUser={drawnUser} />
            <Dashboard
                committees={dashboardData.committees}
                onDrawUser={handleDrawUser}
                drawRecords={drawRecords}
                onDrawReceordDelete={handleDeleteDraw}
                isDrawing={isDrawing}
            />
        </div>
    );
};

export default HomeManagement;