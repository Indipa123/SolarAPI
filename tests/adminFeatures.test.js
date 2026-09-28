process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters-long';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Installation = require('../src/models/SolarInstallation');
const User = require('../src/models/User');
const Station = require('../src/models/GridSubstation');
const Reading = require('../src/models/GenerationReading');
const bcrypt = require('bcryptjs');
const id = '507f1f77bcf86cd799439011';
const stationId = '507f1f77bcf86cd799439012';
const userId = '507f1f77bcf86cd799439013';
const adminToken = jwt.sign({ type: 'USER', role: 'NATIONAL', permissions: ['installation:manage'] }, process.env.JWT_SECRET, { subject: userId, algorithm: 'HS256' });
const nationalToken = jwt.sign({ type: 'USER', role: 'NATIONAL' }, process.env.JWT_SECRET, { subject: userId, algorithm: 'HS256' });
const current = { _id: id, meterId: 'METER-001', inverterId: 'INV-001', substation: stationId, capacityKw: 5, status: 'ACTIVE', revision: 2, updatedAt: new Date('2026-09-20T00:00:00Z') };
const tag = `"installation-${id}-v2"`;
afterEach(() => jest.restoreAllMocks());
function allowAdmin() { jest.spyOn(User, 'exists').mockResolvedValue({ _id: userId }); }
function currentInstallation() { jest.spyOn(Installation, 'findById').mockReturnValue({ populate: () => ({ lean: async () => ({ substation: { district: { _id: stationId, province: stationId } } }) }), select: () => ({ lean: async () => current }) }); }

test('ordinary national users cannot administer installations', async () => {
  await request(app).delete(`/api/v1/installations/${id}`).set('Authorization', `Bearer ${nationalToken}`).set('If-Match', tag).expect(403);
});

test('stale If-Match returns 412 before update', async () => {
  allowAdmin(); currentInstallation();
  await request(app).patch(`/api/v1/installations/${id}`).set('Authorization', `Bearer ${adminToken}`).set('If-Match', '"old"').send({ status: 'MAINTENANCE' }).expect(412);
});

test('missing If-Match returns 428', async () => {
  allowAdmin();
  await request(app).patch(`/api/v1/installations/${id}`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'MAINTENANCE' }).expect(428);
});

test('matching If-Match performs an atomic patch and returns a new tag', async () => {
  allowAdmin(); currentInstallation();
  jest.spyOn(Installation, 'findOneAndUpdate').mockReturnValue({ select: () => ({ lean: async () => ({ ...current, revision: 3, status: 'MAINTENANCE' }) }) });
  const response = await request(app).patch(`/api/v1/installations/${id}`).set('Authorization', `Bearer ${adminToken}`).set('If-Match', tag).send({ status: 'MAINTENANCE' }).expect(200);
  expect(response.headers.etag).toBe(`"installation-${id}-v3"`);
  expect(Installation.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ _id: id, revision: 2 }), expect.objectContaining({ $inc: { revision: 1 } }), expect.anything());
});

test('device credential exchange creates a token only when the stored hash matches', async () => {
  const apiKey = 'a'.repeat(64);
  const deviceKeyHash = await bcrypt.hash(apiKey, 4);
  jest.spyOn(Installation, 'findOne').mockReturnValue({ select: () => ({ lean: async () => ({ _id: id, meterId: 'METER-001', deviceKeyHash }) }) });
  const response = await request(app).post('/api/v1/auth/device-token').send({ meterId: 'METER-001', apiKey }).expect(200);
  expect(response.body.installationId).toBe(id);
  await request(app).post('/api/v1/auth/device-token').send({ meterId: 'METER-001', apiKey: 'b'.repeat(64) }).expect(401);
});

test('device credential provisioning accepts a POST without a request body', async () => {
  allowAdmin(); currentInstallation();
  jest.spyOn(Installation, 'updateOne').mockResolvedValue({ matchedCount: 1 });
  const response = await request(app).post(`/api/v1/installations/${id}/device-credentials`)
    .set('Authorization', `Bearer ${adminToken}`).expect(201);
  expect(response.body).toEqual(expect.objectContaining({ installationId: id, meterId: 'METER-001' }));
  expect(response.body.apiKey).toMatch(/^[a-f0-9]{64}$/);
});

test('latest reading is an operational representation with freshness fields', async () => {
  currentInstallation();
  jest.spyOn(Reading, 'findOne').mockReturnValue({ sort: () => ({ select: () => ({ lean: async () => ({ _id: stationId, installation: id, timestamp: new Date(Date.now() - 60000), powerKw: 4, energyKwh: 100, voltage: 230 }) }) }) });
  const response = await request(app).get(`/api/v1/installations/${id}/latest-reading`).set('Authorization', `Bearer ${nationalToken}`).expect(200);
  expect(response.body).toEqual(expect.objectContaining({ installationId: id, isStale: false, freshnessThresholdSeconds: 1800 }));
  expect(response.body.reading._id).toBe(stationId);
});

test('district user can retrieve parent province but sees only assigned district', async () => {
  const districtId = '507f1f77bcf86cd799439014';
  const provinceId = '507f1f77bcf86cd799439015';
  const token = jwt.sign({ type: 'USER', role: 'DISTRICT', districtId }, process.env.JWT_SECRET, { subject: userId, algorithm: 'HS256' });
  const District = require('../src/models/District');
  const Province = require('../src/models/Province');
  jest.spyOn(District, 'findById').mockReturnValue({ select: () => ({ lean: async () => ({ province: provinceId }) }) });
  jest.spyOn(Province, 'findById').mockReturnValue({ select: () => ({ lean: async () => ({ _id: provinceId, name: 'Western' }) }) });
  jest.spyOn(District, 'find').mockReturnValue({ select: () => ({ sort: () => ({ lean: async () => [{ _id: districtId, province: provinceId }] }) }) });
  await request(app).get(`/api/v1/provinces/${provinceId}`).set('Authorization', `Bearer ${token}`).expect(200);
  const response = await request(app).get(`/api/v1/provinces/${provinceId}/districts`).set('Authorization', `Bearer ${token}`).expect(200);
  expect(District.find).toHaveBeenLastCalledWith({ province: provinceId, _id: districtId });
  expect(response.body.data).toHaveLength(1);
});
