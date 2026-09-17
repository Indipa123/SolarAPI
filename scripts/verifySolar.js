// Read-only integration check against the configured, seeded database.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const connectDatabase = require('../src/config/database');
const Installation = require('../src/models/SolarInstallation');
const Reading = require('../src/models/GenerationReading');
const { START, READING_COUNT } = require('../src/seed/solar');
const { login, client } = require('./authClient');

async function verify() {
  await connectDatabase();
  const api = client(await login('national.officer@slsea.demo'));
  const items = await Installation.find({ meterId: /^DEMO-GS-/ }).sort({ meterId: 1 }).lean();
  assert.equal(items.length, 200);
  const counts = await Reading.aggregate([
    { $match: { installation: { $in: items.map((item) => item._id) }, timestamp: { $gte: START, $lt: new Date(START.getTime() + 7 * 86400000) } } },
    { $group: { _id: '$installation', count: { $sum: 1 } } },
  ]);
  assert.equal(counts.length, 200);
  assert(counts.every((item) => item.count === READING_COUNT));
  const item = items[0];
  const base = `/api/v1/installations/${item._id}`;
  await api.get(base).expect(200);
  const list = await api.get(`/api/v1/substations/${item.substation}/installations?pageSize=3`).expect(200);
  assert.equal(list.body.data.length, 3);
  assert.equal(list.body.pagination.totalCount, 8);
  const overview = await api.get(`${base}/overview`).expect(200);
  assert(overview.body.location.province);
  assert(overview.body.location.district);
  const first = await api.get(`${base}/readings`).query({ pageSize: 3, sort: 'timestamp:asc', from: START.toISOString(), to: new Date(START.getTime() + 7 * 86400000 - 1).toISOString() }).expect(200);
  assert.equal(first.body.pagination.totalCount, 672);
  assert.equal(first.body.data[0].timestamp, START.toISOString());
  const next = await api.get(first.body.links.next).expect(200);
  assert(new Date(next.body.data[0].timestamp) > new Date(first.body.data[2].timestamp));
  const latest = await api.get(`${base}/latest-reading`).expect(200);
  const descending = await api.get(`${base}/readings?pageSize=1`).expect(200);
  assert.equal(descending.body.data[0]._id, latest.body._id);
  await api.get(`${base}/readings/${latest.body._id}`).expect(200);
  await api.get(`/api/v1/installations/${items[1]._id}/readings/${latest.body._id}`).expect(404);
  const filtered = await api.get(`${base}/readings`).query({ from: first.body.data[0].timestamp, to: first.body.data[2].timestamp }).expect(200);
  assert.equal(filtered.body.pagination.totalCount, 3);
  await api.get(`${base}/readings?from=invalid`).expect(400);
  const indexes = await Reading.collection.indexes();
  assert(indexes.some((index) => index.unique && index.key.installation === 1 && index.key.timestamp === -1));
  console.log('Verified 200 installations, 134400 readings, database index, overview, pagination, sorting, date filters, latest reading, and cross-installation 404.');
  console.log(`Example installation: ${base}`);
}

verify().catch((error) => {
  console.error(error.name === 'AssertionError' ? error.message : 'Integration verification failed; check database connectivity and seed data.');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
