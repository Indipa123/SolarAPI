const request = require('supertest');
const app = require('../app');

test('liveness returns JSON with security headers and no framework disclosure', async () => {
  const response = await request(app).get('/health').expect(200).expect('Content-Type', /json/);
  expect(response.body.status).toBe('UP');
  expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  expect(response.headers['x-content-type-options']).toBe('nosniff');
  expect(response.headers['x-powered-by']).toBeUndefined();
});
test('readiness reports unavailable database', async () => {
  const response = await request(app).get('/ready').expect(503);
  expect(response.body.status).toBe('NOT_READY');
});
test('unknown routes use the error contract', async () => {
  const response = await request(app).get('/missing').expect(404);
  expect(response.body).toMatchObject({ code: 'NOT_FOUND', path: '/missing', details: null });
});
test('malformed JSON returns 400 without exposing parser internals', async () => {
  const response = await request(app).post('/missing').set('Content-Type', 'application/json').send('{bad').expect(400);
  expect(response.body.code).toBe('INVALID_JSON');
  expect(response.body).not.toHaveProperty('stack');
});
test('oversized bodies return the consistent error contract', async () => {
  const response = await request(app).post('/missing').send({ value: 'x'.repeat(110000) }).expect(413);
  expect(response.body.code).toBe('PAYLOAD_TOO_LARGE');
});
