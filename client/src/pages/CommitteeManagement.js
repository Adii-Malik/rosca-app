import React, { useCallback, useEffect, useState } from 'react';
import {
    fetchCommittees, createCommittee, updateCommittee, deleteCommittee, fetchUsers,
    setCommitteeStatus, errorMessage,
} from '../services/api';
import CommitteeForm from '../components/CommitteeForm';
import CommitteeList from '../components/CommitteeList';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog, PageLoader } from '../components/ui/Primitives';

/**
 * Spells out what a deletion would leave behind. Deleting a committee does not
 * remove its contributions or draw records — they survive pointing at something
 * that no longer exists, and the archive entry disappears with it.
 */
const deleteWarning = (committee) => {
    if (!committee) return '';
    const draws = committee.drawCount || 0;
    const contributions = committee.contributionCount || 0;

    if (!draws && !contributions) {
        return 'This committee has no contributions or draws recorded, so nothing else is affected.';
    }

    const parts = [];
    if (contributions) parts.push(`${contributions} contribution${contributions === 1 ? '' : 's'}`);
    if (draws) parts.push(`${draws} draw record${draws === 1 ? '' : 's'}`);

    return `This permanently deletes the committee. ${parts.join(' and ')} will be kept but will `
        + 'no longer belong to any committee, and its archive entry — the full round history and '
        + 'member ledger — will be gone. This cannot be undone.';
};

const CommitteeManagement = () => {
    const [committees, setCommittees] = useState([]);
    const [users, setUsers] = useState([]);
    const [editing, setEditing] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const load = useCallback(async () => {
        try {
            const [committeeList, userList] = await Promise.all([fetchCommittees(), fetchUsers()]);
            setCommittees(committeeList);
            setUsers(userList);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not load committees.'));
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSubmit = async (data) => {
        if (editing) {
            const updated = await updateCommittee(editing._id, data);
            setCommittees((current) => current.map((c) => (c._id === updated._id ? updated : c)));
            setEditing(null);
            toast.success(`${updated.name} updated.`);
        } else {
            const created = await createCommittee(data);
            setCommittees((current) => [...current, created]);
            toast.success(`${created.name} created.`);
        }
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteCommittee(pendingDelete._id);
            setCommittees((current) => current.filter((c) => c._id !== pendingDelete._id));
            if (editing?._id === pendingDelete._id) setEditing(null);
            toast.success(`${pendingDelete.name} deleted.`);
            setPendingDelete(null);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not delete that committee.'));
        } finally {
            setDeleting(false);
        }
    };

    const startEdit = (committee) => {
        setEditing(committee);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // A closed committee cannot be edited (the archive reports its ledger), so
    // reopening is the way back to making changes.
    const handleReopen = async (committee) => {
        try {
            const reopened = await setCommitteeStatus(committee._id, 'active');
            setCommittees((current) =>
                current.map((c) => (c._id === reopened._id ? { ...c, ...reopened } : c))
            );
            toast.success(`${committee.name} reopened — it is back on the dashboard.`);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not reopen that committee.'));
        }
    };

    if (loading) return <PageLoader label="Loading committees…" />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-ink-900">Committees</h1>
                <p className="text-sm text-ink-500 mt-1">
                    Set the payout, term and who takes part in each round.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <CommitteeForm
                    committee={editing}
                    users={users}
                    onSubmit={handleSubmit}
                    onCancelEdit={() => setEditing(null)}
                />
                <CommitteeList
                    committees={committees}
                    onEdit={startEdit}
                    onDelete={setPendingDelete}
                    onReopen={handleReopen}
                    editingId={editing?._id}
                />
            </div>

            <ConfirmDialog
                open={Boolean(pendingDelete)}
                title={`Delete ${pendingDelete?.name}?`}
                description={deleteWarning(pendingDelete)}
                busy={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
};

export default CommitteeManagement;
