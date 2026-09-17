process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters-long';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../app');
const User = require('../src/models/User');

const installationId = '507f1f77bcf86cd799439011';
const otherInstallationId = '507f1f77bcf86cd799439012';
const userToken = jwt.sign({ type: 'USER', role: 'NATIONAL' }, process.env.JWT_SECRET, { subject: '507f1f77bcf86cd799439010', algorithm: 'HS256' });
const deviceToken = jwt.sign({ type: 'DEVICE', installationId, scope: 'reading:write' }, process.env.JWT_SECRET, { subject: installationId, algorithm: 'HS256' });
afterEach(() => jest.restoreAllMocks());

test('a protected resource requires a bearer token', async () => {
  const response = await request(app).get(`/api/v1/installations/${installationId}`).expect(401);
  expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
});
test('a device cannot read user resources', async () => {
  await request(app).get(`/api/v1/installations/${installationId}`).set('Authorization', `Bearer ${deviceToken}`).expect(403);
});
test('a user cannot submit a device reading', async () => {
  await request(app).post(`/api/v1/installations/${installationId}/readings`).set('Authorization', `Bearer ${userToken}`).send({}).expect(403);
});
test('a device cannot submit a reading for another installation', async () => {
  const response = await request(app).post(`/api/v1/installations/${otherInstallationId}/readings`).set('Authorization', `Bearer ${deviceToken}`).send({}).expect(403);
  expect(response.body.code).toBe('INSTALLATION_SCOPE_VIOLATION');
});
test('a scoped device receives validation errors before any database write', async () => {
  const response = await request(app).post(`/api/v1/installations/${installationId}/readings`).set('Authorization', `Bearer ${deviceToken}`).send({ powerKw: -1 }).expect(400);
  expect(response.body.code).toBe('VALIDATION_ERROR');
});
test('login returns a signed user token after checking the bcrypt hash', async () => {
  const passwordHash = await bcrypt.hash('correct horse battery staple', 4);
  const user = { _id: installationId, name: 'National Officer', email: 'national@slsea.demo', passwordHash, role: 'NATIONAL' };
  jest.spyOn(User, 'findOne').mockReturnValue({ select: async () => user });
  const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'correct horse battery staple' }).expect(200);
  expect(response.headers['cache-control']).toContain('no-store');
  expect(jwt.verify(response.body.accessToken, process.env.JWT_SECRET).role).toBe('NATIONAL');
  expect(response.body.user).not.toHaveProperty('passwordHash');
});
test('login conceals whether an email account exists', async () => {
  jest.spyOn(User, 'findOne').mockReturnValue({ select: async () => null });
  const response = await request(app).post('/api/v1/auth/login').send({ email: 'absent@slsea.demo', password: 'any password' }).expect(401);
  expect(response.body.code).toBe('INVALID_CREDENTIALS');
});

test.each([
  { type: 'USER', role: 'PROVINCE' },
  { type: 'USER', role: 'DISTRICT', districtId: 'invalid' },
  { type: 'DEVICE', installationId: otherInstallationId, scope: 'reading:write' },
])('signed token with invalid jurisdiction claims is rejected: %j', async (claims) => {
  const token = jwt.sign(claims, process.env.JWT_SECRET, { subject: installationId });
  await request(app).get('/api/v1/provinces').set('Authorization', `Bearer ${token}`).expect(401);
});

test('expired access tokens are rejected', async () => {
  const token = jwt.sign({ type: 'USER', role: 'NATIONAL' }, process.env.JWT_SECRET, { subject: installationId, expiresIn: -1 });
  await request(app).get('/api/v1/provinces').set('Authorization', `Bearer ${token}`).expect(401);
});

test.each([{ powerKw: '1' }, { voltage: [230] }, { timestamp: '2026-09-13' }, { timestamp: '2026-09-13T12:00:00' }])('ambiguous reading payload is rejected: %j', async (override) => {
  const payload = { timestamp: '2026-09-13T12:00:00Z', powerKw: 1, energyKwh: 10, voltage: 230, ...override };
  await request(app).post(`/api/v1/installations/${installationId}/readings`).set('Authorization', `Bearer ${deviceToken}`).send(payload).expect(400);
});
