import React, { useEffect, useMemo, useState } from 'react';
import { errorMessage } from '../services/api';
import { formatCurrency, initials, avatarTint } from '../utils/format';
import { useToast } from './ui/Toast';
import { Avatar, Spinner } from './ui/Primitives';

const today = () => new Date().toISOString().split('T')[0];

/** A participant's share of the pool, matching the server's calculation. */
const shareFor = (committee, userId) => {
    if (!committee || !userId) return null;
    const participant = committee.participants?.find((p) => p.user?._id === userId);
    if (!participant) return null;

    const totalShares = committee.participants.reduce(
        (sum, p) => sum + (p.contributionLimit || 1),
        0
    );
    if (!totalShares) return 0;
    return (committee.totalPooledAmount * (participant.contributionLimit || 1)) / totalShares;
};

const sameMonth = (a, b) =>
    a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

/**
 * Records contributions for several members at once. Entering a month's payments
 * one member at a time was the slowest part of using the app, so the default is
 * a checklist of everyone who still owes.
 *
 * Editing an existing contribution stays single-member, since it targets one record.
 */
const ContributionForm = ({ committees, contributions, editingContribution, onSubmit, onSubmitBulk, onCancelEdit }) => {
    const [committeeId, setCommitteeId] = useState('');
    const [date, setDate] = useState(today);
    const [selected, setSelected] = useState({}); // userId -> amount string
    const [submitting, setSubmitting] = useState(false);

    // Single-member fields, used only while editing.
    const [editUserId, setEditUserId] = useState('');
    const [editAmount, setEditAmount] = useState('');

    const toast = useToast();
    const isEditing = Boolean(editingContribution);

    // Only committees still running can take new money. A finished one keeps its
    // records but is not a valid target, and the server rejects it too.
    const openCommittees = useMemo(
        () => committees.filter((c) => c.status !== 'completed'),
        [committees]
    );

    const selectedCommittee = useMemo(
        () => committees.find((c) => c._id === committeeId) || null,
        [committees, committeeId]
    );

    const rawParticipants = useMemo(
        () => selectedCommittee?.participants?.filter((p) => p.user) || [],
        [selectedCommittee]
    );

    // Who has already paid for the month being entered, so they cannot be
    // double-recorded and the checklist shows real progress.
    const paidUserIds = useMemo(() => {
        if (!committeeId) return new Set();
        const target = new Date(date);
        if (Number.isNaN(target.getTime())) return new Set();

        return new Set(
            (contributions || [])
                .filter(
                    (c) =>
                        c.committeeId?._id === committeeId &&
                        sameMonth(new Date(c.date), target) &&
                        c._id !== editingContribution?._id
                )
                .map((c) => c.userId?._id)
                .filter(Boolean)
        );
    }, [contributions, committeeId, date, editingContribution]);

    const unpaid = rawParticipants.filter((p) => !paidUserIds.has(p.user._id));

    // Members who still owe come first — they are the ones being recorded, and
    // burying them under everyone who has already paid defeats the point.
    const participants = useMemo(
        () =>
            [...rawParticipants].sort(
                (a, b) => Number(paidUserIds.has(a.user._id)) - Number(paidUserIds.has(b.user._id))
            ),
        [rawParticipants, paidUserIds]
    );

    useEffect(() => {
        if (editingContribution) {
            setCommitteeId(editingContribution.committeeId?._id || '');
            setEditUserId(editingContribution.userId?._id || '');
            setEditAmount(editingContribution.amount ?? '');
            setDate(toDateInputValue(editingContribution.date) || today());
            setSelected({});
        } else {
            setEditUserId('');
            setEditAmount('');
            setSelected({});
        }
    }, [editingContribution]);

    // Clear the checklist when the committee or month changes, so amounts never
    // carry over to a different context.
    useEffect(() => {
        setSelected({});
    }, [committeeId, date]);

    const toggle = (participant) => {
        const id = participant.user._id;
        setSelected((current) => {
            if (id in current) {
                const { [id]: _removed, ...rest } = current;
                return rest;
            }
            return { ...current, [id]: String(shareFor(selectedCommittee, id) ?? '') };
        });
    };

    const selectAllUnpaid = () => {
        const next = {};
        for (const p of unpaid) {
            next[p.user._id] = String(shareFor(selectedCommittee, p.user._id) ?? '');
        }
        setSelected(next);
    };

    const selectedIds = Object.keys(selected);
    const total = selectedIds.reduce((sum, id) => sum + (Number(selected[id]) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isEditing) {
            setSubmitting(true);
            try {
                await onSubmit({
                    amount: Number(editAmount) || 0,
                    userId: editUserId,
                    committeeId,
                    date,
                });
            } catch (error) {
                toast.error(errorMessage(error, 'Could not save the contribution.'));
            } finally {
                setSubmitting(false);
            }
            return;
        }

        if (!committeeId) {
            toast.error('Choose a committee.');
            return;
        }
        if (selectedCommittee?.status === 'completed') {
            toast.error('That committee has finished; contributions cannot be added to it.');
            return;
        }
        if (!selectedIds.length) {
            toast.error('Select at least one member.');
            return;
        }

        setSubmitting(true);
        try {
            await onSubmitBulk({
                committeeId,
                date,
                entries: selectedIds.map((userId) => ({ userId, amount: Number(selected[userId]) || 0 })),
            });
            setSelected({});
        } catch (error) {
            toast.error(errorMessage(error, 'Could not record those contributions.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink-900">
                    {isEditing ? 'Edit contribution' : 'Record contributions'}
                </h2>
                {isEditing && (
                    <button type="button" className="btn-ghost text-xs" onClick={onCancelEdit}>
                        Cancel
                    </button>
                )}
            </div>

            <div>
                <label htmlFor="k-committee" className="label">Committee</label>
                <select
                    id="k-committee"
                    value={committeeId}
                    onChange={(e) => setCommitteeId(e.target.value)}
                    className="input"
                    required
                >
                    <option value="">
                        {openCommittees.length ? 'Select a committee…' : 'No active committees'}
                    </option>
                    {openCommittees.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                    {/* An archived committee stays selectable only while editing
                        one of its existing records. */}
                    {isEditing && selectedCommittee?.status === 'completed' && (
                        <option value={selectedCommittee._id}>{selectedCommittee.name} (closed)</option>
                    )}
                </select>
            </div>

            <div>
                <label htmlFor="k-date" className="label">Date</label>
                <input
                    id="k-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input"
                    required
                />
            </div>

            {isEditing ? (
                <>
                    <div>
                        <label htmlFor="k-user" className="label">Member</label>
                        <select
                            id="k-user"
                            value={editUserId}
                            onChange={(e) => setEditUserId(e.target.value)}
                            className="input"
                            required
                        >
                            {participants.map((p) => (
                                <option key={p.user._id} value={p.user._id}>{p.user.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="k-amount" className="label">Amount</label>
                        <input
                            id="k-amount"
                            type="number"
                            min="0"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="input"
                            required
                        />
                    </div>
                </>
            ) : (
                <div>
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                        <span className="label mb-0">Members</span>
                        {selectedCommittee && (
                            <div className="flex items-center gap-2 text-xs">
                                {unpaid.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={selectAllUnpaid}
                                        className="font-medium text-brand-600 hover:text-brand-700"
                                    >
                                        Select all unpaid ({unpaid.length})
                                    </button>
                                )}
                                {selectedIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelected({})}
                                        className="text-ink-500 hover:text-ink-700"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {!selectedCommittee ? (
                        <p className="text-sm text-ink-500 rounded-xl border border-ink-200 p-3">
                            Choose a committee to see its members.
                        </p>
                    ) : (
                        <ul className="rounded-xl border border-ink-200 divide-y divide-ink-100 max-h-80 overflow-y-auto">
                            {participants.map((p) => {
                                const id = p.user._id;
                                const paid = paidUserIds.has(id);
                                const checked = id in selected;
                                const share = shareFor(selectedCommittee, id);

                                return (
                                    <li
                                        key={id}
                                        className={`flex items-center gap-3 p-2.5 ${
                                            paid ? 'opacity-60' : checked ? 'bg-brand-50/60' : ''
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            id={`pick-${id}`}
                                            checked={checked}
                                            disabled={paid}
                                            onChange={() => toggle(p)}
                                            className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 shrink-0 disabled:opacity-50"
                                        />
                                        <Avatar
                                            name={initials(p.user.name)}
                                            tint={avatarTint(p.user.name)}
                                            size="w-8 h-8 text-[11px]"
                                        />
                                        <label htmlFor={`pick-${id}`} className="flex-1 min-w-0 cursor-pointer">
                                            <span className="block text-sm text-ink-900 truncate">{p.user.name}</span>
                                            {p.contributionLimit > 1 && (
                                                <span className="block text-xs text-ink-500">
                                                    {p.contributionLimit} shares
                                                </span>
                                            )}
                                        </label>

                                        {paid ? (
                                            <span className="badge bg-emerald-50 text-emerald-700 shrink-0">Paid</span>
                                        ) : checked ? (
                                            <input
                                                type="number"
                                                min="0"
                                                value={selected[id]}
                                                onChange={(e) =>
                                                    setSelected((c) => ({ ...c, [id]: e.target.value }))
                                                }
                                                className="input w-24 py-1.5 px-2 text-right shrink-0"
                                                aria-label={`Amount for ${p.user.name}`}
                                            />
                                        ) : (
                                            <span className="text-xs text-ink-400 shrink-0">
                                                {formatCurrency(share)}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {selectedIds.length > 0 && (
                        <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-50 border border-brand-100 px-3.5 py-2.5">
                            <span className="text-sm text-brand-900">
                                {selectedIds.length} member{selectedIds.length === 1 ? '' : 's'}
                            </span>
                            <span className="text-sm font-semibold text-brand-900">{formatCurrency(total)}</span>
                        </div>
                    )}
                </div>
            )}

            <button
                type="submit"
                className="btn-primary w-full"
                disabled={submitting || (!isEditing && selectedIds.length === 0)}
            >
                {submitting && <Spinner className="w-4 h-4" />}
                {isEditing
                    ? 'Save changes'
                    : selectedIds.length > 1
                        ? `Record ${selectedIds.length} contributions`
                        : 'Record contribution'}
            </button>
        </form>
    );
};

export default ContributionForm;
