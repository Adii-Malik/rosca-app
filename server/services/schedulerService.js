// services/schedulerService.js
// Until now the withdrawal countdown was decorative: nothing on the server ever
// acted on it, so a draw only happened if an admin happened to press a button.
// This ticks once a minute, runs any draw that has come due, and closes
// committees that have finished.
const Committee = require('../models/Committee');
const DrawRecord = require('../models/DrawRecord');
const schedule = require('../lib/schedule');
const drawService = require('./drawService');

const TICK_MS = Number(process.env.SCHEDULER_TICK_MS) || 60000;

/**
 * Closes a committee once its term has ended or everyone has been paid out, so
 * finished committees drop off the dashboard into the archive instead of
 * lingering with a countdown that will never fire.
 */
const closeIfFinished = async (committee) => {
    const drawRecords = await DrawRecord.find({ committeeId: committee._id });

    let reason = null;
    if (drawService.isFullyPaidOut(committee, drawRecords)) {
        reason = 'all-paid-out';
    } else if (new Date(committee.endDate) < new Date()) {
        reason = 'term-ended';
    }
    if (!reason) return false;

    await Committee.updateOne(
        { _id: committee._id, status: { $ne: 'completed' } },
        { $set: { status: 'completed', completedAt: new Date(), completionReason: reason } }
    );
    console.log(`[scheduler] Committee "${committee.name}" completed (${reason}).`);
    return true;
};

/**
 * One pass over every active committee.
 * `runDraw` is injected so this module does not depend on the socket layer.
 */
const tick = async ({ runDraw, now = new Date() } = {}) => {
    // No populate needed: eligibility only compares participant ids.
    // Legacy committees have no status field; absent means active.
    const committees = await Committee.find({ status: { $ne: 'completed' } });
    const started = [];

    for (const committee of committees) {
        try {
            if (await closeIfFinished(committee)) continue;
            if (committee.autoDraw === false) continue;
            if (!schedule.isDue(committee, now)) continue;

            // performDraw rejects a round that has already been drawn, so a due
            // committee is retried each tick until it actually succeeds.
            await runDraw(committee._id, { trigger: 'scheduled' });
            started.push(String(committee._id));
        } catch (error) {
            // An expected refusal (already drawn, nobody contributed) is normal
            // on most ticks and should not be logged as a failure.
            if (!(error instanceof drawService.DrawError)) {
                console.error(`[scheduler] Error handling committee ${committee._id}:`, error.message);
            }
        }
    }

    return started;
};

const start = ({ runDraw }) => {
    const run = () => {
        tick({ runDraw }).catch((error) => console.error('[scheduler] Tick failed:', error.message));
    };

    run(); // Catch up on anything missed while the server was down.
    const timer = setInterval(run, TICK_MS);
    timer.unref?.();
    console.log(`[scheduler] Watching for scheduled draws every ${TICK_MS / 1000}s.`);
    return () => clearInterval(timer);
};

module.exports = { start, tick, closeIfFinished, TICK_MS };
