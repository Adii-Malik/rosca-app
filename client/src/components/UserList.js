import React from 'react';
import { initials, avatarTint, formatDate } from '../utils/format';
import { Avatar, EmptyState } from './ui/Primitives';

const UserList = ({ users, onEdit, onDelete, editingId }) => {
    if (!Array.isArray(users) || users.length === 0) {
        return <EmptyState title="No members found" description="Add a member using the form, or adjust your search." />;
    }

    return (
        <ul className="divide-y divide-ink-100">
            {users.map((user) => (
                <li
                    key={user._id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 ${
                        editingId === user._id ? 'bg-brand-50/60' : ''
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={initials(user.name)} tint={avatarTint(user.name)} />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-ink-900 truncate">{user.name}</p>
                            {user.createdAt && (
                                <p className="text-xs text-ink-500">Added {formatDate(user.createdAt)}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => onEdit(user)} className="btn-ghost px-2.5 py-1.5 text-xs">
                            Edit
                        </button>
                        <button
                            onClick={() => onDelete(user)}
                            className="btn-ghost px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        >
                            Remove
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    );
};

export default UserList;
