import React, { useEffect, useRef } from 'react';
import Fireworks from 'fireworks-js';
import { formatCurrency, initials, avatarTint } from '../utils/format';
import { Avatar } from './ui/Primitives';

const DrawUserWithFireworks = ({ drawnUser, onClose, title = "This month's winner" }) => {
    const containerRef = useRef(null);

    // The previous version created a Fireworks instance on every change and never
    // stopped it, so instances accumulated and kept animating after the reveal.
    useEffect(() => {
        if (!drawnUser || !containerRef.current) return undefined;

        const fireworks = new Fireworks(containerRef.current, {
            speed: 3,
            acceleration: 1.15,
            particles: 60,
            trace: 3,
            explosion: 5,
        });
        fireworks.start();

        return () => {
            fireworks.stop();
            fireworks.clear?.();
        };
    }, [drawnUser]);

    // Escape closes the winner card.
    useEffect(() => {
        if (!drawnUser) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose?.();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [drawnUser, onClose]);

    if (!drawnUser) return <div ref={containerRef} className="hidden" />;

    const name = drawnUser.winner?.user?.name || 'Unknown member';
    const amount = drawnUser.committeeData?.totalPooledAmount;

    return (
        <>
            <div
                ref={containerRef}
                className="fixed inset-0 z-[1620] pointer-events-none"
                aria-hidden="true"
            />
            <div
                className="fixed inset-0 z-[1610] flex items-center justify-center p-4 bg-ink-900/85 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
                role="dialog"
                aria-modal="true"
            >
                <div
                    className="card p-8 text-center w-full max-w-sm animate-slide-up"
                    onClick={(e) => e.stopPropagation()}
                >
                    <p className="text-sm uppercase tracking-widest text-brand-600 font-semibold">
                        {title}
                    </p>

                    <div className="mt-5 flex justify-center">
                        <Avatar name={initials(name)} tint={avatarTint(name)} size="w-20 h-20 text-2xl" />
                    </div>

                    <h2 className="mt-4 text-2xl font-bold text-ink-900">{name}</h2>
                    {drawnUser.committeeData?.name && (
                        <p className="mt-1 text-sm text-ink-500">{drawnUser.committeeData.name}</p>
                    )}

                    <p className="mt-5 text-3xl font-extrabold text-emerald-600">{formatCurrency(amount)}</p>

                    <button onClick={onClose} className="btn-primary w-full mt-7">Done</button>
                </div>
            </div>
        </>
    );
};

export default DrawUserWithFireworks;
