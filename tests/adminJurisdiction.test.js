process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters-long';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../src/models/User');
const Installation = require('../src/models/SolarInstallation');
const Station = require('../src/models/GridSubstation');
const admin = require('../src/services/installationAdmin');

const id = '507f1f77bcf86cd799439011';
const stationId = '507f1f77bcf86cd799439012';
const userId = '507f1f77bcf86cd799439013';
const districtId = '507f1f77bcf86cd799439014';
const provinceId = '507f1f77bcf86cd799439015';
const outsideId = '507f1f77bcf86cd799439016';
const current = { _id: id, meterId: 'TEST-METER', substation: stationId, capacityKw: 5, status: 'ACTIVE', revision: 1 };
const path = `/api/v1/installations/${id}`;
function token(role) {
  return jwt.sign({ type: 'USER', role, permissions: ['installation:manage'],
    ...(role === 'DISTRICT' ? { districtId } : role === 'PROVINCE' ? { provinceId } : {}) },
  process.env.JWT_SECRET, { subject: userId, algorithm: 'HS256' });
}
function region(inside, role) {
  return { _id: !inside && role === 'DISTRICT' ? outsideId : districtId,
    province: !inside && role === 'PROVINCE' ? outsideId : provinceId };
}
function installationScope(inside, role) {
  jest.spyOn(Installation, 'findById').mockReturnValue({
    populate: () => ({ lean: async () => ({ ...current, substation: { district: region(inside, role) } }) }),
    select: () => ({ lean: async () => current }),
  });
}
function destinationScope(inside, role) {
  jest.spyOn(Station, 'findById').mockReturnValue({ populate: () => ({ lean: async () => ({ district: region(inside, role) }) }) });
}
beforeEach(() => jest.spyOn(User, 'exists').mockResolvedValue({ _id: userId }));
afterEach(() => jest.restoreAllMocks());

describe.each(['DISTRICT', 'PROVINCE'])('%s installation administrator', role => {
  test.each(['put', 'patch', 'delete'])('cannot %s an installation outside the assigned jurisdiction', async method => {
    installationScope(false, role);
    const mutate = jest.spyOn(admin, 'mutate');
    const response = await request(app)[method](path).set('Authorization', `Bearer ${token(role)}`)
      .set('If-Match', '"current"').send({ status: 'MAINTENANCE' }).expect(403);
    expect(response.body.code).toBe('JURISDICTION_FORBIDDEN');
    expect(mutate).not.toHaveBeenCalled();
  });

  test.each(['put', 'patch', 'delete'])('can %s an installation inside the assigned jurisdiction', async method => {
    installationScope(true, role);
    jest.spyOn(admin, 'mutate').mockResolvedValue(current);
    await request(app)[method](path).set('Authorization', `Bearer ${token(role)}`)
      .set('If-Match', '"current"').send({ status: 'MAINTENANCE' }).expect(method === 'delete' ? 204 : 200);
    expect(admin.mutate).toHaveBeenCalled();
  });

  test.each(['put', 'patch'])('cannot use %s to move an installation outside the assigned jurisdiction', async method => {
    installationScope(true, role); destinationScope(false, role);
    const mutate = jest.spyOn(admin, 'mutate');
    await request(app)[method](path).set('Authorization', `Bearer ${token(role)}`)
      .set('If-Match', '"current"').send({ substation: stationId }).expect(403);
    expect(mutate).not.toHaveBeenCalled();
  });

  test('can reassign an installation to a substation within the assigned jurisdiction', async () => {
    installationScope(true, role); destinationScope(true, role);
    jest.spyOn(admin, 'mutate').mockResolvedValue(current);
    await request(app).patch(path).set('Authorization', `Bearer ${token(role)}`)
      .set('If-Match', '"current"').send({ substation: stationId }).expect(200);
  });

  test.each([true, false])('creation checks destination scope (inside=%s)', async inside => {
    destinationScope(inside, role);
    const create = jest.spyOn(admin, 'create').mockResolvedValue(current);
    await request(app).post('/api/v1/installations').set('Authorization', `Bearer ${token(role)}`)
      .send({ meterId: 'TEST-METER', substation: stationId, capacityKw: 5, status: 'ACTIVE' }).expect(inside ? 201 : 403);
    expect(create).toHaveBeenCalledTimes(inside ? 1 : 0);
  });

  test.each([true, false])('device credential rotation checks installation scope (inside=%s)', async inside => {
    installationScope(inside, role);
    const update = jest.spyOn(Installation, 'updateOne').mockResolvedValue({ matchedCount: 1 });
    const response = await request(app).post(`${path}/device-credentials`)
      .set('Authorization', `Bearer ${token(role)}`).expect(inside ? 201 : 403);
    expect(update).toHaveBeenCalledTimes(inside ? 1 : 0);
    if (!inside) expect(response.body).not.toHaveProperty('apiKey');
  });
});

test('national administrators can create and reassign across jurisdictions', async () => {
  jest.spyOn(admin, 'create').mockResolvedValue(current);
  jest.spyOn(admin, 'mutate').mockResolvedValue(current);
  await request(app).post('/api/v1/installations').set('Authorization', `Bearer ${token('NATIONAL')}`)
    .send({ meterId: 'TEST-METER', substation: stationId, capacityKw: 5, status: 'ACTIVE' }).expect(201);
  await request(app).patch(path).set('Authorization', `Bearer ${token('NATIONAL')}`)
    .set('If-Match', '"current"').send({ substation: stationId }).expect(200);
});

test('a broken location hierarchy fails closed for regional administration', async () => {
  jest.spyOn(Installation, 'findById').mockReturnValue({ populate: () => ({ lean: async () => ({ ...current, substation: null }) }) });
  const mutate = jest.spyOn(admin, 'mutate');
  await request(app).patch(path).set('Authorization', `Bearer ${token('DISTRICT')}`)
    .set('If-Match', '"current"').send({ status: 'ACTIVE' }).expect(403);
  expect(mutate).not.toHaveBeenCalled();
});
