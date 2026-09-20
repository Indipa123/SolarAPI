require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connect = require('../src/config/database');
const Installation = require('../src/models/SolarInstallation');
const Reading = require('../src/models/GenerationReading');
const interval = 900000;
function rollingRows(item, now = new Date()) {
  const end = Math.floor(now.getTime() / interval) * interval;
  return Array.from({ length: 673 }, (_, i) => {
    const time = end - (672 - i) * interval;
    const day = Math.floor((time + 19800000) / 86400000);
    const slot = Math.floor(((time + 19800000) % 86400000) / interval);
    const power = s => s < 24 || s >= 72 ? 0 : item.capacityKw * Math.sin((s - 24) / 48 * Math.PI);
    let daily = 0, partial = 0;
    for (let s = 0; s < 96; s++) { const e = power(s) * 0.25; daily += e; if (s <= slot) partial += e; }
    return { installation: item._id, timestamp: new Date(time), powerKw: Number(power(slot).toFixed(3)),
      energyKwh: Number((1000 + day * daily + partial).toFixed(3)), voltage: 230,
      createdAt: new Date(time), updatedAt: new Date(time) };
  });
}
async function run() {
  await connect();
  const items = await Installation.find({ meterId: /^DEMO-/ }).lean();
  if (!items.length) throw new Error('Seed installations first.');
  for (const item of items) {
    const rows = rollingRows(item);
    await Reading.bulkWrite(rows.map(row => ({ updateOne: { filter: { installation: row.installation, timestamp: row.timestamp },
      update: { $setOnInsert: row }, upsert: true, timestamps: false } })), { ordered: false });
  }
  // Backfill true migration time; do not pretend the old seed had modification metadata.
  await Reading.collection.updateMany({ updatedAt: { $exists: false } }, { $set: { updatedAt: new Date() } });
  console.log(`Refreshed ${items.length} demo installations through the latest completed quarter hour; existing readings retained.`);
}
if (require.main === module) run().catch(() => { console.error('Demo refresh failed. Check database access and seed data.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { rollingRows };
