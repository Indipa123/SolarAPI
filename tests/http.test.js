process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters-long';
const request = require('supertest');
const app = require('../app');
const Province = require('../src/models/Province');
const { signUser, signDevice } = require('../src/config/auth');
const id = '507f1f77bcf86cd799439011';
const token = signUser({ _id: id, role: 'NATIONAL' });
const path = `/api/v1/provinces/${id}`;
beforeEach(() => jest.spyOn(Province, 'findById').mockReturnValue({ select: () => ({ lean: async () => ({ _id: id, name: 'Western', updatedAt: new Date('2026-09-01T00:00:00Z') }) }) }));
afterEach(() => jest.restoreAllMocks());
const get = () => request(app).get(path).set('Authorization', `Bearer ${token}`);

test('ETag, Last-Modified, private cache and empty 304 are correct', async () => {
  const first = await get().expect(200);
  expect(first.headers.etag).toMatch(/^"[a-f0-9]{64}"$/);
  expect(first.headers['last-modified']).toBe('Tue, 01 Sep 2026 00:00:00 GMT');
  expect(first.headers['cache-control']).toBe('private, no-cache');
  expect(first.headers.vary).toContain('Authorization');
  const second = await get().set('If-None-Match', first.headers.etag).expect(304);
  expect(second.text).toBe('');
  expect(second.headers.etag).toBe(first.headers.etag);
});
test('weak/list validators match; unmatched validator returns content', async () => {
  const first = await get();
  await get().set('If-None-Match', `"other", W/${first.headers.etag}`).expect(304);
  await get().set('If-None-Match', '"other"').expect(200);
});
test('cached data cannot bypass authentication or user type checks', async () => {
  const first = await get();
  await request(app).get(path).set('If-None-Match', first.headers.etag).expect(401);
  await request(app).get(path).set('Authorization', `Bearer ${signDevice(id)}`).set('If-None-Match', first.headers.etag).expect(403);
});
test('Accept negotiation honors quality and rejects XML-only', async () => {
  await get().set('Accept', 'application/xml').expect(406);
  await get().set('Accept', 'application/json;q=0, */*;q=1').expect(406);
  await get().set('Accept', 'application/json, application/xml;q=0.9').expect(200);
});
test('non-JSON upload rejected with 415', async () => {
  await request(app).post('/api/v1/auth/login').set('Content-Type', 'text/plain').send('hello').expect(415);
});
test('Swagger and the OpenAPI contract are publicly readable', async () => {
  await request(app).get('/api-docs/').expect(200).expect('Content-Type', /html/);
  const response = await request(app).get('/openapi.json').expect(200);
  expect(response.body.paths['/api/v1/readings']).toBeDefined();
});
test('complete OpenAPI contract validates', () => {
  const { execFileSync } = require('node:child_process');
  expect(execFileSync(process.execPath, ['scripts/validateOpenapi.js'], { encoding: 'utf8' })).toContain('contract is valid');
});
