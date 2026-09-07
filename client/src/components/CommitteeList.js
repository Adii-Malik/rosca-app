import React from 'react';
import { formatCurrency, formatDate, initials, avatarTint } from '../utils/format';
import { Avatar, EmptyState } from './ui/Primitives';

const CommitteeCard = ({ committee, onEdit, onDelete, onReopen, editingId }) => {
    const participants = (committee.participants || []).filter((p) => p.user);
    const shares = participants.reduce((sum, p) => sum + (p.contributionLimit || 1), 0);
    const closed = committee.status === 'completed';

    return (
        <div className={`card p-5 ${editingId === committee._id ? 'ring-2 ring-brand-500' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-ink-900 truncate">{committee.name}</h3>
                        {closed && <span className="badge bg-ink-100 text-ink-600">Closed</span>}
                    </div>
                    <p className="text-sm text-ink-500 mt-0.5">
                        {formatDate(committee.startDate)} – {formatDate(committee.endDate)} ·{' '}
                        {committee.duration} months
                    </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {closed ? (
                        // Editing a finished committee would rewrite what the
                        // archive reports, so it has to be reopened first.
                        <button onClick={() => onReopen(committee)} className="btn-ghost px-2.5 py-1.5 text-xs">
                            Reopen
                        </button>
                    ) : (
                        <button onClick={() => onEdit(committee)} className="btn-ghost px-2.5 py-1.5 text-xs">
                            Edit
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(committee)}
                        className="btn-ghost px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                        Delete
                    </button>
                </div>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-500">Payout</dt>
                    <dd className="text-sm font-semibold text-ink-900 mt-0.5">
                        {formatCurrency(committee.totalPooledAmount)}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-500">Per share</dt>
                    <dd className="text-sm font-semibold text-ink-900 mt-0.5">
                        {formatCurrency(committee.monthlyAmount)}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-500">Shares</dt>
                    <dd className="text-sm font-semibold text-ink-900 mt-0.5">{shares}</dd>
                </div>
                <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-500">Draw</dt>
                    <dd className="text-sm font-semibold text-ink-900 mt-0.5">
                        {committee.withdrawDay}
                        {ordinal(committee.withdrawDay)} ·{' '}
                        {String(committee.withdrawHour ?? 15).padStart(2, '0')}:
                        {String(committee.withdrawMinute ?? 0).padStart(2, '0')}
                    </dd>
                </div>
            </dl>

            {participants.length > 0 && (
                <div className="mt-4 pt-4 border-t border-ink-100">
                    <p className="text-xs uppercase tracking-wide text-ink-500 mb-2">
                        {participants.length} participant{participants.length === 1 ? '' : 's'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {participants.map((p) => (
                            <span
                                key={p._id || p.user._id}
                                className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 border border-ink-100 pl-1 pr-2.5 py-1"
                            >
                                <Avatar name={initials(p.user.name)} tint={avatarTint(p.user.name)} size="w-6 h-6 text-[10px]" />
                                <span className="text-xs text-ink-700">{p.user.name}</span>
                                {p.contributionLimit > 1 && (
                                    <span className="text-[10px] font-semibold text-brand-600">×{p.contributionLimit}</span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ordinal = (n) => {
    const d = Number(n);
    if (d % 10 === 1 && d !== 11) return 'st';
    if (d % 10 === 2 && d !== 12) return 'nd';
    if (d % 10 === 3 && d !== 13) return 'rd';
    return 'th';
};

const CommitteeList = ({ committees, onEdit, onDelete, onReopen, editingId }) => {
    if (!Array.isArray(committees) || committees.length === 0) {
        return (
            <div className="card">
                <EmptyState
                    title="No committees yet"
                    description="Create one with the form to start tracking contributions and draws."
                />
            </div>
        );
    }

    // Running committees first — those are the ones being worked with. Closed
    // ones are history and were previously mixed in, in insertion order.
    const active = committees
        .filter((c) => c.status !== 'completed')
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    const closed = committees
        .filter((c) => c.status === 'completed')
        .sort((a, b) => new Date(b.completedAt || b.endDate) - new Date(a.completedAt || a.endDate));

    return (
        <div className="space-y-6">
            {active.length > 0 && (
                <div className="space-y-4">
                    {active.map((committee) => (
                        <CommitteeCard
                            key={committee._id}
                            committee={committee}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onReopen={onReopen}
                            editingId={editingId}
                        />
                    ))}
                </div>
            )}

            {closed.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                            Closed ({closed.length})
                        </h3>
                        <div className="flex-1 h-px bg-ink-200" />
                    </div>
                    {closed.map((committee) => (
                        <CommitteeCard
                            key={committee._id}
                            committee={committee}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onReopen={onReopen}
                            editingId={editingId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommitteeList;
