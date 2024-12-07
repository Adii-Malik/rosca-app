import React from "react";
import "./SpinnerOverlay.css";
import "./WheelOfPrizes.css";
import WheelOfPrizes from "./WheelOfPrizes";

const SpinnerOverlay = ({ isActive, eligibleUsers, onSpinStatusChange }) => {
    return (
        <div className={`spinner-overlay ${isActive ? "active" : ""}`}>
            {/* The wheel component */}
            <div className="overlay-content">
                <WheelOfPrizes eligibleUsers={eligibleUsers} onSpinStatusChange={onSpinStatusChange} isSpinning={isActive} />
            </div>

            {/* Optional message */}
            {isActive && (
                <div className="message">Draw process in progress...</div>
            )}
        </div>
    );
};

export default SpinnerOverlay;
