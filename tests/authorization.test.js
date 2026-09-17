process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters-long';
const request = require('supertest');
const app = require('../app');
const Installation = require('../src/models/SolarInstallation');
const { signUser } = require('../src/config/auth');
const id = '507f1f77bcf86cd799439011';
const districtId = '507f1f77bcf86cd799439012';
const provinceId = '507f1f77bcf86cd799439013';
afterEach(() => jest.restoreAllMocks());

test.each([
  ['DISTRICT', districtId, true], ['DISTRICT', id, false],
  ['PROVINCE', provinceId, true], ['PROVINCE', id, false],
])('%s scope %s permits installation: %s', async (role, scope, allowed) => {
  const token = signUser({ _id: id, role, district: scope, province: scope });
  jest.spyOn(Installation, 'findById')
    .mockReturnValueOnce({ populate: () => ({ lean: async () => ({ substation: { district: { _id: districtId, province: provinceId } } }) }) })
    .mockReturnValueOnce({ select: () => ({ lean: async () => ({ _id: id }) }) });
  await request(app).get(`/api/v1/installations/${id}`).set('Authorization', `Bearer ${token}`).expect(allowed ? 200 : 403);
});
