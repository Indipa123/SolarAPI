require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connect = require('../src/config/database');
const User = require('../src/models/User');
async function run() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 16) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (at least 16 characters).');
  await connect();
  const existing = await User.findOne({ email }).select('+installationAdmin');
  if (existing && !existing.installationAdmin) throw new Error('Use a separate administrator email; ordinary users are not automatically elevated.');
  const user = existing || new User({ email, name: 'Installation Administrator', role: 'NATIONAL' });
  user.passwordHash = await bcrypt.hash(password, 12);
  user.installationAdmin = true;
  await user.save();
  console.log('Administrator provisioned. No credentials printed.');
}
run().catch(() => { console.error('Administrator provisioning failed. Check configuration and database access.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
