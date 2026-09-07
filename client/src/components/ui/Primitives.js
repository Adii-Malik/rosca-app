import React from 'react';

export const Spinner = ({ className = 'w-5 h-5' }) => (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
);

export const PageLoader = ({ label = 'Loading…' }) => (
    <div className="flex flex-col items-center justify-center py-24 text-ink-500">
        <Spinner className="w-8 h-8 text-brand-600" />
        <p className="mt-3 text-sm">{label}</p>
    </div>
);

export const EmptyState = ({ title, description, action }) => (
    <div className="text-center py-12 px-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
        </div>
        <h3 className="mt-4 text-sm font-semibold text-ink-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-ink-500 max-w-sm mx-auto">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);

export const Avatar = ({ name, tint, size = 'w-9 h-9 text-xs' }) => (
    <span className={`${size} ${tint} rounded-full flex items-center justify-center font-semibold shrink-0`}>
        {name}
    </span>
);

export const StatTile = ({ label, value, hint, icon }) => (
    <div className="card p-3.5 sm:p-5">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wide text-ink-500">
                    {label}
                </p>
                {/* Was `truncate`, which clipped "Rs 120,000" to "Rs 120,0…" on a
                    phone. Currency figures have to stay readable, so the type
                    scales down instead of the value being cut. */}
                <p className="mt-1 sm:mt-1.5 text-lg sm:text-2xl font-bold text-ink-900 leading-tight break-words">
                    {value}
                </p>
                {hint && <p className="mt-1 text-[11px] sm:text-xs text-ink-500 leading-snug">{hint}</p>}
            </div>
            {icon && (
                <div className="hidden sm:flex w-9 h-9 rounded-xl bg-brand-50 text-brand-600 items-center justify-center shrink-0">
                    {icon}
                </div>
            )}
        </div>
    </div>
);

/** Accessible replacement for window.confirm on destructive actions. */
export const ConfirmDialog = ({ open, title, description, confirmLabel = 'Delete', onConfirm, onCancel, busy }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-ink-900/50 animate-fade-in">
            <div role="dialog" aria-modal="true" className="card p-6 w-full max-w-sm animate-slide-up">
                <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
                {description && <p className="mt-2 text-sm text-ink-600">{description}</p>}
                <div className="mt-6 flex gap-3 justify-end">
                    <button className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
                    <button className="btn-danger" onClick={onConfirm} disabled={busy}>
                        {busy && <Spinner className="w-4 h-4" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
