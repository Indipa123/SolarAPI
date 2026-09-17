require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDatabase = require('../config/database');
const Province = require('../models/Province');
const District = require('../models/District');
const GridSubstation = require('../models/GridSubstation');
const { provinces, districts, substations } = require('./geography');
const { seedSolar } = require('./solar');

async function upsertGeography() {
  await Province.bulkWrite(provinces.map((province) => ({ updateOne: { filter: { code: province.code }, update: { $set: province }, upsert: true } })));
  const provinceIds = new Map((await Province.find().select('code').lean()).map((province) => [province.code, province._id]));
  await District.bulkWrite(districts.map(({ provinceCode, ...district }) => ({ updateOne: { filter: { code: district.code }, update: { $set: { ...district, province: provinceIds.get(provinceCode) } }, upsert: true } })));
  const districtIds = new Map((await District.find().select('code').lean()).map((district) => [district.code, district._id]));
  await GridSubstation.bulkWrite(substations.map(({ districtCode, ...substation }) => ({ updateOne: { filter: { code: substation.code }, update: { $set: { ...substation, district: districtIds.get(districtCode) } }, upsert: true } })));
  return { provinces: await Province.countDocuments(), districts: await District.countDocuments(), substations: await GridSubstation.countDocuments() };
}

async function run() {
  await connectDatabase();
  const summary = await upsertGeography();
  console.log(`Seeded ${summary.provinces} provinces, ${summary.districts} districts, and ${summary.substations} grid substations.`);
  await seedSolar();
}

if (require.main === module) run().catch(() => {
  console.error('Seed failed. Check database access and data constraints; credentials are not logged.');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
module.exports = { upsertGeography };
