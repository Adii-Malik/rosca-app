import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used inside ToastProvider');
    return ctx;
};

const TONES = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-ink-800',
};

const ICONS = {
    success: 'M5 13l4 4L19 7',
    error: 'M6 18L18 6M6 6l12 12',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

/** Replaces the blocking window.alert() calls the app used previously. */
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((t) => t.id !== id));
    }, []);

    const push = useCallback(
        (message, tone = 'info', duration = 4500) => {
            const id = `${Date.now()}-${Math.random()}`;
            setToasts((current) => [...current, { id, message, tone }]);
            if (duration) setTimeout(() => dismiss(id), duration);
            return id;
        },
        [dismiss]
    );

    const value = useMemo(
        () => ({
            push,
            success: (m) => push(m, 'success'),
            error: (m) => push(m, 'error'),
            info: (m) => push(m, 'info'),
            dismiss,
        }),
        [push, dismiss]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="fixed bottom-4 right-4 z-[2000] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))]">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role="status"
                        className={`${TONES[toast.tone]} text-white rounded-xl shadow-lift px-4 py-3 flex items-start gap-3 animate-slide-up`}
                    >
                        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[toast.tone]} />
                        </svg>
                        <p className="text-sm leading-snug flex-1">{toast.message}</p>
                        <button
                            onClick={() => dismiss(toast.id)}
                            className="opacity-70 hover:opacity-100 shrink-0"
                            aria-label="Dismiss"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
