import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, formatMonth, initials, avatarTint } from '../utils/format';
import { Avatar, ConfirmDialog, EmptyState, Spinner, StatTile } from './ui/Primitives';

const pad = (n) => String(n).padStart(2, '0');

const timeUntil = (target) => {
    const diff = Math.max(new Date(target) - Date.now(), 0);
    return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
    };
};

const ordinal = (n) => {
    const d = Number(n);
    if (d % 10 === 1 && d !== 11) return 'st';
    if (d % 10 === 2 && d !== 12) return 'nd';
    if (d % 10 === 3 && d !== 13) return 'rd';
    return 'th';
};

/** e.g. "5th at 15:00" — the committee's own configured schedule. */
const scheduleLabel = (committee) =>
    `${committee.withdrawDay}${ordinal(committee.withdrawDay)} at ` +
    `${pad(committee.withdrawHour ?? 15)}:${pad(committee.withdrawMinute ?? 0)}`;

/** Which round of the term this month is, and how many are left. */
const termPosition = (committee) => {
    const total = committee.duration || 0;
    if (!total) return null;

    if (!committee.hasStarted) return { current: 0, total, remaining: total };

    const start = new Date(committee.startDate);
    const now = new Date();
    const elapsed =
        (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const current = Math.min(Math.max(elapsed + 1, 1), total);
    return { current, total, remaining: Math.max(total - current, 0) };
};

/** Short month label from a period key like "2025-11", for the winners rail. */
const monthShort = (periodKey, fallbackDate) => {
    if (periodKey) {
        const [year, month] = periodKey.split('-').map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
            month: 'short',
            year: '2-digit',
        });
    }
    return new Date(fallbackDate).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
};

const Countdown = ({ nextDrawAt }) => {
    const [time, setTime] = useState(() => timeUntil(nextDrawAt));

    useEffect(() => {
        setTime(timeUntil(nextDrawAt));
        const id = setInterval(() => setTime(timeUntil(nextDrawAt)), 1000);
        return () => clearInterval(id);
    }, [nextDrawAt]);

    return (
        <span className="font-mono tabular-nums">
            {time.days}d {pad(time.hours)}h {pad(time.minutes)}m {pad(time.seconds)}s
        </span>
    );
};

/**
 * The term as one block per round: filled where a round has been played, ringed
 * on the current one.
 *
 * Deliberately discrete where the contributions bar below is continuous — two
 * identical-looking bars meaning different things (term elapsed vs money
 * collected) read as a confusing pair.
 */
const TermSegments = ({ committee }) => {
    const term = termPosition(committee);
    if (!term) return null;

    const played = committee.roundsPlayed || 0;

    return (
        <div className="mt-3">
            <div className="flex gap-[3px]" role="img" aria-label={`Round ${term.current} of ${term.total}`}>
                {Array.from({ length: term.total }, (_, i) => {
                    const index = i + 1;
                    const done = index <= played;
                    const now = index === term.current && !done;
                    return (
                        <span
                            key={index}
                            className={`flex-1 h-[7px] rounded-[3px] ${
                                done
                                    ? 'bg-brand-700'
                                    : now
                                        ? 'bg-brand-500 ring-2 ring-brand-100'
                                        : 'bg-ink-200'
                            }`}
                        />
                    );
                })}
            </div>
            <div className="flex items-center justify-between gap-2 mt-1.5">
                <span className="text-[11px] text-ink-500">
                    {term.current === 0
                        ? `Starts ${formatMonth(committee.startDate)}`
                        : `Round ${term.current} of ${term.total}`}
                </span>
                <span className="text-[11px] text-ink-500">
                    {term.remaining === 0
                        ? 'final round'
                        : `${term.remaining} month${term.remaining === 1 ? '' : 's'} remaining`}
                </span>
            </div>
        </div>
    );
};

const ParticipantRow = ({ participant }) => {
    const name = participant.user?.name || 'Unknown member';
    const { outstandingAmount = 0, contributionAmount = 0, isSettled, hasPaidPartially } = participant;

    const status = isSettled
        ? { label: 'Paid', text: 'text-emerald-700', dot: 'bg-emerald-500' }
        : hasPaidPartially
            ? { label: 'Part paid', text: 'text-amber-700', dot: 'bg-amber-500' }
            : { label: 'Not paid', text: 'text-ink-500', dot: 'bg-ink-300' };

    return (
        <li className="flex items-center justify-between gap-2.5 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={initials(name)} tint={avatarTint(name)} size="w-8 h-8 text-[11px]" />
                <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate leading-tight">{name}</p>
                    <p className="text-xs text-ink-500 flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                        <span className={status.text}>{status.label}</span>
                        {participant.contributionLimit > 1 && (
                            <span className="text-ink-400">· {participant.contributionLimit} shares</span>
                        )}
                    </p>
                </div>
            </div>
            {/* What is left to pay, not what was paid: the outstanding figure is
                the one that prompts action. */}
            <p className="text-sm text-ink-500 shrink-0 tabular-nums">
                {isSettled ? formatCurrency(contributionAmount) : `${formatCurrency(outstandingAmount)} left`}
            </p>
        </li>
    );
};

const Panel = ({ label, aside, children }) => (
    <div className="p-4 sm:p-5 border-t border-ink-100">
        <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{label}</h3>
            {aside}
        </div>
        {children}
    </div>
);

const CommitteeCard = ({
    committee, drawRecords, onDrawUser, onAwardRound, onRequestDelete, onReplayDraw,
    isDrawing, isAuthenticated,
}) => {
    const [showAllMembers, setShowAllMembers] = useState(false);

    const participants = committee.participants || [];
    const settled = participants.filter((p) => p.isSettled).length;
    const unpaid = participants.filter((p) => !p.isSettled);
    const collected = committee.collectedAmount || 0;
    const due = participants.reduce((sum, p) => sum + (p.contributionAmount || 0), 0);
    const percent = due ? Math.min((collected / due) * 100, 100) : 0;

    const history = useMemo(
        () =>
            [...drawRecords]
                .filter((r) => String(r.committeeId) === String(committee._id))
                .sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0)),
        [drawRecords, committee._id]
    );

    const term = termPosition(committee);
    const totalRounds = term?.total || history.length;
    const alreadyDrawn = committee.drawnThisPeriod;

    // Unpaid first, since chasing them is the recurring job.
    const ordered = useMemo(
        () => [...participants].sort((a, b) => Number(a.isSettled) - Number(b.isSettled)),
        [participants]
    );
    const visibleMembers = showAllMembers ? ordered : ordered.slice(0, 3);

    return (
        <section className="card overflow-hidden h-full flex flex-col">
            {/* Term */}
            <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-[15px] sm:text-base font-bold text-ink-900 truncate">
                            {committee.name}
                        </h2>
                        <p className="text-[11px] text-ink-500 mt-0.5">
                            {formatDate(committee.startDate)} → {formatDate(committee.endDate)}
                        </p>
                    </div>
                    <span className="badge bg-brand-50 text-brand-700 shrink-0">
                        {term ? `${term.remaining} left` : `${committee.monthsRemaining} left`}
                    </span>
                </div>
                <TermSegments committee={committee} />
            </div>

            {/* This month, then who still owes */}
            <Panel
                label={committee.hasStarted ? formatMonth(new Date()) : 'Not started'}
                aside={
                    committee.hasStarted ? (
                        unpaid.length ? (
                            <span className="badge bg-amber-50 text-amber-700">{unpaid.length} unpaid</span>
                        ) : (
                            <span className="badge bg-emerald-50 text-emerald-700">All paid</span>
                        )
                    ) : (
                        <span className="badge bg-ink-100 text-ink-600">Upcoming</span>
                    )
                }
            >
                <div className="flex items-end justify-between gap-2">
                    <p className="text-xl sm:text-2xl font-bold text-ink-900 leading-none tabular-nums">
                        {formatCurrency(collected)}
                    </p>
                    <p className="text-[11px] text-ink-500">of {formatCurrency(due)}</p>
                </div>
                <div className="mt-2.5 h-[7px] rounded-full bg-ink-200 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                    />
                </div>

                {participants.length > 0 && (
                    <>
                        <ul className="divide-y divide-ink-100 mt-2">
                            {visibleMembers.map((p) => (
                                <ParticipantRow key={p._id || p.user?._id} participant={p} />
                            ))}
                        </ul>
                        {ordered.length > 3 && (
                            <button
                                onClick={() => setShowAllMembers((v) => !v)}
                                className="btn-secondary w-full mt-2 text-xs py-2"
                            >
                                {showAllMembers
                                    ? 'Show fewer'
                                    : `All ${ordered.length} members · ${settled} paid`}
                            </button>
                        )}
                    </>
                )}
            </Panel>

            {/* Draw */}
            <Panel
                label={alreadyDrawn ? 'Next draw' : "This month's draw"}
                aside={
                    committee.autoDraw !== false && (
                        <span className="badge bg-emerald-50 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Automatic
                        </span>
                    )
                }
            >
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-base font-bold text-ink-900">
                        {new Date(committee.nextDrawAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                        })}{' '}
                        · {pad(committee.withdrawHour ?? 15)}:{pad(committee.withdrawMinute ?? 0)}
                    </p>
                    <p className="text-[11px] text-ink-500">
                        <Countdown nextDrawAt={committee.nextDrawAt} />
                    </p>
                </div>
                <p className="text-[11px] text-ink-500 mt-1">
                    Winner receives {formatCurrency(committee.totalPooledAmount)}
                    {!isAuthenticated && ' · watch it live here'}
                </p>

                {committee.needsManualDraw && isAuthenticated && (
                    <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                        <p className="text-xs text-amber-900 leading-snug">
                            {scheduleLabel(committee)} has already passed this month, so it will not run
                            on its own. Draw or award it below — the next one is automatic.
                        </p>
                    </div>
                )}

                {isAuthenticated && !alreadyDrawn && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                            onClick={() => onDrawUser(committee._id)}
                            disabled={isDrawing}
                            className="btn-primary"
                        >
                            {isDrawing && <Spinner className="w-4 h-4" />}
                            {isDrawing ? 'Drawing…' : 'Draw now'}
                        </button>
                        <button
                            onClick={() => onAwardRound(committee)}
                            disabled={isDrawing}
                            className="btn-secondary"
                        >
                            Award…
                        </button>
                    </div>
                )}
            </Panel>

            {/* Pool winners */}
            <Panel
                label={`Pool winners · ${history.length}`}
                aside={
                    history.length === 0 && <span className="text-[11px] text-ink-500">none yet</span>
                }
            >
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {Array.from({ length: Math.max(totalRounds, history.length) }, (_, i) => {
                        const roundNumber = i + 1;
                        const record = history.find((r) => (r.roundNumber || 0) === roundNumber);
                        const isNow = term && roundNumber === term.current && !record;
                        const name = record?.userId?.name;

                        return (
                            <div key={roundNumber} className="shrink-0 w-[52px] text-center">
                                <p className="text-[9px] font-bold tracking-wide text-ink-400">
                                    R{roundNumber}
                                </p>
                                {record ? (
                                    <button
                                        onClick={() => onReplayDraw?.(record)}
                                        className="mt-1 mx-auto block"
                                        aria-label={`Replay round ${roundNumber}, won by ${name}`}
                                    >
                                        <Avatar
                                            name={initials(name || '?')}
                                            tint={avatarTint(name || '')}
                                            size="w-[34px] h-[34px] text-[11px]"
                                        />
                                    </button>
                                ) : (
                                    <span
                                        className={`mt-1 mx-auto grid place-items-center w-[34px] h-[34px] rounded-full text-[11px] ${
                                            isNow
                                                ? 'border-2 border-brand-500 bg-brand-50 text-brand-700 font-bold'
                                                : 'border border-dashed border-ink-200 text-ink-400'
                                        }`}
                                    >
                                        {isNow ? '?' : '·'}
                                    </span>
                                )}
                                <p className="text-[9.5px] text-ink-500 mt-1 truncate">
                                    {record ? monthShort(record.periodKey, record.date) : ''}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {history.length > 0 && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-ink-500">Tap a round to replay its draw</p>
                        {isAuthenticated && (
                            <button
                                onClick={() => onRequestDelete(history[history.length - 1])}
                                className="text-[11px] text-ink-400 hover:text-red-600"
                            >
                                Remove latest
                            </button>
                        )}
                    </div>
                )}
            </Panel>
        </section>
    );
};

const Dashboard = ({
    committees, drawRecords, onDrawUser, onAwardRound, onDrawRecordDelete, onReplayDraw, isDrawing,
}) => {
    const { isAuthenticated } = useAuth();
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const totals = useMemo(() => {
        const members = new Set();
        let paid = 0;
        let outstanding = 0;
        committees.forEach((c) => {
            (c.participants || []).forEach((p) => members.add(String(p.user?._id)));
            paid += c.collectedAmount || 0;
            outstanding += c.outstandingAmount || 0;
        });
        return { members: members.size, paid, outstanding };
    }, [committees]);

    const confirmDelete = async () => {
        setDeleting(true);
        await onDrawRecordDelete(pendingDelete._id);
        setDeleting(false);
        setPendingDelete(null);
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-ink-900">Committees</h1>
                <p className="text-sm text-ink-500 mt-1">{formatMonth(new Date())}</p>
            </div>

            {/* With one committee these only restate the card below it. */}
            {committees.length > 1 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <StatTile label="Committees" value={committees.length} />
                    <StatTile label="Members" value={totals.members} />
                    <StatTile label="Collected" value={formatCurrency(totals.paid)} hint="this month" />
                    <StatTile label="Still owed" value={formatCurrency(totals.outstanding)} />
                </div>
            )}

            {committees.length ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
                    {committees.map((committee) => (
                        <CommitteeCard
                            key={committee._id}
                            committee={committee}
                            drawRecords={drawRecords}
                            onDrawUser={onDrawUser}
                            onAwardRound={onAwardRound}
                            onRequestDelete={setPendingDelete}
                            onReplayDraw={onReplayDraw}
                            isDrawing={isDrawing}
                            isAuthenticated={isAuthenticated}
                        />
                    ))}
                </div>
            ) : (
                <div className="card">
                    <EmptyState
                        title="No committees running"
                        description="Finished committees are in the archive. Create one to start a new round."
                    />
                </div>
            )}

            <ConfirmDialog
                open={Boolean(pendingDelete)}
                title="Remove this draw record?"
                description={`This removes the win for ${pendingDelete?.userId?.name || 'this member'} and makes them eligible again.`}
                confirmLabel="Remove"
                busy={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
};

export default Dashboard;
