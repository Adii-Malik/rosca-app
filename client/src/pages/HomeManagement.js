import React, { useEffect, useState, useRef } from 'react';
import { fetchDashboard, fetchDraws, createDraw, deleteDraw } from '../services/api';
import Dashboard from '../components/Dashboard';
import DrawUserWithFireworks from '../components/DrawUserWithFireworks';
import SpinnerOverlay from '../components/SpinnerOverlay';
import io from "socket.io-client";

const HomeManagement = () => {
    const [dashboardData, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [drawRecords, setDrawRecords] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawnUser, setDrawnUser] = useState(null);
    const [eligibleUsers, setEligibleUsers] = useState([]);
    const [spinningStatus, setSpinningStatus] = useState(null);
    const socket = useRef(null);
    const [queuedDrawData, setQueuedDrawData] = useState(null); // Holds `drawCompleted` data temporarily

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

        // Notify server to start draw
        socket.current.emit("startDraw", { committeeId, committeeData, drawRecords });
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

    const handleSpinStatusChange = (status) => {
        setSpinningStatus(status);
        console.log(`Spinning status changed to: ${status}`);
    };

    useEffect(() => {
        // When spinning stops, process any queued drawCompleted data
        if (!spinningStatus && queuedDrawData) {
            console.log("Processing queued draw data after spinning stops:", queuedDrawData);
            setDrawnUser(queuedDrawData); // Display the drawn user
            setIsDrawing(false); // Indicate drawing has finished
            setQueuedDrawData(null); // Clear the queue
            fetchDrawRecords(); // Refresh draw records
        }
    }, [spinningStatus, queuedDrawData]); // React to spinningStatus or queuedDrawData changes


    useEffect(() => {
        fetchData();
        fetchDrawRecords();

        socket.current = io(process.env.REACT_APP_URL || 'https://rosca-app-8wmr3q.fly.dev'); // Replace with your server URL
        socket.current.on("drawStarted", (data) => {
            setEligibleUsers(data.eligibleUsers);
            setIsDrawing(true); // Indicate drawing in progress
            setDrawnUser(null); // Reset drawn user display
        });

        socket.current.on("drawCompleted", (data) => {
            if (spinningStatus || spinningStatus == null) {
                setQueuedDrawData(data); // Queue the data for later processing
            } else {
                setDrawnUser(data); // Display the drawn user
                setIsDrawing(false); // Indicate drawing has finished
                fetchDrawRecords(); // Refresh draw records immediately
                setEligibleUsers([]);
            }
        });

        return () => socket.current.disconnect();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <SpinnerOverlay onSpinStatusChange={handleSpinStatusChange} eligibleUsers={eligibleUsers} isActive={isDrawing} />
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