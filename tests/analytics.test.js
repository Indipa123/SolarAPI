const { dayWindow, summarize, scopedInstallations, readings } = require('../src/services/analyticsService');
const District = require('../src/models/District');
const Station = require('../src/models/GridSubstation');
const Installation = require('../src/models/SolarInstallation');
const Reading = require('../src/models/GenerationReading');
const own = '507f1f77bcf86cd799439011';
const other = '507f1f77bcf86cd799439012';
const province = '507f1f77bcf86cd799439013';
const query = (value) => ({ select: () => ({ lean: async () => value }), lean: async () => value });
afterEach(() => jest.restoreAllMocks());

test('local-day bounds use UTC+05:30 including UTC previous date', () => {
  const window = dayWindow('2026-09-06', new Date('2026-09-17T00:00:00Z'));
  expect(window.start.toISOString()).toBe('2026-09-05T18:30:00.000Z');
  expect(window.end.toISOString()).toBe('2026-09-06T18:29:59.999Z');
  expect(() => dayWindow('2026-02-30')).toThrow();
  expect(() => dayWindow('2099-01-01')).toThrow();
});
test('summary uses energy differences, excludes resets, and distinguishes stale power', () => {
  const window = dayWindow('2026-09-06', new Date('2026-09-17T00:00:00Z'));
  const result = summarize([{ status: 'ACTIVE' }, { status: 'INACTIVE' }, { status: 'ACTIVE' }], [
    { latest: { timestamp: new Date('2026-09-06T18:15:00Z'), powerKw: 3 }, samples: 96, firstEnergy: 1000, lastEnergy: 1020 },
    { latest: { timestamp: new Date('2026-09-06T10:00:00Z'), powerKw: 7 }, samples: 4, firstEnergy: 500, lastEnergy: 520, resetDetected: true },
  ], window);
  expect(result.todayEnergyKwh).toBe(20);
  expect(result.currentPowerKw).toBe(3);
  expect(result.missingOrStaleInstallations).toBe(2);
  expect(result.energyResetInstallations).toBe(1);
});
test('district scope is applied even with no explicit region filter', async () => {
  const districts = jest.spyOn(District, 'find').mockReturnValue(query([{ _id: own, province }]));
  const stations = jest.spyOn(Station, 'find').mockReturnValue(query([{ _id: own }]));
  const installations = jest.spyOn(Installation, 'find').mockReturnValue(query([]));
  await scopedInstallations({ role: 'DISTRICT', districtId: own }, {});
  expect(districts).toHaveBeenCalledWith({ _id: own });
  expect(stations).toHaveBeenCalledWith({ district: { $in: [own] } });
  expect(installations).toHaveBeenCalledWith({ substation: { $in: [own] } });
});
test('explicit district outside scope is rejected', async () => {
  jest.spyOn(District, 'find').mockReturnValue(query([{ _id: own, province }]));
  jest.spyOn(District, 'findById').mockReturnValue(query({ _id: other, province }));
  await expect(scopedInstallations({ role: 'DISTRICT', districtId: own }, { districtId: other })).rejects.toMatchObject({ status: 403 });
});
test('conflicting regional filters intersect rather than override scope', async () => {
  jest.spyOn(District, 'find').mockReturnValue(query([{ _id: own, province }, { _id: other, province }]));
  jest.spyOn(District, 'findById').mockReturnValue(query({ _id: own, province }));
  jest.spyOn(Station, 'findById').mockReturnValue(query({ _id: other, district: other }));
  const stationQuery = jest.spyOn(Station, 'find').mockReturnValue(query([]));
  jest.spyOn(Installation, 'find').mockReturnValue(query([]));
  const result = await scopedInstallations({ role: 'NATIONAL' }, { districtId: own, substationId: other });
  expect(stationQuery).toHaveBeenCalledWith({ district: { $in: [own] }, _id: other });
  expect(result).toEqual([]);
});
test('global reading sort includes ID tie-breaker and preserves scope/filter links', async () => {
  jest.spyOn(District, 'find').mockReturnValue(query([{ _id: own, province }]));
  jest.spyOn(Station, 'find').mockReturnValue(query([{ _id: own }]));
  jest.spyOn(Installation, 'find').mockReturnValue(query([{ _id: own }]));
  const sort = jest.fn().mockReturnValue({ skip: () => ({ limit: () => ({ lean: async () => [] }) }) });
  jest.spyOn(Reading, 'find').mockReturnValue({ select: () => ({ sort }) });
  jest.spyOn(Reading, 'countDocuments').mockResolvedValue(4);
  const result = await readings({ role: 'DISTRICT', districtId: own }, { pageSize: '2', sort: 'timestamp:asc' }, '/api/v1/readings');
  expect(sort).toHaveBeenCalledWith({ timestamp: 1, _id: 1 });
  expect(result.links.next).toContain('page=2');
});
