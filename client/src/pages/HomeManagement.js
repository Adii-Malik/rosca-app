import React, { useCallback, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { fetchDashboard, fetchDraws, deleteDraw, awardRound, errorMessage } from '../services/api';
import Dashboard from '../components/Dashboard';
import DrawUserWithFireworks from '../components/DrawUserWithFireworks';
import SpinnerOverlay from '../components/SpinnerOverlay';
import AwardRoundDialog from '../components/AwardRoundDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { PageLoader } from '../components/ui/Primitives';

// The socket connects to the server root, not the /api base path.
const SOCKET_URL =
    process.env.REACT_APP_SOCKET_URL ||
    (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '') ||
    undefined;

const HomeManagement = () => {
    const [dashboardData, setDashboardData] = useState({ committees: [] });
    const [drawRecords, setDrawRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [isDrawing, setIsDrawing] = useState(false);
    const [eligibleUsers, setEligibleUsers] = useState([]);
    const [drawnUser, setDrawnUser] = useState(null);
    const [wheelSpinning, setWheelSpinning] = useState(false);
    const [pendingResult, setPendingResult] = useState(null);
    const [activeCommitteeName, setActiveCommitteeName] = useState('');
    const [awarding, setAwarding] = useState(null);

    const socketRef = useRef(null);
    const { token, isAuthenticated } = useAuth();
    const toast = useToast();

    const loadDashboard = useCallback(async () => {
        try {
            const [dashboard, draws] = await Promise.all([fetchDashboard(), fetchDraws()]);
            setDashboardData(dashboard);
            setDrawRecords(draws);
            setLoadError('');
        } catch (error) {
            setLoadError(errorMessage(error, 'Could not load the dashboard.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    // Reconnect whenever the session changes so the handshake carries a current
    // token — the server refuses to start a draw without one.
    useEffect(() => {
        const socket = io(SOCKET_URL, { auth: token ? { token } : {} });
        socketRef.current = socket;

        socket.on('drawStarted', (data) => {
            setActiveCommitteeName(data.committeeData?.name || '');
            setEligibleUsers(data.eligibleUsers || []);
            setIsDrawing(true);
            setDrawnUser(null);
            setPendingResult(null);
            // A scheduled draw can begin with nobody watching, so say what is
            // happening rather than just throwing up a wheel.
            if (data.joinedLate) {
                toast.info(`A draw for ${data.committeeData?.name || 'a committee'} is already under way.`);
            } else if (data.trigger === 'scheduled') {
                toast.info(`The scheduled draw for ${data.committeeData?.name || 'a committee'} has started.`);
            }
        });

        // Held until the wheel finishes its spin, so the winner is not revealed
        // before the animation lands on them.
        socket.on('drawCompleted', (data) => setPendingResult(data));

        socket.on('drawError', (data) => {
            setIsDrawing(false);
            setEligibleUsers([]);
            toast.error(data?.message || 'The draw could not be completed.');
        });

        socket.on('roundAwarded', (data) => {
            toast.info(`${data.winnerName} was awarded this month's ${data.committeeName} round.`);
            loadDashboard();
        });

        socket.on('connect_error', () => toast.error('Lost connection to the draw service.'));

        return () => {
            socket.removeAllListeners();
            socket.disconnect();
        };
    }, [token, toast, loadDashboard]);

    // Reveal the winner once the wheel has stopped.
    useEffect(() => {
        if (!pendingResult || wheelSpinning) return;
        setDrawnUser(pendingResult);
        setPendingResult(null);
        setIsDrawing(false);
        setEligibleUsers([]);
        loadDashboard();
    }, [pendingResult, wheelSpinning, loadDashboard]);

    const handleDrawUser = (committeeId) => {
        if (!isAuthenticated) {
            toast.error('Sign in to start a draw.');
            return;
        }
        setIsDrawing(true);
        // Only the id is sent. Eligibility and the winner are decided server-side.
        socketRef.current?.emit('startDraw', { committeeId });
    };

    const handleAwardRound = async (userId) => {
        try {
            await awardRound(awarding._id, userId);
            toast.success('Round awarded.');
            setAwarding(null);
            loadDashboard();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not award that round.'));
        }
    };

    const handleDeleteDraw = async (drawId) => {
        try {
            await deleteDraw(drawId);
            setDrawRecords((records) => records.filter((record) => record._id !== drawId));
            toast.success('Draw record removed.');
            loadDashboard();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not delete that draw record.'));
        }
    };

    if (loading) return <PageLoader label="Loading dashboard…" />;

    if (loadError) {
        return (
            <div className="card p-8 text-center">
                <p className="text-sm text-red-600">{loadError}</p>
                <button className="btn-secondary mt-4" onClick={loadDashboard}>Try again</button>
            </div>
        );
    }

    return (
        <>
            <SpinnerOverlay
                isActive={isDrawing}
                eligibleUsers={eligibleUsers}
                onSpinStatusChange={setWheelSpinning}
                landOnId={pendingResult?.winner?.user?._id}
                committeeName={activeCommitteeName}
            />
            <DrawUserWithFireworks drawnUser={drawnUser} onClose={() => setDrawnUser(null)} />
            <AwardRoundDialog
                open={Boolean(awarding)}
                committee={awarding}
                drawRecords={drawRecords}
                onConfirm={handleAwardRound}
                onCancel={() => setAwarding(null)}
            />
            <Dashboard
                committees={dashboardData.committees || []}
                drawRecords={drawRecords}
                onDrawUser={handleDrawUser}
                onAwardRound={setAwarding}
                onDrawRecordDelete={handleDeleteDraw}
                isDrawing={isDrawing}
            />
        </>
    );
};

export default HomeManagement;
