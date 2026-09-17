const { makeReadings, START } = require('../src/seed/solar');
const { parseListQuery, paginated } = require('../src/utils/listQuery');

test('synthetic readings span seven local days with daytime power and cumulative energy', () => {
  const rows = makeReadings({ _id: 'installation', capacityKw: 10 }, 1);
  expect(rows).toHaveLength(672);
  expect(rows[0].timestamp).toEqual(START);
  rows.forEach((row, index) => {
    const localHour = (index % 96) / 4;
    if (localHour < 6 || localHour >= 18) expect(row.powerKw).toBe(0);
    expect(row.powerKw).toBeGreaterThanOrEqual(0);
    expect(row.powerKw).toBeLessThanOrEqual(10);
    if (index) {
      expect(row.timestamp - rows[index - 1].timestamp).toBe(900000);
      expect(row.energyKwh).toBeGreaterThanOrEqual(rows[index - 1].energyKwh);
      expect(row.energyKwh - rows[index - 1].energyKwh).toBeCloseTo(row.powerKw * 0.25, 2);
    }
  });
  expect(rows[48].powerKw).toBeGreaterThan(0);
  expect(makeReadings({ _id: 'installation', capacityKw: 10 }, 1)).toEqual(rows);
});

test.each([
  { page: '0' }, { page: '2abc' }, { pageSize: '101' }, { sort: 'powerKw:asc' },
  { from: '2026-02-30T00:00:00Z' }, { from: 'yesterday' },
  { from: '2026-09-08T00:00:00Z', to: '2026-09-07T00:00:00Z' },
  { page: ['1', '2'] }, { unexpected: 'value' },
])('invalid historical query is rejected: %j', (query) => {
  expect(() => parseListQuery(query, { readings: true })).toThrow();
});

test('pagination links preserve time filter and sorting', () => {
  const query = { page: '2', pageSize: '10', from: '2026-09-06T00:00:00Z', sort: 'timestamp:asc' };
  const options = parseListQuery(query, { readings: true });
  const result = paginated([], 25, options, '/api/v1/installations/123/readings', query);
  expect(result.pagination.totalPages).toBe(3);
  expect(new URL(result.links.next, 'http://localhost').searchParams.get('from')).toBe(query.from);
  expect(new URL(result.links.next, 'http://localhost').searchParams.get('page')).toBe('3');
  expect(new URL(result.links.previous, 'http://localhost').searchParams.get('page')).toBe('1');
});
