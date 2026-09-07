import React, { useEffect, useState } from 'react';
import { errorMessage } from '../services/api';
import { useToast } from './ui/Toast';
import { Spinner } from './ui/Primitives';

const UserForm = ({ user, onSubmit, onCancelEdit }) => {
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();

    useEffect(() => {
        setName(user?.name || '');
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;

        setSubmitting(true);
        try {
            await onSubmit({ name: trimmed });
            setName('');
        } catch (error) {
            toast.error(errorMessage(error, 'Could not save that member.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink-900">
                {user ? 'Edit member' : 'Add a member'}
            </h2>

            <div>
                <label htmlFor="member-name" className="label">Full name</label>
                <input
                    id="member-name"
                    type="text"
                    placeholder="e.g. Ayesha Khan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    required
                />
            </div>

            <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={submitting || !name.trim()}>
                    {submitting && <Spinner className="w-4 h-4" />}
                    {user ? 'Save changes' : 'Add member'}
                </button>
                {user && (
                    <button type="button" className="btn-secondary" onClick={onCancelEdit} disabled={submitting}>
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
};

export default UserForm;
