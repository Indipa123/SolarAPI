const SolarInstallation = require('../models/SolarInstallation');
const GenerationReading = require('../models/GenerationReading');
const GridSubstation = require('../models/GridSubstation');
const { substations } = require('./geography');

const INTERVAL_MS = 15 * 60 * 1000;
const READING_COUNT = 7 * 96;
// The latest row is the last completed quarter hour, so operational endpoints have current seed data.
function sevenDayStart(now = new Date()) {
  const lastCompleted = Math.floor(now.getTime() / INTERVAL_MS) * INTERVAL_MS;
  return new Date(lastCompleted - (READING_COUNT - 1) * INTERVAL_MS);
}
const START = sevenDayStart();

function makeReadings(item, ordinal) {
  let energy = 1000 + ordinal * 100; // Synthetic meter-lifetime baseline in kWh.
  return Array.from({ length: READING_COUNT }, (_, index) => {
    const timestamp = new Date(START.getTime() + index * INTERVAL_MS);
    const hour = ((timestamp.getTime() + 19800000) % 86400000) / 3600000;
    const cloud = 0.75 + ((ordinal * 37 + index * 17) % 26) / 100;
    const power = hour < 6 || hour >= 18 ? 0 : item.capacityKw * Math.sin((hour - 6) / 12 * Math.PI) * cloud;
    const powerKw = Math.round(power * 1000) / 1000;
    energy += powerKw * 0.25;
    return { installation: item._id, timestamp,
      powerKw, energyKwh: Math.round(energy * 1000) / 1000, voltage: 228 + ((ordinal + index) % 61) / 10,
      createdAt: new Date(START.getTime() + index * INTERVAL_MS), updatedAt: new Date(START.getTime() + index * INTERVAL_MS) };
  });
}

async function seedSolar() {
  await SolarInstallation.init();
  await GenerationReading.init();
  const stations = await GridSubstation.find({ code: { $in: substations.map((item) => item.code) } }).sort({ code: 1 }).lean();
  const meters = [];
  for (const [stationIndex, station] of stations.entries()) {
    for (let index = 0; index < 8; index++) {
      const meterId = `DEMO-${station.code}-${String(index + 1).padStart(3, '0')}`;
      meters.push(meterId);
      await SolarInstallation.updateOne({ meterId }, { $setOnInsert: {
        meterId, inverterId: `INV-${meterId}`, substation: station._id,
        capacityKw: 3 + ((stationIndex * 8 + index) % 35),
        latitude: station.latitude, longitude: station.longitude, status: 'ACTIVE',
      } }, { upsert: true, runValidators: true });
    }
  }
  const items = await SolarInstallation.find({ meterId: { $in: meters } }).sort({ meterId: 1 }).lean();
  let inserted = 0;
  let skipped = 0;
  for (const [ordinal, item] of items.entries()) {
    const existingCount = await GenerationReading.countDocuments({ installation: item._id,
      timestamp: { $gte: START, $lt: new Date(START.getTime() + READING_COUNT * INTERVAL_MS) } });
    if (existingCount === READING_COUNT) {
      skipped += 1;
      continue;
    }
    const rows = makeReadings(item, ordinal);
    const result = await GenerationReading.bulkWrite(rows.map((row) => ({ updateOne: {
      filter: { installation: item._id, timestamp: row.timestamp }, update: { $setOnInsert: row }, upsert: true, timestamps: false,
    } })), { ordered: false });
    inserted += result.upsertedCount;
    if ((ordinal + 1) % 25 === 0) console.log(`Solar readings: ${ordinal + 1}/${items.length} installations processed.`);
  }
  console.log(`Solar seed: ${items.length} installations; ${skipped} already complete; ${inserted} new readings (${READING_COUNT} readings per installation).`);
}

module.exports = { seedSolar, makeReadings, START, READING_COUNT, sevenDayStart };
