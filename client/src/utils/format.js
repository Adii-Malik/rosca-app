// Shared formatting helpers so currency and dates read the same everywhere.

export const formatCurrency = (amount) => {
    const value = Number(amount) || 0;
    return `Rs ${value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};

export const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';

export const formatMonth = (value) =>
    value ? new Date(value).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—';

/** Initials for avatar chips, e.g. "Ayesha Khan" -> "AK". */
export const initials = (name = '') =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('') || '?';

/** Deterministic colour per name, so a person keeps the same avatar tint. */
export const avatarTint = (name = '') => {
    const tints = [
        'bg-brand-100 text-brand-700',
        'bg-emerald-100 text-emerald-700',
        'bg-amber-100 text-amber-700',
        'bg-rose-100 text-rose-700',
        'bg-violet-100 text-violet-700',
        'bg-cyan-100 text-cyan-700',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
    return tints[hash % tints.length];
};

/**
 * Formats a date for a <input type="date"> using the *local* calendar day.
 *
 * Using `new Date(v).toISOString().split('T')[0]` reads the UTC day instead,
 * which is a different date for most of the day in a positive-offset zone like
 * Asia/Karachi (+5). Editing a record then displayed the previous day and saved
 * it back, walking dates backwards on every edit.
 */
export const toDateInputValue = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
