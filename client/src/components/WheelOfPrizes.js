import React, { useEffect, useRef } from 'react';

const TAU = Math.PI * 2;

const COLORS = [
    '#1f47d6', '#3366f2', '#598eff', '#8eb6ff',
    '#0e9f6e', '#f59e0b', '#f97316', '#e11d48',
];

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/**
 * Spins while `isSpinning`, then decelerates onto `landOnId` once the winner is
 * known. The previous version kept module-level mutable state and started a new
 * uncancellable requestAnimationFrame loop on every effect run, so loops piled
 * up and the wheel stopped wherever friction happened to leave it.
 */
const WheelOfPrizes = ({ isSpinning, eligibleUsers, onSpinStatusChange, landOnId }) => {
    const canvasRef = useRef(null);
    const frameRef = useRef(null);
    const angleRef = useRef(0);
    const velocityRef = useRef(0);
    const phaseRef = useRef('idle'); // idle | spinning | landing
    const landingRef = useRef(null);
    const notifyRef = useRef(onSpinStatusChange);

    notifyRef.current = onSpinStatusChange;

    const sectors = (Array.isArray(eligibleUsers) ? eligibleUsers : [])
        .filter((entry) => entry?.user)
        .map((entry, index) => ({
            label: entry.user.name,
            id: String(entry.user._id),
            color: COLORS[index % COLORS.length],
        }));

    const sectorsRef = useRef(sectors);
    sectorsRef.current = sectors;

    // Draw + animation loop.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        const size = canvas.width;
        const radius = size / 2;

        const draw = () => {
            const list = sectorsRef.current;
            ctx.clearRect(0, 0, size, size);

            if (!list.length) {
                ctx.fillStyle = '#e5e7eb';
                ctx.beginPath();
                ctx.arc(radius, radius, radius - 2, 0, TAU);
                ctx.fill();
                return;
            }

            const arc = TAU / list.length;
            list.forEach((sector, i) => {
                const start = arc * i;
                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = sector.color;
                ctx.moveTo(radius, radius);
                ctx.arc(radius, radius, radius - 2, start, start + arc);
                ctx.lineTo(radius, radius);
                ctx.fill();

                ctx.translate(radius, radius);
                ctx.rotate(start + arc / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 15px Inter, sans-serif';
                ctx.fillText(sector.label.slice(0, 16), radius - 18, 6);
                ctx.restore();
            });

            canvas.style.transform = `rotate(${angleRef.current - Math.PI / 2}rad)`;
        };

        const step = () => {
            const phase = phaseRef.current;

            if (phase === 'spinning') {
                angleRef.current = (angleRef.current + velocityRef.current) % TAU;
                // Ramp up to cruising speed and hold it until a winner arrives.
                if (velocityRef.current < 0.38) velocityRef.current += 0.006;
            } else if (phase === 'landing') {
                const { start, from, to, duration } = landingRef.current;
                const elapsed = performance.now() - start;
                const t = Math.min(elapsed / duration, 1);
                angleRef.current = from + (to - from) * easeOutCubic(t);

                if (t >= 1) {
                    angleRef.current %= TAU;
                    phaseRef.current = 'idle';
                    velocityRef.current = 0;
                    notifyRef.current?.(false);
                }
            }

            draw();
            frameRef.current = requestAnimationFrame(step);
        };

        frameRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frameRef.current);
    }, []);

    // Start spinning.
    useEffect(() => {
        if (isSpinning && phaseRef.current === 'idle') {
            phaseRef.current = 'spinning';
            velocityRef.current = 0.05;
            notifyRef.current?.(true);
        }
    }, [isSpinning]);

    // Decelerate onto the winner once the server reveals it.
    useEffect(() => {
        if (!landOnId || phaseRef.current !== 'spinning') return;

        const list = sectorsRef.current;
        const index = list.findIndex((s) => s.id === String(landOnId));
        if (index === -1) {
            // Winner is not on the wheel; stop gracefully rather than hanging.
            phaseRef.current = 'idle';
            notifyRef.current?.(false);
            return;
        }

        const n = list.length;
        const from = angleRef.current;
        // Angle that puts sector `index` under the pointer, plus 4 full turns so
        // the deceleration reads as a spin rather than a jump.
        const target = (TAU * (n - index - 0.5)) / n;
        let to = target;
        while (to < from) to += TAU;
        to += TAU * 4;

        landingRef.current = { start: performance.now(), from, to, duration: 3800 };
        phaseRef.current = 'landing';
    }, [landOnId]);

    return (
        <div className="relative flex items-center justify-center">
            {/* Pointer */}
            <div className="absolute -top-1 z-10 w-0 h-0 border-x-[14px] border-x-transparent border-t-[24px] border-t-white drop-shadow" />
            <canvas
                ref={canvasRef}
                width="440"
                height="440"
                className="block rounded-full shadow-lift max-w-[80vw] max-h-[80vw]"
            />
        </div>
    );
};

export default WheelOfPrizes;
