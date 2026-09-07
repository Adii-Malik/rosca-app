import React, { useCallback, useEffect, useState } from 'react';
import { fetchArchive, fetchDrawReplay, errorMessage } from '../services/api';
import { formatCurrency, formatDate, initials, avatarTint } from '../utils/format';
import { Avatar, EmptyState, PageLoader, StatTile } from '../components/ui/Primitives';
import DrawReplay from '../components/DrawReplay';
import { useToast } from '../components/ui/Toast';

const monthLabel = (periodKey, fallbackDate) => {
    if (periodKey) {
        const [year, month] = periodKey.split('-').map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    }
    return formatDate(fallbackDate);
};

const REASONS = {
    'all-paid-out': 'Everyone paid out',
    'term-ended': 'Term ended',
    'closed-manually': 'Closed by admin',
};

const CommitteeRecord = ({ committee, onReplay }) => {
    const [tab, setTab] = useState('rounds');

    return (
        <section className="card overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-ink-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-ink-900 truncate">{committee.name}</h2>
                        <p className="text-sm text-ink-500 mt-0.5">
                            {formatDate(committee.startDate)} – {formatDate(committee.endDate)}
                        </p>
                    </div>
                    <span className="badge bg-ink-100 text-ink-600">
                        {REASONS[committee.completionReason] || 'Completed'}
                    </span>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                    <div>
                        <dt className="text-xs uppercase tracking-wide text-ink-500">Rounds</dt>
                        <dd className="text-sm font-semibold text-ink-900 mt-0.5">{committee.roundsPlayed}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase tracking-wide text-ink-500">Per round</dt>
                        <dd className="text-sm font-semibold text-ink-900 mt-0.5">
                            {formatCurrency(committee.totalPooledAmount)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase tracking-wide text-ink-500">Contributed</dt>
                        <dd className="text-sm font-semibold text-ink-900 mt-0.5">
                            {formatCurrency(committee.totalContributed)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase tracking-wide text-ink-500">Paid out</dt>
                        <dd className="text-sm font-semibold text-ink-900 mt-0.5">
                            {formatCurrency(committee.totalPaidOut)}
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="px-5 sm:px-6 pt-4 flex gap-1">
                {[['rounds', `Rounds (${committee.rounds.length})`], ['members', `Members (${committee.members.length})`]].map(
                    ([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                tab === key ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-100'
                            }`}
                        >
                            {label}
                        </button>
                    )
                )}
            </div>

            {tab === 'rounds' ? (
                <ul className="divide-y divide-ink-100 mt-2">
                    {committee.rounds.map((round) => {
                        const name = round.winner?.name || 'Unknown member';
                        return (
                            <li key={round._id} className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xs font-mono text-ink-400 w-6 shrink-0">
                                        {round.roundNumber}
                                    </span>
                                    <Avatar name={initials(name)} tint={avatarTint(name)} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-ink-900 truncate">{name}</p>
                                        <p className="text-xs text-ink-500">
                                            {monthLabel(round.periodKey, round.date)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {round.trigger === 'assigned' && (
                                        <span
                                            className="badge bg-ink-100 text-ink-600"
                                            title="Given to this member directly, not drawn"
                                        >
                                            Assigned
                                        </span>
                                    )}
                                    <span className="text-sm font-semibold text-ink-900">
                                        {formatCurrency(round.payoutAmount)}
                                    </span>
                                    {round.canReplay ? (
                                        <button onClick={() => onReplay(round._id)} className="btn-secondary px-3 py-1.5 text-xs">
                                            Replay
                                        </button>
                                    ) : (
                                        <span
                                            className="text-xs text-ink-400"
                                            title="Recorded before replays were supported"
                                        >
                                            No replay
                                        </span>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="overflow-x-auto mt-2">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-ink-500 border-b border-ink-100">
                                <th className="px-5 sm:px-6 py-2 font-medium">Member</th>
                                <th className="px-3 py-2 font-medium text-right">Paid in</th>
                                <th className="px-3 py-2 font-medium text-right">Received</th>
                                <th className="px-3 py-2 font-medium text-right">Net</th>
                                <th className="px-5 sm:px-6 py-2 font-medium text-right">Won</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {committee.members.map((member) => (
                                <tr key={member.userId}>
                                    <td className="px-5 sm:px-6 py-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <Avatar
                                                name={initials(member.name)}
                                                tint={avatarTint(member.name)}
                                                size="w-7 h-7 text-[10px]"
                                            />
                                            <span className="font-medium text-ink-900">{member.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-ink-700">
                                        {formatCurrency(member.totalContributed)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-ink-700">
                                        {formatCurrency(member.totalReceived)}
                                    </td>
                                    <td
                                        className={`px-3 py-2.5 text-right font-medium ${
                                            member.net > 0 ? 'text-emerald-600' : member.net < 0 ? 'text-red-600' : 'text-ink-500'
                                        }`}
                                    >
                                        {member.net > 0 ? '+' : ''}
                                        {formatCurrency(member.net)}
                                    </td>
                                    <td className="px-5 sm:px-6 py-2.5 text-right text-ink-700">{member.timesWon}×</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};

const Archive = () => {
    const [committees, setCommittees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replay, setReplay] = useState(null);
    const toast = useToast();

    const load = useCallback(async () => {
        try {
            const { committees: list } = await fetchArchive();
            setCommittees(list);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not load the archive.'));
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        load();
    }, [load]);

    const handleReplay = async (drawId) => {
        try {
            setReplay(await fetchDrawReplay(drawId));
        } catch (error) {
            toast.error(errorMessage(error, 'That draw cannot be replayed.'));
        }
    };

    if (loading) return <PageLoader label="Loading past committees…" />;

    const totals = committees.reduce(
        (acc, c) => ({
            rounds: acc.rounds + c.roundsPlayed,
            paidOut: acc.paidOut + c.totalPaidOut,
        }),
        { rounds: 0, paidOut: 0 }
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-ink-900">Archive</h1>
                <p className="text-sm text-ink-500 mt-1">
                    Committees that have finished, with every round on record.
                </p>
            </div>

            {committees.length ? (
                <>
                    <div className="grid grid-cols-3 gap-4">
                        <StatTile label="Committees" value={committees.length} />
                        <StatTile label="Rounds played" value={totals.rounds} />
                        <StatTile label="Total paid out" value={formatCurrency(totals.paidOut)} />
                    </div>

                    <div className="space-y-6">
                        {committees.map((committee) => (
                            <CommitteeRecord key={committee._id} committee={committee} onReplay={handleReplay} />
                        ))}
                    </div>
                </>
            ) : (
                <div className="card">
                    <EmptyState
                        title="Nothing archived yet"
                        description="Committees appear here once their term ends or every member has been paid out."
                    />
                </div>
            )}

            <DrawReplay replay={replay} onClose={() => setReplay(null)} />
        </div>
    );
};

export default Archive;
