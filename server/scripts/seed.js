/**
 * Populates the configured database with sample data for local development.
 * Refuses to run against anything that looks like a hosted/Atlas database.
 * Usage: node scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Committee = require('../models/Committee');
const Contribution = require('../models/Contribution');
const DrawRecord = require('../models/DrawRecord');

const isLocal = /(localhost|127\.0\.0\.1)/.test(env.mongoUri);

if (!isLocal && process.argv[2] !== '--force') {
    console.error('Refusing to seed a non-local database.');
    console.error(`Target: ${env.mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    console.error('Re-run with --force if you are certain.');
    process.exit(1);
}

const NAMES = ['Adil', 'Bilal', 'Sana', 'Hina', 'Usman', 'Fatima', 'Zain', 'Ayesha'];

(async () => {
    await mongoose.connect(env.mongoUri);
    console.log('Connected. Clearing existing data...');

    await Promise.all([
        User.deleteMany({}),
        Committee.deleteMany({}),
        Contribution.deleteMany({}),
        DrawRecord.deleteMany({}),
    ]);

    const users = await User.insertMany(NAMES.map((name) => ({ name })));
    console.log(`Created ${users.length} users.`);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 6, 1);

    // One participant takes a double share to exercise contributionLimit.
    const participants = users.map((user, i) => ({
        user: user._id,
        contributionLimit: i === 0 ? 2 : 1,
    }));
    const totalShares = participants.reduce((sum, p) => sum + p.contributionLimit, 0);
    const monthlyAmount = 5000;
    const totalPooledAmount = monthlyAmount * totalShares;

    const committee = await Committee.create({
        name: 'Monthly Committee 2026',
        participants,
        totalPooledAmount,
        monthlyAmount,
        duration: 8,
        startDate,
        endDate,
        withdrawDay: 10,
        withdrawHour: 15,
        withdrawMinute: 0,
        timezone: 'Asia/Karachi',
        status: 'active',
    });
    console.log(`Created committee "${committee.name}" (Rs ${totalPooledAmount}/round).`);

    // Everyone except the last two has paid this month.
    const payers = users.slice(0, users.length - 2);
    await Contribution.insertMany(
        payers.map((user) => ({
            userId: user._id,
            committeeId: committee._id,
            amount: monthlyAmount,
            date: new Date(now.getFullYear(), now.getMonth(), 3),
        }))
    );
    console.log(`Recorded ${payers.length} contributions for this month (${users.length - payers.length} outstanding).`);

    // A draw in a previous month, so history is non-empty.
    await DrawRecord.create({
        userId: users[1]._id,
        committeeId: committee._id,
        date: new Date(now.getFullYear(), now.getMonth() - 1, 10),
    });
    console.log('Added one past draw record.');

    // A finished committee, so the archive has something to show.
    const pastStart = new Date(now.getFullYear() - 1, now.getMonth() - 4, 1);
    const pastEnd = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const pastMembers = users.slice(0, 4);
    const pastMonthly = 4000;
    const pastPool = pastMonthly * pastMembers.length;

    const pastCommittee = await Committee.create({
        name: 'Committee 2025 (closed)',
        participants: pastMembers.map((user) => ({ user: user._id, contributionLimit: 1 })),
        totalPooledAmount: pastPool,
        monthlyAmount: pastMonthly,
        duration: 4,
        startDate: pastStart,
        endDate: pastEnd,
        withdrawDay: 5,
        withdrawHour: 15,
        timezone: 'Asia/Karachi',
        status: 'completed',
        completedAt: pastEnd,
        completionReason: 'all-paid-out',
    });

    // Every member paid every month, and each won exactly one round.
    const pastContributions = [];
    const pastDraws = [];
    for (let round = 0; round < pastMembers.length; round += 1) {
        const roundDate = new Date(pastStart.getFullYear(), pastStart.getMonth() + round, 5);
        const periodKey = `${roundDate.getFullYear()}-${String(roundDate.getMonth() + 1).padStart(2, '0')}`;

        for (const user of pastMembers) {
            pastContributions.push({
                userId: user._id,
                committeeId: pastCommittee._id,
                amount: pastMonthly,
                date: roundDate,
            });
        }

        pastDraws.push({
            userId: pastMembers[round]._id,
            committeeId: pastCommittee._id,
            date: roundDate,
            periodKey,
            roundNumber: round + 1,
            payoutAmount: pastPool,
            trigger: 'scheduled',
            eligibleSnapshot: pastMembers.slice(round).map((u) => ({
                userId: u._id,
                name: u.name,
                contributionLimit: 1,
            })),
        });
    }

    await Contribution.insertMany(pastContributions);
    await DrawRecord.insertMany(pastDraws);
    console.log(`Created archived committee "${pastCommittee.name}" with ${pastDraws.length} rounds.`);

    await mongoose.disconnect();
    console.log('\nSeed complete.');
})().catch(async (err) => {
    console.error('Seed failed:', err);
    await mongoose.disconnect();
    process.exit(1);
});
