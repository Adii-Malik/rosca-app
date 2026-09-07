/**
 * Generates the ADMIN_PASSWORD_HASH value for production.
 * Usage: node scripts/hash-password.js 'your-password'
 */
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
    console.error("Usage: node scripts/hash-password.js 'your-password'");
    process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
    console.log('\nAdd this to your production environment:\n');
    console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
    console.log('Then remove ADMIN_PASSWORD — the hash takes precedence.\n');
});
