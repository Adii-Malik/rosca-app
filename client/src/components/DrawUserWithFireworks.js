import React, { useEffect, useRef } from 'react';
import Fireworks from 'fireworks-js';

const DrawUserWithFireworks = ({ drawnUser }) => {
    const fireworksContainerRef = useRef(null);

    useEffect(() => {
        if (drawnUser) {
            console.log(drawnUser);

            // If drawnUser is present, trigger fireworks
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
            <div
                ref={fireworksContainerRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 1000,
                    pointerEvents: 'none'
                }}
            />
        </div>
    );
};

export default DrawUserWithFireworks;
