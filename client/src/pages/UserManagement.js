import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser, errorMessage } from '../services/api';
import UserForm from '../components/UserForm';
import UserList from '../components/UserList';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog, PageLoader } from '../components/ui/Primitives';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const toast = useToast();

    const loadUsers = useCallback(async () => {
        try {
            setUsers(await fetchUsers());
        } catch (error) {
            toast.error(errorMessage(error, 'Could not load members.'));
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleSubmit = async (userData) => {
        if (editingUser) {
            const updated = await updateUser(editingUser._id, userData);
            setUsers((current) => current.map((u) => (u._id === updated._id ? updated : u)));
            setEditingUser(null);
            toast.success(`${updated.name} updated.`);
        } else {
            const created = await createUser(userData);
            setUsers((current) => [...current, created]);
            toast.success(`${created.name} added.`);
        }
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteUser(pendingDelete._id);
            setUsers((current) => current.filter((u) => u._id !== pendingDelete._id));
            if (editingUser?._id === pendingDelete._id) setEditingUser(null);
            toast.success(`${pendingDelete.name} removed.`);
            setPendingDelete(null);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not remove that member.'));
        } finally {
            setDeleting(false);
        }
    };

    const filtered = useMemo(
        () => users.filter((u) => u.name?.toLowerCase().includes(search.trim().toLowerCase())),
        [users, search]
    );

    if (loading) return <PageLoader label="Loading members…" />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-ink-900">Members</h1>
                <p className="text-sm text-ink-500 mt-1">People who can take part in committees.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1">
                    <UserForm
                        user={editingUser}
                        onSubmit={handleSubmit}
                        onCancelEdit={() => setEditingUser(null)}
                    />
                </div>

                <div className="lg:col-span-2 card">
                    <div className="p-4 border-b border-ink-100 flex flex-wrap gap-3 items-center justify-between">
                        <h2 className="text-sm font-semibold text-ink-900">
                            {users.length} member{users.length === 1 ? '' : 's'}
                        </h2>
                        <input
                            type="search"
                            placeholder="Search members…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input max-w-xs"
                        />
                    </div>
                    <UserList
                        users={filtered}
                        onEdit={setEditingUser}
                        onDelete={setPendingDelete}
                        editingId={editingUser?._id}
                    />
                </div>
            </div>

            <ConfirmDialog
                open={Boolean(pendingDelete)}
                title={`Remove ${pendingDelete?.name}?`}
                description="They will no longer appear in committees. Existing contribution and draw records are kept."
                confirmLabel="Remove"
                busy={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
};

export default UserManagement;
