import React from 'react';
import './SpinnerOverlay.css';

const SpinnerOverlay = ({ isActive }) => {
    return (
        <div className={`spinner-overlay ${isActive ? 'active' : ''}`}>
            <div className="spinner"></div>
            {isActive && <div className="message">Draw process in progress...</div>}
        </div>
    );
};

export default SpinnerOverlay;
