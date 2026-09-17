require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDatabase = require('../config/database');
const Province = require('../models/Province');
const District = require('../models/District');
const User = require('../models/User');

async function seedUsers() {
  if (!process.env.SEED_USER_PASSWORD || process.env.SEED_USER_PASSWORD.length < 12) {
    throw new Error('Set SEED_USER_PASSWORD to a unique password of at least 12 characters before running this command.');
  }
  const [western, gampaha] = await Promise.all([Province.findOne({ code: 'WP' }).lean(), District.findOne({ code: 'GA' }).lean()]);
  if (!western || !gampaha) throw new Error('Run npm run seed before creating demo users.');
  const passwordHash = await bcrypt.hash(process.env.SEED_USER_PASSWORD, 12);
  const users = [
    { name: 'National Operations Officer', email: 'national.officer@slsea.demo', role: 'NATIONAL' },
    { name: 'Western Province Officer', email: 'western.officer@slsea.demo', role: 'PROVINCE', province: western._id },
    { name: 'Gampaha District Officer', email: 'gampaha.officer@slsea.demo', role: 'DISTRICT', district: gampaha._id },
  ];
  await Promise.all(users.map((user) => User.updateOne({ email: user.email }, { $set: { ...user, passwordHash } }, { upsert: true, runValidators: true })));
  console.log(`Provisioned ${users.length} demo users. Passwords are never printed.`);
}

async function run() {
  await connectDatabase();
  await seedUsers();
}
if (require.main === module) run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
module.exports = { seedUsers };
