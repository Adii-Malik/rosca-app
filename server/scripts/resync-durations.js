/**
 * Recomputes each open committee's term from its share count.
 *
 * `duration` used to be a month difference between the start and end dates,
 * which could disagree with the number of shares — a committee of ten shares
 * whose dates spanned nine months reported nine rounds, leaving one share with
 * no round to be paid in. The term is now the share count; this brings records
 * created under the old rule into line and reports the end dates that no longer
 * match, which have to be corrected by hand.
 *
 * Usage: node scripts/resync-durations.js          (dry run)
 *        node scripts/resync-durations.js --apply  (write)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const Committee = require('../models/Committee');
require('../models/User');

const apply = process.argv.includes('--apply');

const monthsInclusive = (start, end) =>
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

(async () => {
    await mongoose.connect(env.mongoUri, { autoIndex: false });

    const committees = await Committee.find({ status: { $ne: 'completed' } });
    if (!committees.length) {
        console.log('No open committees.');
        await mongoose.disconnect();
        return;
    }

    let changed = 0;
    for (const committee of committees) {
        const shares = committee.participants.reduce((t, p) => t + (p.contributionLimit || 1), 0);
        const months = monthsInclusive(new Date(committee.startDate), new Date(committee.endDate));

        console.log(`"${committee.name}"`);
        console.log(`   ${committee.participants.length} members, ${shares} shares`);
        console.log(`   duration ${committee.duration} -> ${shares}   (dates cover ${months} months)`);

        if (months !== shares) {
            const suggested = new Date(committee.startDate);
            suggested.setMonth(suggested.getMonth() + shares - 1);
            console.log(
                `   !! end date disagrees with the shares. Set it to ` +
                `${suggested.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} ` +
                `or change the shares.`
            );
        }

        if (committee.duration === shares) {
            console.log('   -> already correct.\n');
            continue;
        }

        changed += 1;
        if (apply) {
            committee.duration = shares;
            await committee.save();
            console.log('   -> updated.\n');
        } else {
            console.log('   -> would update (dry run).\n');
        }
    }

    console.log(apply ? `Updated ${changed} committee(s).` : `${changed} committee(s) would change. Re-run with --apply.`);
    await mongoose.disconnect();
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
