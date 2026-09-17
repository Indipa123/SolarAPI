require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const connect = require('../src/config/database');
const { login, client } = require('./authClient');
const District = require('../src/models/District');
const Station = require('../src/models/GridSubstation');
const Installation = require('../src/models/SolarInstallation');

async function verify() {
  await connect();
  const national = client(await login('national.officer@slsea.demo'));
  const district = client(await login('gampaha.officer@slsea.demo'));
  const own = await District.findOne({ code: 'GA' }).lean();
  const other = await District.findOne({ code: 'KD' }).lean();
  const station = await Station.findOne({ district: own._id }).lean();
  const installation = await Installation.findOne({ substation: station._id, meterId: /^DEMO-/ }).lean();
  const filtered = await national.get('/api/v1/readings').query({ districtId: own._id.toString(), installationId: installation._id.toString(), pageSize: 2, sort: 'timestamp:asc', from: '2026-09-06T00:00:00Z', to: '2026-09-06T23:59:59Z' }).expect(200);
  assert.equal(filtered.body.data.length, 2);
  assert(filtered.body.data.every((r) => r.installation === installation._id.toString()));
  const next = await national.get(filtered.body.links.next).expect(200);
  assert.notEqual(next.body.data[0]._id, filtered.body.data[0]._id);
  await district.get('/api/v1/readings').query({ districtId: other._id.toString() }).expect(403);
  await district.get(`/api/v1/districts/${other._id}/generation-summary`).expect(403);
  const summary = await district.get(`/api/v1/districts/${own._id}/generation-summary?date=2026-09-06`).expect(200);
  assert.equal(summary.body.installationCount, 8);
  assert.equal(summary.body.energyCoveredInstallations, 8);
  assert(summary.body.todayEnergyKwh > 0);
  const first = await national.get(`/api/v1/installations/${installation._id}`).expect(200);
  assert(first.headers.etag && first.headers['last-modified']);
  const unchanged = await national.get(`/api/v1/installations/${installation._id}`).set('If-None-Match', first.headers.etag).expect(304);
  assert.equal(unchanged.text, '');
  await national.get('/api/v1/readings').set('Accept', 'application/xml').expect(406);
  await request(app).get('/api-docs/').expect(200);
  await request(app).get('/openapi.json').expect(200);
  console.log('Verified regional filters, jurisdiction rejection, pagination, historical summary, ETag/304, Last-Modified, 406 and Swagger against Atlas.');
}
verify().catch((error) => {
  console.error(error.name === 'AssertionError' ? error.message : 'Feature verification failed; check Atlas access, demo-user password, and application logs.');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
