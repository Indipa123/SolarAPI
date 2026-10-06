process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters-long';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../src/models/User');
const Station = require('../src/models/GridSubstation');
const District = require('../src/models/District');
const { tag } = require('../src/utils/entityTag');

const stationId = '507f1f77bcf86cd799439011';
const districtId = '507f1f77bcf86cd799439012';
const destinationId = '507f1f77bcf86cd799439013';
const userId = '507f1f77bcf86cd799439014';
const token = role => jwt.sign({ type: 'USER', role, permissions: ['installation:manage'],
  ...(role === 'PROVINCE' ? { provinceId: districtId } : {}) }, process.env.JWT_SECRET,
{ subject: userId, algorithm: 'HS256' });
const current = { _id: stationId, name: 'Colombo Grid Substation', code: 'GS-CO', district: districtId,
  latitude: 6.9271, longitude: 79.8612, updatedAt: new Date('2026-10-05T12:00:00Z') };
const path = `/api/v1/substations/${stationId}`;

afterEach(() => jest.restoreAllMocks());
function allowAdmin() { jest.spyOn(User, 'exists').mockResolvedValue({ _id: userId }); }
function readCurrent() { jest.spyOn(Station, 'findById').mockReturnValue({ select: () => ({ lean: async () => current }) }); }

test('only a provisioned national administrator can relocate a substation', async () => {
  await request(app).patch(path).set('If-Match', tag(current)).send({ latitude: 7 }).expect(401);
  await request(app).patch(path).set('Authorization', `Bearer ${token('PROVINCE')}`)
    .set('If-Match', tag(current)).send({ latitude: 7 }).expect(403);
  jest.spyOn(User, 'exists').mockResolvedValue(null);
  await request(app).patch(path).set('Authorization', `Bearer ${token('NATIONAL')}`)
    .set('If-Match', tag(current)).send({ latitude: 7 }).expect(403);
});

test('substation changes require the current GET ETag', async () => {
  allowAdmin(); readCurrent();
  await request(app).patch(path).set('Authorization', `Bearer ${token('NATIONAL')}`)
    .send({ latitude: 7 }).expect(428);
  await request(app).patch(path).set('Authorization', `Bearer ${token('NATIONAL')}`)
    .set('If-Match', '"stale"').send({ latitude: 7 }).expect(412);
});

test('the ETag returned by substation GET is accepted by PATCH', async () => {
  allowAdmin();
  jest.spyOn(Station, 'findById').mockReturnValue({
    populate: () => ({ lean: async () => ({ ...current, district: { _id: districtId, province: districtId } }) }),
    select: () => ({ lean: async () => current }),
  });
  jest.spyOn(Station, 'findOneAndUpdate').mockReturnValue({ select: () => ({ lean: async () => ({
    ...current, latitude: 7, updatedAt: new Date('2026-10-05T12:05:00Z'),
  }) }) });
  const initial = await request(app).get(path).set('Authorization', `Bearer ${token('NATIONAL')}`).expect(200);
  expect(initial.headers.etag).toBe(tag(current));
  await request(app).patch(path).set('Authorization', `Bearer ${token('NATIONAL')}`)
    .set('If-Match', initial.headers.etag).send({ latitude: 7 }).expect(200);
});

test('moving district updates the substation atomically and retains installation references', async () => {
  allowAdmin(); readCurrent();
  jest.spyOn(District, 'exists').mockResolvedValue({ _id: destinationId });
  jest.spyOn(Station, 'findOneAndUpdate').mockReturnValue({ select: () => ({ lean: async () => ({
    ...current, district: destinationId, latitude: 7.1, updatedAt: new Date('2026-10-05T12:05:00Z'),
  }) }) });
  const response = await request(app).patch(path).set('Authorization', `Bearer ${token('NATIONAL')}`)
    .set('If-Match', tag(current)).send({ district: destinationId, latitude: 7.1 }).expect(200);
  expect(response.body.district).toBe(destinationId);
  expect(response.headers.etag).toBe(tag({ ...current, district: destinationId, latitude: 7.1,
    updatedAt: new Date('2026-10-05T12:05:00Z') }));
  expect(Station.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({
    _id: stationId, district: districtId, updatedAt: current.updatedAt,
  }), { $set: { district: destinationId, latitude: 7.1 } }, { new: true, runValidators: true });
});

test('invalid coordinates and a missing destination district are rejected', async () => {
  allowAdmin(); readCurrent();
  await request(app).patch(path).set('Authorization', `Bearer ${token('NATIONAL')}`)
    .set('If-Match', tag(current)).send({ latitude: 91 }).expect(400);
  jest.spyOn(District, 'exists').mockResolvedValue(null);
  await request(app).patch(path).set('Authorization', `Bearer ${token('NATIONAL')}`)
    .set('If-Match', tag(current)).send({ district: destinationId }).expect(404);
});

test('a concurrent change fails the precondition instead of overwriting it', async () => {
  allowAdmin(); readCurrent();
  jest.spyOn(Station, 'findOneAndUpdate').mockReturnValue({ select: () => ({ lean: async () => null }) });
  await request(app).patch(path).set('Authorization', `Bearer ${token('NATIONAL')}`)
    .set('If-Match', tag(current)).send({ latitude: 7 }).expect(412);
});
