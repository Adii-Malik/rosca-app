import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchContributions, createContribution, createContributionsBulk, updateContribution,
    deleteContribution, fetchCommittees, errorMessage,
} from '../services/api';
import ContributionForm from '../components/ContributionForm';
import ContributionList from '../components/ContributionList';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog, PageLoader, StatTile } from '../components/ui/Primitives';
import { formatCurrency } from '../utils/format';

const monthKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (key) => {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

const ContributionManagement = () => {
    const [contributions, setContributions] = useState([]);
    const [committees, setCommittees] = useState([]);
    const [editing, setEditing] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [loading, setLoading] = useState(true);

    const [committeeFilter, setCommitteeFilter] = useState('');
    // Defaults to the current month: the flat all-time list made it hard to see
    // whether the month in hand had been collected.
    const [monthFilter, setMonthFilter] = useState(() => monthKey(new Date()));

    const toast = useToast();

    const load = useCallback(async () => {
        try {
            const [contributionList, committeeList] = await Promise.all([
                fetchContributions(),
                fetchCommittees(),
            ]);
            setContributions(contributionList);
            setCommittees(committeeList);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not load contributions.'));
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSubmit = async (data) => {
        const updated = await updateContribution({ ...data, _id: editing._id });
        setContributions((current) => current.map((c) => (c._id === updated._id ? updated : c)));
        setEditing(null);
        toast.success('Contribution updated.');
    };

    const handleSubmitBulk = async (payload) => {
        const { created, skipped, summary } = await createContributionsBulk(payload);
        setContributions((current) => [...created, ...current]);

        // Jump the view to the month just recorded, so the new rows are visible.
        if (created.length) setMonthFilter(monthKey(created[0].date));

        if (summary.created && summary.skipped) {
            toast.success(
                `Recorded ${summary.created} contribution${summary.created === 1 ? '' : 's'}. ` +
                `${summary.skipped} skipped — already paid this month.`
            );
        } else if (summary.created) {
            toast.success(`Recorded ${summary.created} contribution${summary.created === 1 ? '' : 's'}.`);
        } else {
            const reasons = new Set(skipped.map((s) => s.reason));
            toast.info(
                reasons.has('already-paid')
                    ? 'Everyone selected has already paid for this month.'
                    : 'Nothing was recorded.'
            );
        }
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteContribution(pendingDelete._id);
            setContributions((current) => current.filter((c) => c._id !== pendingDelete._id));
            if (editing?._id === pendingDelete._id) setEditing(null);
            toast.success('Contribution deleted.');
            setPendingDelete(null);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not delete that contribution.'));
        } finally {
            setDeleting(false);
        }
    };

    // Every month that has records, newest first, plus the current one so it is
    // always selectable even before anything is entered.
    const availableMonths = useMemo(() => {
        const keys = new Set(contributions.map((c) => monthKey(c.date)));
        keys.add(monthKey(new Date()));
        return [...keys].sort((a, b) => b.localeCompare(a));
    }, [contributions]);

    const filtered = useMemo(
        () =>
            contributions.filter((c) => {
                if (committeeFilter && c.committeeId?._id !== committeeFilter) return false;
                if (monthFilter !== 'all' && monthKey(c.date) !== monthFilter) return false;
                return true;
            }),
        [contributions, committeeFilter, monthFilter]
    );

    // Committees in scope for "what is owed": the filtered one, or every
    // committee still running. A finished committee owes nothing.
    const scopedCommittees = useMemo(
        () =>
            committees.filter(
                (c) =>
                    c.status !== 'completed' &&
                    (!committeeFilter || c._id === committeeFilter)
            ),
        [committees, committeeFilter]
    );

    const expectedPerMonth = useMemo(() => {
        if (!committeeFilter) return null;
        const committee = committees.find((c) => c._id === committeeFilter);
        return committee?.participants?.filter((p) => p.user).length || null;
    }, [committeeFilter, committees]);

    const filteredTotal = filtered.reduce((sum, c) => sum + (c.amount || 0), 0);

    // What those committees should collect in a month, and how far along we are.
    const monthProgress = useMemo(() => {
        let due = 0;
        const membersDue = new Set();

        for (const committee of scopedCommittees) {
            const participants = (committee.participants || []).filter((p) => p.user);
            const shares = participants.reduce((sum, p) => sum + (p.contributionLimit || 1), 0);
            if (!shares) continue;

            for (const p of participants) {
                due += (committee.totalPooledAmount * (p.contributionLimit || 1)) / shares;
                membersDue.add(`${committee._id}:${p.user._id}`);
            }
        }

        // Only payments in scope count towards it.
        const inScope = filtered.filter((c) =>
            scopedCommittees.some((sc) => sc._id === c.committeeId?._id)
        );
        const collected = inScope.reduce((sum, c) => sum + (c.amount || 0), 0);
        const paidMembers = new Set(
            inScope.map((c) => `${c.committeeId?._id}:${c.userId?._id}`)
        );

        return {
            due,
            collected,
            outstanding: Math.max(due - collected, 0),
            paidCount: paidMembers.size,
            memberCount: membersDue.size,
        };
    }, [scopedCommittees, filtered]);

    if (loading) return <PageLoader label="Loading contributions…" />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-ink-900">Contributions</h1>
                <p className="text-sm text-ink-500 mt-1">Record and review monthly payments.</p>
            </div>

            {/* Scoped to the month and committee in view: an all-time total across
                finished committees is noise while entering this month's payments. */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatTile
                    label={monthFilter === 'all' ? 'Collected (all months)' : `Collected · ${monthLabel(monthFilter)}`}
                    value={formatCurrency(monthFilter === 'all' ? filteredTotal : monthProgress.collected)}
                    hint={
                        monthFilter === 'all'
                            ? `${filtered.length} records`
                            : monthProgress.due
                                ? `of ${formatCurrency(monthProgress.due)} due`
                                : undefined
                    }
                />
                <StatTile
                    label="Still outstanding"
                    value={monthFilter === 'all' ? '—' : formatCurrency(monthProgress.outstanding)}
                    hint={
                        monthFilter === 'all'
                            ? 'Pick a month to see what is owed'
                            : committeeFilter
                                ? 'This committee'
                                : 'Across running committees'
                    }
                />
                <StatTile
                    label="Members paid"
                    value={
                        monthProgress.memberCount
                            ? `${monthProgress.paidCount} / ${monthProgress.memberCount}`
                            : '—'
                    }
                    hint={
                        monthProgress.memberCount
                            ? `${Math.max(monthProgress.memberCount - monthProgress.paidCount, 0)} still to pay`
                            : 'No running committees'
                    }
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1">
                    <ContributionForm
                        committees={committees}
                        contributions={contributions}
                        editingContribution={editing}
                        onSubmit={handleSubmit}
                        onSubmitBulk={handleSubmitBulk}
                        onCancelEdit={() => setEditing(null)}
                    />
                </div>

                <div className="lg:col-span-2 card overflow-hidden">
                    <div className="p-4 border-b border-ink-100 flex flex-wrap gap-3 items-center justify-between">
                        <h2 className="text-sm font-semibold text-ink-900">History</h2>
                        <div className="flex flex-wrap gap-2">
                            <select
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                                className="input w-auto"
                                aria-label="Filter by month"
                            >
                                <option value="all">All months</option>
                                {availableMonths.map((key) => (
                                    <option key={key} value={key}>{monthLabel(key)}</option>
                                ))}
                            </select>
                            <select
                                value={committeeFilter}
                                onChange={(e) => setCommitteeFilter(e.target.value)}
                                className="input w-auto"
                                aria-label="Filter by committee"
                            >
                                <option value="">All committees</option>
                                {committees.map((c) => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <ContributionList
                        contributions={filtered}
                        onEdit={setEditing}
                        onDelete={setPendingDelete}
                        editingId={editing?._id}
                        expectedPerMonth={expectedPerMonth}
                    />
                </div>
            </div>

            <ConfirmDialog
                open={Boolean(pendingDelete)}
                title="Delete this contribution?"
                description={`${pendingDelete?.userId?.name || 'This member'} will show as unpaid for that month.`}
                busy={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
};

export default ContributionManagement;
