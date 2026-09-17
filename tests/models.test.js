const { Types } = require('mongoose');
const Province = require('../src/models/Province');
const District = require('../src/models/District');
const GridSubstation = require('../src/models/GridSubstation');
const SolarInstallation = require('../src/models/SolarInstallation');
const GenerationReading = require('../src/models/GenerationReading');
const User = require('../src/models/User');
const id = () => new Types.ObjectId();

test('geographic records normalize names and codes', async () => {
  const province = new Province({ name: ' Western ', code: 'wp' });
  await expect(province.validate()).resolves.toBeUndefined();
  expect(province.name).toBe('Western');
  expect(province.code).toBe('WP');
});
test.each([District, GridSubstation])('%s requires its geographic parent', async (Model) => {
  await expect(new Model({ name: 'Example', code: 'EX' }).validate()).rejects.toThrow();
});
test('installation rejects invalid capacity and coordinates', async () => {
  const installation = new SolarInstallation({ meterId: 'MTR-001', substation: id(), capacityKw: 0, latitude: 91 });
  await expect(installation.validate()).rejects.toThrow();
  installation.capacityKw = 5;
  installation.latitude = 7;
  await expect(installation.validate()).resolves.toBeUndefined();
});
test.each([-1, Infinity, NaN])('reading rejects invalid measurement %s', async (powerKw) => {
  const reading = new GenerationReading({ installation: id(), timestamp: new Date(), powerKw, energyKwh: 2, voltage: 230 });
  await expect(reading.validate()).rejects.toThrow();
});
test('reading requires a valid timestamp and installation', async () => {
  await expect(new GenerationReading({ timestamp: 'invalid', powerKw: 1, energyKwh: 2, voltage: 230 }).validate()).rejects.toThrow();
});
test('reading declares a unique installation and timestamp index', () => {
  expect(GenerationReading.schema.indexes()).toEqual(expect.arrayContaining([
    [ { installation: 1, timestamp: -1 }, expect.objectContaining({ unique: true }) ],
  ]));
});
test.each(['PROVINCE', 'DISTRICT'])('%s user must specify a jurisdiction', async (role) => {
  await expect(new User({ name: 'Officer', email: 'officer@example.com', passwordHash: 'test-hash', role }).validate()).rejects.toThrow();
});
test('district user has one unambiguous scope and password is never serialized', async () => {
  const user = new User({ name: 'Officer', email: 'OFFICER@example.com', passwordHash: 'test-hash', role: 'DISTRICT', district: id() });
  await expect(user.validate()).resolves.toBeUndefined();
  expect(user.toJSON()).not.toHaveProperty('passwordHash');
  user.province = id();
  await expect(user.validate()).rejects.toThrow();
});
