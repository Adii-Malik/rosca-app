import React from 'react';
import { formatCurrency, formatDate, initials, avatarTint } from '../utils/format';
import { Avatar, EmptyState } from './ui/Primitives';

const monthKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (key) => {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
    });
};

/**
 * Groups records by the month they belong to. A flat list gave no sense of which
 * month a payment covered, which made it hard to see whether a month was fully
 * collected.
 */
const groupByMonth = (contributions) => {
    const groups = new Map();
    for (const contribution of contributions) {
        const key = monthKey(contribution.date);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(contribution);
    }
    return [...groups.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, items]) => ({
            key,
            label: monthLabel(key),
            items: items.sort((a, b) => new Date(b.date) - new Date(a.date)),
            total: items.reduce((sum, c) => sum + (c.amount || 0), 0),
        }));
};

const ContributionList = ({ contributions, onEdit, onDelete, editingId, expectedPerMonth }) => {
    if (!contributions.length) {
        return (
            <EmptyState
                title="No contributions here"
                description="Nothing matches these filters. Try a different month or committee."
            />
        );
    }

    return (
        <div>
            {groupByMonth(contributions).map((group) => (
                <section key={group.key}>
                    <header className="sticky top-16 z-10 bg-ink-50/95 backdrop-blur border-y border-ink-100 px-4 py-2 flex items-center justify-between gap-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                            {group.label}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-ink-500">
                            <span>
                                {group.items.length}
                                {expectedPerMonth ? ` of ${expectedPerMonth}` : ''} paid
                            </span>
                            <span className="font-semibold text-ink-900">{formatCurrency(group.total)}</span>
                        </div>
                    </header>

                    <ul className="divide-y divide-ink-100">
                        {group.items.map((contribution) => {
                            const name = contribution.userId?.name || 'Unknown member';
                            return (
                                <li
                                    key={contribution._id}
                                    className={`flex items-center justify-between gap-3 px-4 py-3 ${
                                        editingId === contribution._id ? 'bg-brand-50/60' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar name={initials(name)} tint={avatarTint(name)} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-ink-900 truncate">{name}</p>
                                            <p className="text-xs text-ink-500 truncate">
                                                {contribution.committeeId?.name || 'Unknown committee'} ·{' '}
                                                {formatDate(contribution.date)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-sm font-semibold text-ink-900">
                                            {formatCurrency(contribution.amount)}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => onEdit(contribution)}
                                                className="btn-ghost px-2.5 py-1.5 text-xs"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => onDelete(contribution)}
                                                className="btn-ghost px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}
        </div>
    );
};

export default ContributionList;
