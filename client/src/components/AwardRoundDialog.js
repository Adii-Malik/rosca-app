import React, { useMemo, useState } from 'react';
import { formatCurrency, initials, avatarTint } from '../utils/format';
import { Avatar, Spinner } from './ui/Primitives';

/**
 * Hands the current round to a chosen member instead of drawing for it.
 * Committees commonly reserve the first round for whoever collects and runs
 * them, and a round is sometimes agreed in advance for other reasons.
 */
const AwardRoundDialog = ({ open, committee, drawRecords, onConfirm, onCancel }) => {
    const [userId, setUserId] = useState('');
    const [busy, setBusy] = useState(false);

    // Nobody may receive more payouts than the shares they hold.
    const eligible = useMemo(() => {
        if (!committee) return [];
        const counts = new Map();
        for (const record of drawRecords || []) {
            if (String(record.committeeId) !== String(committee._id)) continue;
            const id = String(record.userId?._id || record.userId);
            counts.set(id, (counts.get(id) || 0) + 1);
        }
        return (committee.participants || [])
            .filter((p) => p.user)
            .filter((p) => (counts.get(String(p.user._id)) || 0) < (p.contributionLimit || 1));
    }, [committee, drawRecords]);

    if (!open || !committee) return null;

    const submit = async () => {
        if (!userId) return;
        setBusy(true);
        try {
            await onConfirm(userId);
            setUserId('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-ink-900/50 animate-fade-in">
            <div role="dialog" aria-modal="true" className="card p-6 w-full max-w-md animate-slide-up">
                <h3 className="text-lg font-semibold text-ink-900">Award this month</h3>
                <p className="mt-2 text-sm text-ink-600">
                    Give this month&apos;s {formatCurrency(committee.totalPooledAmount)} to a specific
                    member of <strong>{committee.name}</strong> instead of drawing for it — for the
                    collector&apos;s round, or anything agreed in advance.
                </p>

                {eligible.length ? (
                    <>
                        <ul className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-ink-200 divide-y divide-ink-100">
                            {eligible.map((p) => {
                                const id = p.user._id;
                                return (
                                    <li key={id}>
                                        <label
                                            className={`flex items-center gap-3 p-2.5 cursor-pointer ${
                                                userId === id ? 'bg-brand-50/60' : 'hover:bg-ink-50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="award-member"
                                                value={id}
                                                checked={userId === id}
                                                onChange={() => setUserId(id)}
                                                className="w-4 h-4 text-brand-600 focus:ring-brand-500 shrink-0"
                                            />
                                            <Avatar
                                                name={initials(p.user.name)}
                                                tint={avatarTint(p.user.name)}
                                                size="w-8 h-8 text-[11px]"
                                            />
                                            <span className="text-sm text-ink-900 flex-1 truncate">
                                                {p.user.name}
                                            </span>
                                            {p.contributionLimit > 1 && (
                                                <span className="text-xs text-ink-500 shrink-0">
                                                    {p.contributionLimit} shares
                                                </span>
                                            )}
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>

                        <p className="mt-3 text-xs text-ink-500">
                            This is recorded as assigned, not drawn — the history will say so.
                        </p>
                    </>
                ) : (
                    <p className="mt-4 text-sm text-ink-500">
                        Every member has already received all the payouts their shares allow.
                    </p>
                )}

                <div className="mt-6 flex gap-3 justify-end">
                    <button className="btn-secondary" onClick={onCancel} disabled={busy}>
                        Cancel
                    </button>
                    <button className="btn-primary" onClick={submit} disabled={busy || !userId}>
                        {busy && <Spinner className="w-4 h-4" />}
                        Award round
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AwardRoundDialog;
