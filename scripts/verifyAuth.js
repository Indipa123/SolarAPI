// Writes one repeatable demonstration reading outside the seven-day seed window.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const connectDatabase = require('../src/config/database');
const District = require('../src/models/District');
const Station = require('../src/models/GridSubstation');
const Installation = require('../src/models/SolarInstallation');
const Reading = require('../src/models/GenerationReading');
const { signDevice } = require('../src/config/auth');
const { login, client } = require('./authClient');

async function verify() {
  await connectDatabase();
  const national = client(await login('national.officer@slsea.demo'));
  const province = client(await login('western.officer@slsea.demo'));
  const district = client(await login('gampaha.officer@slsea.demo'));
  const ownDistrict = await District.findOne({ code: 'GA' }).lean();
  const otherDistrict = await District.findOne({ code: 'KD' }).lean();
  assert(ownDistrict && otherDistrict, 'Geography seed is required.');
  const station = await Station.findOne({ code: 'GS-GA' }).lean();
  const item = await Installation.findOne({ substation: station._id, meterId: /^DEMO-/ }).sort({ meterId: 1 }).lean();
  const other = await Installation.findOne({ meterId: /^DEMO-/, substation: { $ne: station._id } }).lean();
  assert(item && other, 'Solar seed is required.');
  const base = `/api/v1/installations/${item._id}`;
  const provinces = await national.get('/api/v1/provinces').expect(200);
  assert.equal(provinces.body.data.length, 9);
  const scoped = await province.get('/api/v1/provinces').expect(200);
  assert.equal(scoped.body.data.length, 1);
  assert.equal(scoped.body.data[0]._id, ownDistrict.province.toString());
  await province.get(`/api/v1/districts/${ownDistrict._id}`).expect(200);
  await province.get(`/api/v1/districts/${otherDistrict._id}`).expect(403);
  await district.get(`/api/v1/districts/${ownDistrict._id}`).expect(200);
  await district.get(`/api/v1/districts/${otherDistrict._id}`).expect(403);
  await district.get(base).expect(200);
  await district.get(`/api/v1/installations/${other._id}`).expect(403);
  await request(app).get(base).expect(401);
  await request(app).get(base).set('Authorization', 'Bearer invalid').expect(401);
  await request(app).post('/api/v1/auth/login').send({ email: 'national.officer@slsea.demo', password: 'intentionally-wrong' }).expect(401);
  const device = client(signDevice(item._id));
  await device.get(base).expect(403);
  const timestamp = new Date('2026-09-13T00:00:00+05:30');
  const lastSeeded = await Reading.findOne({ installation: item._id, timestamp: { $lt: timestamp } }).sort({ timestamp: -1 }).lean();
  assert(lastSeeded);
  const payload = { timestamp: timestamp.toISOString(), powerKw: 0, energyKwh: lastSeeded.energyKwh, voltage: 230 };
  const before = await Reading.countDocuments({ installation: item._id });
  await national.post(`${base}/readings`).send(payload).expect(403);
  await device.post(`/api/v1/installations/${other._id}/readings`).send(payload).expect(403);
  await device.post(`${base}/readings`).send({ ...payload, powerKw: -1 }).expect(400);
  assert.equal(await Reading.countDocuments({ installation: item._id }), before);
  const existing = await Reading.findOne({ installation: item._id, timestamp }).lean();
  const created = await device.post(`${base}/readings`).send(payload).expect(existing ? 409 : 201);
  if (!existing) {
    assert(created.headers.location);
    const fetched = await national.get(created.headers.location).expect(200);
    assert.equal(fetched.body._id, created.body.id);
  }
  await device.post(`${base}/readings`).send(payload).expect(409);
  assert.equal(await Reading.countDocuments({ installation: item._id }), before + (existing ? 0 : 1));
  console.log('Verified real login, national/province/district scope, 401/403/400 handling, device ingestion, Location retrieval, and duplicate protection.');
  console.log(existing ? 'Existing demonstration reading preserved.' : 'One demonstration reading retained outside the seven-day seed window.');
}

verify().catch((error) => {
  console.error(error.name === 'AssertionError' ? error.message : 'Authentication verification failed. Check database access, .env configuration and demo users.');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
