const mongoose = require('mongoose');
const Province = require('../models/Province');
const District = require('../models/District');
const Station = require('../models/GridSubstation');
const Installation = require('../models/SolarInstallation');
const Reading = require('../models/GenerationReading');
const ApiError = require('../utils/ApiError');
const ensureObjectId = require('../utils/ensureObjectId');
const { parseListQuery, paginated } = require('../utils/listQuery');

const forbidden = () => new ApiError(403, 'JURISDICTION_FORBIDDEN', 'The requested filter is outside your jurisdiction.');
const regionKeys = ['provinceId', 'districtId', 'substationId', 'installationId'];
async function scopeDistricts(auth) {
  if (auth.role === 'NATIONAL') return {};
  if (auth.role === 'PROVINCE') return { province: auth.provinceId };
  if (auth.role === 'DISTRICT') return { _id: auth.districtId };
  throw forbidden();
}

async function scopedInstallations(auth, filters) {
  const districts = await District.find(await scopeDistricts(auth)).select('_id province').lean();
  const districtIds = new Set(districts.map((d) => String(d._id)));
  const provinceIds = new Set(districts.map((d) => String(d.province)));
  for (const key of regionKeys) {
    if (filters[key] !== undefined) {
      if (typeof filters[key] !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', `${key} must be a single identifier.`);
      ensureObjectId(filters[key], key);
    }
  }
  const models = { provinceId: Province, districtId: District, substationId: Station, installationId: Installation };
  const selected = {};
  for (const key of regionKeys) {
    if (!filters[key]) continue;
    const record = await models[key].findById(filters[key]).lean();
    if (!record) throw new ApiError(404, 'RESOURCE_NOT_FOUND', `No resource exists for ${key}.`);
    selected[key] = record;
    if (auth.role === 'NATIONAL') continue;
    if (key === 'provinceId' && !provinceIds.has(String(record._id))) throw forbidden();
    if (key === 'districtId' && !districtIds.has(String(record._id))) throw forbidden();
    if (key === 'substationId' && !districtIds.has(String(record.district))) throw forbidden();
    if (key === 'installationId') {
      const station = await Station.findById(record.substation).lean();
      if (!station || !districtIds.has(String(station.district))) throw forbidden();
    }
  }
  const matchingDistricts = districts.filter((d) =>
    (!selected.provinceId || String(d.province) === String(selected.provinceId._id)) &&
    (!selected.districtId || String(d._id) === String(selected.districtId._id)));
  const stationFilter = { district: { $in: matchingDistricts.map((d) => d._id) } };
  if (selected.substationId) stationFilter._id = selected.substationId._id;
  const stations = await Station.find(stationFilter).select('_id').lean();
  const installationFilter = { substation: { $in: stations.map((s) => s._id) } };
  if (selected.installationId) installationFilter._id = selected.installationId._id;
  return Installation.find(installationFilter).select('_id status capacityKw updatedAt').lean();
}

async function readings(auth, query, path) {
  const listQuery = Object.fromEntries(Object.entries(query).filter(([key]) => !regionKeys.includes(key)));
  const options = parseListQuery(listQuery, { readings: true });
  const installations = await scopedInstallations(auth, query);
  const filter = { installation: { $in: installations.map((item) => item._id) } };
  if (options.from || options.to) {
    filter.timestamp = {};
    if (options.from) filter.timestamp.$gte = options.from;
    if (options.to) filter.timestamp.$lte = options.to;
  }
  const [data, total] = await Promise.all([
    Reading.find(filter).select('-__v').sort({ timestamp: options.direction, _id: options.direction })
      .skip((options.page - 1) * options.pageSize).limit(options.pageSize).lean(),
    Reading.countDocuments(filter),
  ]);
  return paginated(data, total, options, path, query);
}

function dayWindow(value, now = new Date()) {
  const localToday = new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
  const date = value === undefined ? localToday : value;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date || date > localToday) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'date must be a valid YYYY-MM-DD date no later than today in Sri Lanka.');
  }
  const start = new Date(`${date}T00:00:00+05:30`);
  const end = new Date(Math.min(start.getTime() + 86400000 - 1, now.getTime()));
  return { date, start, end };
}

function summarize(installations, rows, window) {
  let energy = 0;
  let power = 0;
  let fresh = 0;
  let energyCoverage = 0;
  let resetCount = 0;
  let latest = null;
  for (const row of rows) {
    const reading = row.latest;
    if (reading && (!latest || reading.timestamp > latest)) latest = reading.timestamp;
    if (reading && window.end - reading.timestamp <= 30 * 60000) { power += reading.powerKw; fresh++; }
    if (row.samples >= 2 && !row.resetDetected) { energy += row.lastEnergy - row.firstEnergy; energyCoverage++; }
    if (row.resetDetected) resetCount++;
  }
  return { date: window.date, timezone: 'Asia/Colombo', installationCount: installations.length,
    activeInstallations: installations.filter((i) => i.status === 'ACTIVE').length,
    currentPowerKw: Number(power.toFixed(3)), todayEnergyKwh: Number(energy.toFixed(3)),
    freshInstallationCount: fresh, missingOrStaleInstallations: installations.length - fresh,
    energyCoveredInstallations: energyCoverage, energyResetInstallations: resetCount,
    latestReadingAt: latest, energyMethod: 'Sum of last minus first cumulative kWh within the selected local day; reset series excluded.' };
}

async function summary(auth, districtId, query) {
  ensureObjectId(districtId, 'districtId');
  if (Object.keys(query).some((key) => key !== 'date')) throw new ApiError(400, 'VALIDATION_ERROR', 'Only date is supported for generation summaries.');
  const window = dayWindow(query.date);
  const installations = await scopedInstallations(auth, { districtId });
  const district = await District.findById(districtId).lean();
  const rows = await Reading.aggregate([
    { $match: { installation: { $in: installations.map((item) => new mongoose.Types.ObjectId(item._id)) }, timestamp: { $gte: window.start, $lte: window.end } } },
    { $sort: { installation: 1, timestamp: 1 } },
    { $group: { _id: '$installation', latest: { $last: { timestamp: '$timestamp', powerKw: '$powerKw' } },
      firstEnergy: { $first: '$energyKwh' }, lastEnergy: { $last: '$energyKwh' }, samples: { $sum: 1 }, energies: { $push: '$energyKwh' } } },
  ]);
  for (const row of rows) row.resetDetected = row.energies.some((value, index) => index > 0 && value < row.energies[index - 1]);
  return { districtId, districtName: district.name, ...summarize(installations, rows, window) };
}

module.exports = { readings, summary, scopedInstallations, dayWindow, summarize };
