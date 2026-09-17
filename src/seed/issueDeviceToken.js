require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDatabase = require('../config/database');
const SolarInstallation = require('../models/SolarInstallation');
const ensureObjectId = require('../utils/ensureObjectId');
const { signDevice } = require('../config/auth');

async function run() {
  const installationId = process.argv[2];
  ensureObjectId(installationId, 'installationId');
  await connectDatabase();
  if (!await SolarInstallation.exists({ _id: installationId })) throw new Error('Installation not found.');
  console.log(signDevice(installationId));
}
if (require.main === module) run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
