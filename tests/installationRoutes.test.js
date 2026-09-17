const request = require('supertest');
process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters-long';
const app = require('../app');
const jwt = require('jsonwebtoken');
const Installation = require('../src/models/SolarInstallation');
const Reading = require('../src/models/GenerationReading');
const id = '507f1f77bcf86cd799439011';
const token = jwt.sign({ type: 'USER', role: 'NATIONAL' }, process.env.JWT_SECRET, { subject: '507f1f77bcf86cd799439010', algorithm: 'HS256' });
const authorisedInstallation = { _id: id, substation: { district: { _id: '507f1f77bcf86cd799439013', province: '507f1f77bcf86cd799439014' } } };
const forAuthorisation = () => ({ populate: () => ({ lean: async () => authorisedInstallation }) });
afterEach(() => jest.restoreAllMocks());

test('malformed installation identifiers return 400 before querying MongoDB', async () => {
  await request(app).get('/api/v1/installations/invalid').set('Authorization', `Bearer ${token}`).expect(400);
});
test('missing installation returns 404', async () => {
  jest.spyOn(Installation, 'findById').mockReturnValueOnce(forAuthorisation()).mockReturnValueOnce({ select: () => ({ lean: async () => null }) });
  const response = await request(app).get(`/api/v1/installations/${id}`).set('Authorization', `Bearer ${token}`).expect(404);
  expect(response.body.code).toBe('INSTALLATION_NOT_FOUND');
});
test('reading from another installation cannot be retrieved through this installation', async () => {
  jest.spyOn(Installation, 'findById').mockReturnValueOnce(forAuthorisation()).mockReturnValueOnce({ select: () => ({ lean: async () => ({ _id: id }) }) });
  const find = jest.spyOn(Reading, 'findOne').mockReturnValue({ sort: () => ({ select: () => ({ lean: async () => null }) }) });
  const readingId = '507f1f77bcf86cd799439012';
  await request(app).get(`/api/v1/installations/${id}/readings/${readingId}`).set('Authorization', `Bearer ${token}`).expect(404);
  expect(find).toHaveBeenCalledWith({ installation: id, _id: readingId });
});
test('invalid historical filters return 400', async () => {
  jest.spyOn(Installation, 'findById').mockReturnValue(forAuthorisation());
  await request(app).get(`/api/v1/installations/${id}/readings?pageSize=101`).set('Authorization', `Bearer ${token}`).expect(400);
});
