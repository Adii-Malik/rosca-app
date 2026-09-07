/**
 * Brings legacy DrawRecord documents up to the current schema:
 *   - `date` was a String holding an ISO timestamp; it is now a Date.
 *   - `periodKey` ("2026-09") identifies the round and backs the unique index
 *     that prevents two draws in the same month.
 *   - `payoutAmount` records what the round paid, so history stays correct even
 *     if the committee's amount is changed later.
 *   - `roundNumber` orders the rounds.
 *
 * Reports collisions before writing: two draws mapping to the same round would
 * violate the unique index, so the migration refuses rather than half-applying.
 *
 * Usage: node scripts/migrate-draw-dates.js          (dry run)
 *        node scripts/migrate-draw-dates.js --apply  (write)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('./../config/env');
const Committee = require('../models/Committee');
const DrawRecord = require('../models/DrawRecord');
const schedule = require('../lib/schedule');

const apply = process.argv.includes('--apply');

(async () => {
    await mongoose.connect(env.mongoUri, { autoIndex: false });

    const committees = await Committee.find();
    const byId = new Map(committees.map((c) => [String(c._id), c]));

    const raw = mongoose.connection.db.collection('drawrecords');
    const all = await raw.find().sort({ date: 1 }).toArray();

    console.log(`Draw records: ${all.length}\n`);

    const planned = [];
    const seen = new Map(); // committeeId -> Set(periodKey)
    const collisions = [];
    const roundCounters = new Map();

    for (const record of all) {
        const committee = byId.get(String(record.committeeId));
        const tz = schedule.committeeTimezone(committee);
        const when = new Date(record.date);

        if (Number.isNaN(when.getTime())) {
            console.log(`  ${record._id}: unparseable date ${JSON.stringify(record.date)} — SKIPPED`);
            continue;
        }

        const periodKey = record.periodKey || schedule.periodKeyFor(when, tz);
        const key = String(record.committeeId);
        if (!seen.has(key)) seen.set(key, new Set());
        if (seen.get(key).has(periodKey)) {
            collisions.push({ _id: record._id, periodKey });
        }
        seen.get(key).add(periodKey);

        const round = (roundCounters.get(key) || 0) + 1;
        roundCounters.set(key, round);

        const set = {};
        if (typeof record.date === 'string') set.date = when;
        if (record.periodKey === undefined || record.periodKey === null) set.periodKey = periodKey;
        if (record.payoutAmount === undefined || record.payoutAmount === null) {
            set.payoutAmount = committee?.totalPooledAmount ?? null;
        }
        if (record.roundNumber === undefined || record.roundNumber === null) set.roundNumber = round;

        if (Object.keys(set).length) planned.push({ _id: record._id, set, when, committee });
    }

    for (const p of planned) {
        const fields = Object.entries(p.set)
            .map(([k, v]) => `${k}=${v instanceof Date ? v.toISOString() : JSON.stringify(v)}`)
            .join('  ');
        console.log(`  ${p.when.toISOString().slice(0, 10)}  ${fields}`);
    }

    console.log(`\n${planned.length} record(s) would change.`);

    if (collisions.length) {
        console.error('\nREFUSING TO APPLY — two draws map to the same round:');
        collisions.forEach((c) => console.error(`   ${c._id} -> ${c.periodKey}`));
        console.error('The unique index would reject these. Resolve them first.');
        await mongoose.disconnect();
        process.exit(1);
    }
    console.log('No round collisions: safe for the unique index.');

    if (!apply) {
        console.log('\nDry run — nothing written. Re-run with --apply to write these changes.');
        await mongoose.disconnect();
        return;
    }

    for (const p of planned) {
        await raw.updateOne({ _id: p._id }, { $set: p.set });
    }
    console.log(`\nApplied to ${planned.length} record(s).`);
    await mongoose.disconnect();
})().catch(async (err) => {
    console.error('Migration failed:', err.message);
    await mongoose.disconnect();
    process.exit(1);
});
