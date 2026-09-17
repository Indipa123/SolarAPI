const connectDatabase = require('../src/config/database');
const errorHandler = require('../src/middleware/errorHandler');

test('missing database configuration fails with an actionable error', async () => {
  await expect(connectDatabase('')).rejects.toThrow('MONGODB_URI is required');
});
test('unexpected errors cannot leak credentials to clients', () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  errorHandler(new Error('mongodb://secret:password@host'), { originalUrl: '/test' }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'An unexpected error occurred.', details: null }));
});
