import React, { useEffect, useMemo, useState } from 'react';
import { errorMessage } from '../services/api';
import { formatCurrency, initials, avatarTint, toDateInputValue } from '../utils/format';
import { useToast } from './ui/Toast';
import { Avatar, Spinner } from './ui/Primitives';

const blank = {
    name: '',
    totalPooledAmount: '',
    startDate: '',
    endDate: '',
    withdrawDay: 1,
    withdrawHour: 15,
    withdrawMinute: 0,
    timezone: 'Asia/Karachi',
    autoDraw: true,
};

// Kept short and regional rather than listing every IANA zone.
const TIMEZONES = [
    'Asia/Karachi',
    'Asia/Dubai',
    'Asia/Riyadh',
    'Asia/Kolkata',
    'Europe/London',
    'America/New_York',
];

const ordinal = (n) => {
    const day = Number(n);
    if (day % 10 === 1 && day !== 11) return 'st';
    if (day % 10 === 2 && day !== 12) return 'nd';
    if (day % 10 === 3 && day !== 13) return 'rd';
    return 'th';
};

const CommitteeForm = ({ committee, users, onSubmit, onCancelEdit }) => {
    const [form, setForm] = useState(blank);
    const [participants, setParticipants] = useState([]); // [{ userId, contributionLimit }]
    const [search, setSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (committee) {
            setForm({
                name: committee.name || '',
                totalPooledAmount: committee.totalPooledAmount ?? '',
                startDate: toDateInputValue(committee.startDate),
                endDate: toDateInputValue(committee.endDate),
                withdrawDay: committee.withdrawDay ?? 1,
                withdrawHour: committee.withdrawHour ?? 15,
                withdrawMinute: committee.withdrawMinute ?? 0,
                timezone: committee.timezone || 'Asia/Karachi',
                autoDraw: committee.autoDraw !== false,
            });
            setParticipants(
                (committee.participants || [])
                    .filter((p) => p.user)
                    .map((p) => ({
                        userId: p.user._id,
                        contributionLimit: p.contributionLimit || 1,
                    }))
            );
        } else {
            setForm(blank);
            setParticipants([]);
        }
        setSearch('');
    }, [committee]);

    const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const selectedIds = useMemo(() => new Set(participants.map((p) => p.userId)), [participants]);

    const available = useMemo(
        () =>
            (users || []).filter(
                (u) => !selectedIds.has(u._id) && u.name.toLowerCase().includes(search.trim().toLowerCase())
            ),
        [users, selectedIds, search]
    );

    const totalShares = participants.reduce((sum, p) => sum + (Number(p.contributionLimit) || 1), 0);

    // Mirrors the server's calculation so the figures are visible before saving.
    const perShare = totalShares > 0 ? (Number(form.totalPooledAmount) || 0) / totalShares : 0;

    const addParticipant = (userId) =>
        setParticipants((current) => [...current, { userId, contributionLimit: 1 }]);

    const removeParticipant = (userId) =>
        setParticipants((current) => current.filter((p) => p.userId !== userId));

    const setLimit = (userId, value) =>
        setParticipants((current) =>
            current.map((p) => (p.userId === userId ? { ...p, contributionLimit: value } : p))
        );

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!participants.length) {
            toast.error('Add at least one participant.');
            return;
        }
        if (new Date(form.endDate) <= new Date(form.startDate)) {
            toast.error('The end date must be after the start date.');
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                ...form,
                totalPooledAmount: Number(form.totalPooledAmount) || 0,
                withdrawDay: Number(form.withdrawDay) || 1,
                withdrawHour: Number(form.withdrawHour) || 0,
                withdrawMinute: Number(form.withdrawMinute) || 0,
                participants: participants.map((p) => ({
                    userId: p.userId,
                    contributionLimit: Number(p.contributionLimit) || 1,
                })),
            });
            if (!committee) {
                setForm(blank);
                setParticipants([]);
            }
        } catch (error) {
            toast.error(errorMessage(error, 'Could not save the committee.'));
        } finally {
            setSubmitting(false);
        }
    };

    const nameFor = (userId) => users?.find((u) => u._id === userId)?.name || 'Unknown member';

    return (
        <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-6">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-ink-900">
                    {committee ? 'Edit committee' : 'New committee'}
                </h2>
                {committee && (
                    <button type="button" className="btn-ghost text-xs" onClick={onCancelEdit}>
                        Cancel edit
                    </button>
                )}
            </div>

            <div>
                <label htmlFor="c-name" className="label">Committee name</label>
                <input
                    id="c-name"
                    type="text"
                    placeholder="e.g. Monthly Committee 2026"
                    value={form.name}
                    onChange={setField('name')}
                    className="input"
                    required
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="c-amount" className="label">Total payout per round</label>
                    <input
                        id="c-amount"
                        type="number"
                        min="0"
                        placeholder="45000"
                        value={form.totalPooledAmount}
                        onChange={setField('totalPooledAmount')}
                        className="input"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="c-day" className="label">Draw day of month</label>
                    <input
                        id="c-day"
                        type="number"
                        min="1"
                        max="31"
                        value={form.withdrawDay}
                        onChange={setField('withdrawDay')}
                        className="input"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="c-start" className="label">Start date</label>
                    <input id="c-start" type="date" value={form.startDate} onChange={setField('startDate')} className="input" required />
                </div>
                <div>
                    <label htmlFor="c-end" className="label">End date</label>
                    <input id="c-end" type="date" value={form.endDate} onChange={setField('endDate')} className="input" required />
                </div>
            </div>

            {/* The draw runs on the server at this moment, so it happens whether
                or not anyone has the page open. */}
            <div className="rounded-xl border border-ink-200 p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-ink-900">Draw schedule</p>
                        <p className="text-xs text-ink-500 mt-0.5">
                            When the winner is picked each month.
                        </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-ink-700 shrink-0">
                        <input
                            type="checkbox"
                            checked={form.autoDraw}
                            onChange={(e) => setForm((f) => ({ ...f, autoDraw: e.target.checked }))}
                            className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                        />
                        Automatic
                    </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                        <label htmlFor="c-hour" className="label">Hour</label>
                        <input
                            id="c-hour"
                            type="number"
                            min="0"
                            max="23"
                            value={form.withdrawHour}
                            onChange={setField('withdrawHour')}
                            className="input"
                        />
                    </div>
                    <div>
                        <label htmlFor="c-minute" className="label">Minute</label>
                        <input
                            id="c-minute"
                            type="number"
                            min="0"
                            max="59"
                            value={form.withdrawMinute}
                            onChange={setField('withdrawMinute')}
                            className="input"
                        />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label htmlFor="c-tz" className="label">Timezone</label>
                        <select id="c-tz" value={form.timezone} onChange={setField('timezone')} className="input">
                            {TIMEZONES.map((zone) => (
                                <option key={zone} value={zone}>{zone.split('/')[1].replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <p className="text-xs text-ink-500">
                    {form.autoDraw
                        ? `Draws on the ${form.withdrawDay || 1}${ordinal(form.withdrawDay)} at ${String(form.withdrawHour).padStart(2, '0')}:${String(form.withdrawMinute).padStart(2, '0')} ${form.timezone}.`
                        : 'Automatic draws are off — an admin must run each draw by hand.'}
                </p>
            </div>

            {/* Participants */}
            <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="label mb-0">Participants</span>
                    <span className="text-xs text-ink-500">
                        {participants.length} selected · {totalShares} share{totalShares === 1 ? '' : 's'}
                    </span>
                </div>

                {participants.length > 0 && (
                    <ul className="rounded-xl border border-ink-200 divide-y divide-ink-100">
                        {participants.map((p) => (
                            <li key={p.userId} className="flex items-center gap-3 p-2.5">
                                <Avatar name={initials(nameFor(p.userId))} tint={avatarTint(nameFor(p.userId))} size="w-8 h-8 text-[11px]" />
                                <span className="text-sm text-ink-900 flex-1 truncate">{nameFor(p.userId)}</span>
                                <label className="text-xs text-ink-500 shrink-0" htmlFor={`share-${p.userId}`}>
                                    Shares
                                </label>
                                <input
                                    id={`share-${p.userId}`}
                                    type="number"
                                    min="1"
                                    value={p.contributionLimit}
                                    onChange={(e) => setLimit(p.userId, e.target.value)}
                                    className="input w-16 py-1.5 px-2 text-center shrink-0"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeParticipant(p.userId)}
                                    className="text-ink-400 hover:text-red-600 p-1 shrink-0"
                                    aria-label={`Remove ${nameFor(p.userId)}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <input
                    type="search"
                    placeholder="Search members to add…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input"
                />

                <div className="max-h-44 overflow-y-auto rounded-xl border border-ink-200 divide-y divide-ink-100">
                    {available.length ? (
                        available.map((user) => (
                            <button
                                key={user._id}
                                type="button"
                                onClick={() => addParticipant(user._id)}
                                className="w-full flex items-center gap-3 p-2.5 hover:bg-ink-50 text-left"
                            >
                                <Avatar name={initials(user.name)} tint={avatarTint(user.name)} size="w-8 h-8 text-[11px]" />
                                <span className="text-sm text-ink-900 flex-1 truncate">{user.name}</span>
                                <span className="text-xs font-medium text-brand-600 shrink-0">Add</span>
                            </button>
                        ))
                    ) : (
                        <p className="p-3 text-sm text-ink-500">
                            {users?.length ? 'No matching members left to add.' : 'No members yet — add some first.'}
                        </p>
                    )}
                </div>
            </div>

            {totalShares > 0 && Number(form.totalPooledAmount) > 0 && (
                <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 text-sm">
                    <p className="text-brand-900">
                        Each share contributes <strong>{formatCurrency(perShare)}</strong> per month, and the
                        winner receives <strong>{formatCurrency(form.totalPooledAmount)}</strong>.
                    </p>
                </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting && <Spinner className="w-4 h-4" />}
                {committee ? 'Save changes' : 'Create committee'}
            </button>
        </form>
    );
};

export default CommitteeForm;
