import React from 'react';
import WheelOfPrizes from './WheelOfPrizes';

const SpinnerOverlay = ({ isActive, eligibleUsers, onSpinStatusChange, landOnId, committeeName, caption = 'Drawing now' }) => {
    if (!isActive) return null;

    return (
        <div className="fixed inset-0 z-[1000] bg-ink-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in">
            <p className="text-white/70 text-sm uppercase tracking-widest mb-1">{caption}</p>
            {committeeName && <h2 className="text-white text-2xl font-bold mb-6">{committeeName}</h2>}

            <WheelOfPrizes
                eligibleUsers={eligibleUsers}
                onSpinStatusChange={onSpinStatusChange}
                isSpinning={isActive}
                landOnId={landOnId}
            />

            <p className="mt-8 text-white/80 text-sm">
                {eligibleUsers?.length || 0} member{eligibleUsers?.length === 1 ? '' : 's'} in this draw
            </p>
        </div>
    );
};

export default SpinnerOverlay;
