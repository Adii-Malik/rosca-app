import React, { useEffect, useRef } from 'react';
import Fireworks from 'fireworks-js';

const DrawUserWithFireworks = ({ drawnUser }) => {
    const fireworksContainerRef = useRef(null);

    useEffect(() => {
        if (drawnUser) {
            if (fireworksContainerRef.current) {
                const fireworks = new Fireworks(fireworksContainerRef.current, {
                    speed: 3,
                    acceleration: 1.2,
                    particles: 50,
                    trace: 3,
                    explosion: 5,
                });

                fireworks.start();
            }
        }
    }, [drawnUser]);

    return (
        <div>
            {/* Fireworks container */}
            <div
                ref={fireworksContainerRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 1000,
                    pointerEvents: 'none',
                }}
            />

            {/* Overlay and Winner Card */}
            {drawnUser && (
                <div className="fixed inset-0 z-[1010] flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-8 rounded-xl shadow-lg text-center w-4/5 max-w-sm">
                        <h2 className="text-3xl font-bold text-green-600 mb-4">
                            🎉 Congratulations! 🎉
                        </h2>
                        <p className="text-2xl text-gray-800">
                            <strong>{drawnUser.winner.user.name}</strong> has been drawn!
                        </p>
                        <p className="text-lg text-gray-600 mt-2">
                            Rs <strong>{drawnUser.committeeData.totalPooledAmount}</strong> won this round!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DrawUserWithFireworks;
