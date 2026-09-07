import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, formatMonth, initials, avatarTint } from '../utils/format';
import { Avatar, ConfirmDialog, EmptyState, Spinner, StatTile } from './ui/Primitives';

const pad = (n) => String(n).padStart(2, '0');

/**
 * Time left until `target`. The countdown used to be computed in the browser
 * against a hardcoded 15:00, which meant it pointed at a moment nothing acted
 * on. The server now supplies the instant it will actually draw.
 */
const timeUntil = (target) => {
    const diff = Math.max(new Date(target) - Date.now(), 0);
    return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        elapsed: diff === 0,
    };
};

const progressPercent = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const total = end - start;
    if (!(total > 0)) return 0;
    return Math.min(Math.max(((Date.now() - start) / total) * 100, 0), 100);
};

const Countdown = ({ nextDrawAt }) => {
    const [time, setTime] = useState(() => timeUntil(nextDrawAt));

    useEffect(() => {
        setTime(timeUntil(nextDrawAt));
        const id = setInterval(() => setTime(timeUntil(nextDrawAt)), 1000);
        return () => clearInterval(id);
    }, [nextDrawAt]);

    // One line on a phone; the four boxes were a lot of height for something
    // secondary to what people actually open the page for.
    return (
        <p className="font-mono tabular-nums text-ink-900">
            <span className="text-lg font-bold">{time.days}</span>
            <span className="text-xs text-ink-500 mr-2">d</span>
            <span className="text-lg font-bold">{pad(time.hours)}</span>
            <span className="text-xs text-ink-500 mr-2">h</span>
            <span className="text-lg font-bold">{pad(time.minutes)}</span>
            <span className="text-xs text-ink-500 mr-2">m</span>
            <span className="text-lg font-bold">{pad(time.seconds)}</span>
            <span className="text-xs text-ink-500">s</span>
        </p>
    );
};

/** e.g. "10th at 15:00" — the committee's own configured schedule. */
const scheduleLabel = (committee) => {
    const day = committee.withdrawDay;
    const suffix = day % 10 === 1 && day !== 11 ? 'st'
        : day % 10 === 2 && day !== 12 ? 'nd'
        : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    const hour = String(committee.withdrawHour ?? 15).padStart(2, '0');
    const minute = String(committee.withdrawMinute ?? 0).padStart(2, '0');
    return `${day}${suffix} at ${hour}:${minute}`;
};

const ParticipantRow = ({ participant }) => {
    const name = participant.user?.name || 'Unknown member';
    const { paidAmount = 0, contributionAmount = 0, isSettled, hasPaidPartially } = participant;

    const status = isSettled
        ? { label: 'Paid', text: 'text-emerald-700', dot: 'bg-emerald-500' }
        : hasPaidPartially
            ? { label: 'Part paid', text: 'text-amber-700', dot: 'bg-amber-500' }
            : { label: 'Pending', text: 'text-ink-500', dot: 'bg-ink-300' };

    return (
        <li className="flex items-center justify-between gap-2.5 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={initials(name)} tint={avatarTint(name)} size="w-8 h-8 text-[11px]" />
                <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate leading-tight">{name}</p>
                    {/* Status reads as text with a dot rather than a pill: the pill
                        wrapped under the amount and got clipped on a phone. */}
                    <p className="text-xs text-ink-500 flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                        <span className={status.text}>{status.label}</span>
                        {participant.contributionLimit > 1 && (
                            <span className="text-ink-400">· {participant.contributionLimit} shares</span>
                        )}
                    </p>
                </div>
            </div>
            <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-ink-900 leading-tight">
                    {formatCurrency(paidAmount)}
                </p>
                <p className="text-xs text-ink-400 mt-0.5">of {formatCurrency(contributionAmount)}</p>
            </div>
        </li>
    );
};

const CommitteeCard = ({ committee, drawRecords, onDrawUser, onAwardRound, onRequestDelete, isDrawing, isAuthenticated }) => {
    const participants = committee.participants || [];
    const totalMembers = participants.length;
    const settledCount = participants.filter((p) => p.isSettled).length;
    const collected = committee.collectedAmount || 0;
    const due = participants.reduce((sum, p) => sum + (p.contributionAmount || 0), 0);

    const history = useMemo(
        () =>
            [...drawRecords]
                .filter((record) => String(record.committeeId) === String(committee._id))
                .sort((a, b) => new Date(b.date) - new Date(a.date)),
        [drawRecords, committee._id]
    );

    // The server decides this; deriving it in the browser drifts across timezones.
    const alreadyDrawnThisMonth = committee.drawnThisPeriod;

    return (
        <section className="card overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-ink-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-ink-900 truncate">{committee.name}</h2>
                        <p className="text-sm text-ink-500 mt-0.5">
                            {formatDate(committee.startDate)} – {formatDate(committee.endDate)}
                        </p>
                    </div>
                    <span className="badge bg-brand-50 text-brand-700">
                        {committee.monthsRemaining} month{committee.monthsRemaining === 1 ? '' : 's'} left
                    </span>
                </div>

                <div className="mt-4">
                    <div className="flex justify-between text-xs text-ink-500 mb-1.5">
                        <span>Term progress</span>
                        <span>{Math.round(progressPercent(committee.startDate, committee.endDate))}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-brand-600 transition-all duration-500"
                            style={{ width: `${progressPercent(committee.startDate, committee.endDate)}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-ink-100">
                {/* Payout & draw */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-ink-500">Payout</p>
                            <p className="text-lg sm:text-xl font-bold text-ink-900 leading-tight">
                                {formatCurrency(committee.totalPooledAmount)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-ink-500">Per share</p>
                            <p className="text-lg sm:text-xl font-bold text-ink-900 leading-tight">
                                {formatCurrency(committee.monthlyAmount)}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl bg-ink-50 border border-ink-100 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-ink-500">
                                    {alreadyDrawnThisMonth ? 'Next draw' : 'Draw in'}
                                </p>
                                <Countdown nextDrawAt={committee.nextDrawAt} />
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs font-medium text-ink-700">{scheduleLabel(committee)}</p>
                                {committee.autoDraw !== false && (
                                    <p className="text-[11px] text-emerald-700 flex items-center justify-end gap-1 mt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        Automatic
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* A committee created after its own draw day still owes its
                        first round, but the scheduler will not fire it late. */}
                    {committee.needsManualDraw && isAuthenticated && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                            <p className="text-xs text-amber-900 leading-snug">
                                This month&apos;s draw date has already passed, so it will not run on its
                                own. Draw or award it below when you are ready — the next one is automatic.
                            </p>
                        </div>
                    )}

                    {isAuthenticated && (
                        <div>
                            <button
                                onClick={() => onDrawUser(committee._id)}
                                disabled={isDrawing || alreadyDrawnThisMonth}
                                className="btn-primary w-full"
                            >
                                {isDrawing && <Spinner className="w-4 h-4" />}
                                {isDrawing
                                    ? 'Draw in progress…'
                                    : alreadyDrawnThisMonth
                                        ? 'Already drawn this month'
                                        : 'Draw now'}
                            </button>
                            {!alreadyDrawnThisMonth && (
                                <>
                                    <button
                                        onClick={() => onAwardRound(committee)}
                                        disabled={isDrawing}
                                        className="btn-secondary w-full mt-2"
                                    >
                                        Award to a specific member…
                                    </button>
                                    <p className="mt-2 text-xs text-ink-500 text-center">
                                        Draw runs on its own; award is for the collector&apos;s round or
                                        anything agreed in advance.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    <div>
                        <h3 className="text-sm font-semibold text-ink-900 mb-2">Draw history</h3>
                        {history.length ? (
                            <ul className="space-y-2">
                                {history.map((record, index) => {
                                    const name = record.userId?.name || 'Unknown member';
                                    return (
                                        <li
                                            key={record._id}
                                            className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
                                                index === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-ink-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar name={initials(name)} tint={avatarTint(name)} />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-ink-900 truncate">{name}</p>
                                                    <p className="text-xs text-ink-500">{formatDate(record.date)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {record.trigger === 'assigned' && (
                                                    <span
                                                        className="badge bg-ink-100 text-ink-600"
                                                        title="Given to this member directly, not drawn"
                                                    >
                                                        Assigned
                                                    </span>
                                                )}
                                                {index === 0 && (
                                                    <span className="badge bg-emerald-600 text-white">Latest</span>
                                                )}
                                                {isAuthenticated && (
                                                    <button
                                                        onClick={() => onRequestDelete(record)}
                                                        className="text-ink-400 hover:text-red-600 p-1"
                                                        aria-label={`Delete draw record for ${name}`}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-sm text-ink-500">No draws yet.</p>
                        )}
                    </div>
                </div>

                {/* Contributions */}
                <div className="p-4 sm:p-6">
                    <div className="flex items-baseline justify-between gap-3 mb-3">
                        <h3 className="text-sm font-semibold text-ink-900">
                            Contributions · {formatMonth(new Date())}
                        </h3>
                        <span className="text-xs text-ink-500">{settledCount}/{totalMembers} paid</span>
                    </div>

                    <div className="mb-4">
                        <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${due ? Math.min((collected / due) * 100, 100) : 0}%` }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-ink-500">
                            {formatCurrency(collected)} collected of {formatCurrency(due)}
                        </p>
                    </div>

                    {totalMembers ? (
                        <ul className="divide-y divide-ink-100 max-h-96 overflow-y-auto">
                            {/* Unsettled members first — they are the ones needing action. */}
                            {[...participants]
                                .sort((a, b) => Number(a.isSettled) - Number(b.isSettled))
                                .map((p) => (
                                    <ParticipantRow key={p._id || p.user?._id} participant={p} />
                                ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-ink-500">No participants in this committee yet.</p>
                    )}
                </div>
            </div>
        </section>
    );
};

const Dashboard = ({ committees, drawRecords, onDrawUser, onAwardRound, onDrawRecordDelete, isDrawing }) => {
    const { isAuthenticated } = useAuth();
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const totals = useMemo(() => {
        const pooled = committees.reduce((sum, c) => sum + (c.totalPooledAmount || 0), 0);
        const members = new Set();
        let paid = 0;
        let outstanding = 0;
        committees.forEach((c) => {
            (c.participants || []).forEach((p) => members.add(String(p.user?._id)));
            paid += c.collectedAmount || 0;
            outstanding += c.outstandingAmount || 0;
        });
        return { pooled, members: members.size, paid, outstanding };
    }, [committees]);

    const confirmDelete = async () => {
        setDeleting(true);
        await onDrawRecordDelete(pendingDelete._id);
        setDeleting(false);
        setPendingDelete(null);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-ink-900">Committees</h1>
                <p className="text-sm text-ink-500 mt-1">{formatMonth(new Date())}</p>
            </div>

            {/* Only the two figures that matter at a glance on a phone; the rest
                are visible on the committee cards themselves. */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatTile
                    label="Still owed"
                    value={formatCurrency(totals.outstanding)}
                    hint={`${formatCurrency(totals.paid)} collected`}
                />
                <StatTile label="Pooled per round" value={formatCurrency(totals.pooled)} />
                <div className="hidden lg:block"><StatTile label="Committees" value={committees.length} /></div>
                <div className="hidden lg:block"><StatTile label="Members" value={totals.members} /></div>
            </div>

            {committees.length ? (
                <div className="space-y-6">
                    {committees.map((committee) => (
                        <CommitteeCard
                            key={committee._id}
                            committee={committee}
                            drawRecords={drawRecords}
                            onDrawUser={onDrawUser}
                            onAwardRound={onAwardRound}
                            onRequestDelete={setPendingDelete}
                            isDrawing={isDrawing}
                            isAuthenticated={isAuthenticated}
                        />
                    ))}
                </div>
            ) : (
                <div className="card">
                    <EmptyState
                        title="No committees yet"
                        description="Create a committee to start tracking contributions and running draws."
                    />
                </div>
            )}

            <ConfirmDialog
                open={Boolean(pendingDelete)}
                title="Delete draw record?"
                description={`This removes the draw for ${pendingDelete?.userId?.name || 'this member'} and makes them eligible again.`}
                busy={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
};

export default Dashboard;
