/**
 * Marks committees completed when their term has ended or every member has been
 * paid out — the same rule the scheduler applies, runnable on demand for
 * committees that predate the status field.
 *
 * Usage: node scripts/close-finished-committees.js          (dry run)
 *        node scripts/close-finished-committees.js --apply  (write)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const Committee = require('../models/Committee');
const DrawRecord = require('../models/DrawRecord');
require('../models/User');
const drawService = require('../services/drawService');

const apply = process.argv.includes('--apply');

(async () => {
    await mongoose.connect(env.mongoUri, { autoIndex: false });

    const committees = await Committee.find({ status: { $ne: 'completed' } });
    if (!committees.length) {
        console.log('No open committees.');
        await mongoose.disconnect();
        return;
    }

    for (const committee of committees) {
        const draws = await DrawRecord.find({ committeeId: committee._id });
        const paidOut = drawService.isFullyPaidOut(committee, draws);
        const ended = new Date(committee.endDate) < new Date();
        const reason = paidOut ? 'all-paid-out' : ended ? 'term-ended' : null;

        console.log(`"${committee.name}"`);
        console.log(`   term ended: ${ended}   fully paid out: ${paidOut}`);

        if (!reason) {
            console.log('   -> still running, left open.\n');
            continue;
        }
        console.log(`   -> would close as: ${reason}`);

        if (apply) {
            await Committee.updateOne(
                { _id: committee._id },
                { $set: { status: 'completed', completedAt: new Date(), completionReason: reason } }
            );
            console.log('   CLOSED.');
        }
        console.log();
    }

    if (!apply) console.log('Dry run — nothing written. Re-run with --apply.');
    await mongoose.disconnect();
})().catch(async (err) => {
    console.error('Failed:', err.message);
    await mongoose.disconnect();
    process.exit(1);
});
