/**
 * Read-only survey of whatever database ATLAS_CONNECTION points at.
 * Usage: node scripts/inspect-db.js
 * Never writes. Safe to run against production.
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.ATLAS_CONNECTION;
if (!uri) {
    console.error('ATLAS_CONNECTION is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
}

const redact = (u) => u.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

(async () => {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    try {
        await client.connect();
        const db = client.db();
        console.log(`Connected to: ${redact(uri)}`);
        console.log(`Database: ${db.databaseName}\n`);

        const collections = await db.listCollections().toArray();
        if (!collections.length) {
            console.log('(no collections — database is empty)');
            return;
        }

        for (const { name } of collections) {
            const coll = db.collection(name);
            const count = await coll.countDocuments();
            console.log(`\n=== ${name} (${count} docs) ===`);

            const sample = await coll.find({}).limit(3).toArray();
            for (const doc of sample) {
                console.log(JSON.stringify(doc, null, 2));
            }
            if (count > 3) console.log(`... and ${count - 3} more`);

            const indexes = await coll.indexes();
            console.log(`indexes: ${indexes.map((i) => i.name).join(', ')}`);
        }
    } catch (err) {
        console.error('Inspection failed:', err.message);
        process.exitCode = 1;
    } finally {
        await client.close();
    }
})();
