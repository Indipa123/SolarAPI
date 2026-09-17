const request = require('supertest');
const app = require('../app');

async function login(email) {
  const response = await request(app).post('/api/v1/auth/login').send({ email, password: process.env.SEED_USER_PASSWORD }).expect(200);
  return response.body.accessToken;
}
function client(token) {
  return {
    get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  };
}
module.exports = { login, client };
