import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL); // Replace with your server URL in production

const LiveDraw = () => {
    const [drawData, setDrawData] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        // Listen for draw events
        socket.on('drawStarted', (data) => {
            console.log('Draw started:', data);
            setDrawData(data);
            setIsDrawing(true);
        });

        socket.on('drawCompleted', (data) => {
            console.log('Draw completed:', data);
            setIsDrawing(false);
        });

        return () => {
            // Clean up listeners on unmount
            socket.off('drawStarted');
            socket.off('drawCompleted');
        };
    }, []);

    return (
        <div>
            {isDrawing ? (
                <div>
                    <h2>Draw in Progress...</h2>
                    <p>Committee: {drawData?.committeeId}</p>
                    <p>Selected User: {drawData?.user?.name}</p>
                </div>
            ) : (
                <h2>No active draw</h2>
            )}
        </div>
    );
};

export default LiveDraw;
