const GenerationReading = require('../models/GenerationReading');
const { installation } = require('./installationService');
const ensureObjectId = require('../utils/ensureObjectId');
const ApiError = require('../utils/ApiError');
const { parseListQuery, paginated } = require('../utils/listQuery');

async function history(id, query, path) {
  const options = parseListQuery(query, { readings: true });
  await installation(id);
  const filter = { installation: id };
  if (options.from || options.to) {
    filter.timestamp = {};
    if (options.from) filter.timestamp.$gte = options.from;
    if (options.to) filter.timestamp.$lte = options.to;
  }
  const [data, count] = await Promise.all([
    GenerationReading.find(filter).select('-__v').sort({ timestamp: options.direction }).skip((options.page - 1) * options.pageSize).limit(options.pageSize).lean(),
    GenerationReading.countDocuments(filter),
  ]);
  return paginated(data, count, options, path, query);
}

async function get(id, readingId) {
  if (readingId !== undefined) ensureObjectId(readingId, 'readingId');
  await installation(id);
  const filter = { installation: id };
  if (readingId !== undefined) filter._id = readingId;
  const reading = await GenerationReading.findOne(filter).sort({ timestamp: -1 }).select('-__v').lean();
  if (!reading) throw new ApiError(404, 'READING_NOT_FOUND', 'No matching reading exists for this installation.');
  return reading;
}

async function create(id, values) {
  await installation(id);
  const reading = await GenerationReading.create({ installation: id, timestamp: new Date(values.timestamp),
    powerKw: Number(values.powerKw), energyKwh: Number(values.energyKwh), voltage: Number(values.voltage) });
  return { id: reading._id, installationId: reading.installation, timestamp: reading.timestamp,
    powerKw: reading.powerKw, energyKwh: reading.energyKwh, voltage: reading.voltage };
}

module.exports = { history, get, create };
