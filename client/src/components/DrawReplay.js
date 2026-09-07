import React, { useEffect, useState } from 'react';
import SpinnerOverlay from './SpinnerOverlay';
import DrawUserWithFireworks from './DrawUserWithFireworks';

// Long enough to read as a spin before the wheel is told where to land.
const SPIN_BEFORE_REVEAL_MS = 2500;

/**
 * Replays a past draw using the eligible members recorded at the time, so the
 * same wheel drives both the live draw and the replay. Previously the broadcast
 * was the only chance to see a draw; missing it meant missing it for good.
 */
const DrawReplay = ({ replay, onClose }) => {
    const [spinning, setSpinning] = useState(false);
    const [landOnId, setLandOnId] = useState(null);
    const [wheelSpinning, setWheelSpinning] = useState(false);
    const [revealed, setRevealed] = useState(null);

    useEffect(() => {
        if (!replay) {
            setSpinning(false);
            setLandOnId(null);
            setRevealed(null);
            return undefined;
        }

        setRevealed(null);
        setLandOnId(null);
        setSpinning(true);

        const timer = setTimeout(() => setLandOnId(replay.winner?.user?._id), SPIN_BEFORE_REVEAL_MS);
        return () => clearTimeout(timer);
    }, [replay]);

    // Reveal once the wheel has settled, matching the live flow.
    useEffect(() => {
        if (!spinning || !landOnId || wheelSpinning) return;
        setSpinning(false);
        setRevealed(replay);
    }, [spinning, landOnId, wheelSpinning, replay]);

    if (!replay) return null;

    const handleClose = () => {
        setRevealed(null);
        setSpinning(false);
        onClose?.();
    };

    return (
        <>
            <SpinnerOverlay
                isActive={spinning}
                eligibleUsers={replay.eligibleUsers}
                onSpinStatusChange={setWheelSpinning}
                landOnId={landOnId}
                committeeName={replay.committeeData?.name}
                caption="Replay"
            />
            <DrawUserWithFireworks
                drawnUser={revealed}
                onClose={handleClose}
                title={replay.roundNumber ? `Round ${replay.roundNumber} winner` : 'Winner'}
            />
        </>
    );
};

export default DrawReplay;
