const SolarInstallation = require('../models/SolarInstallation');
const GridSubstation = require('../models/GridSubstation');
const GenerationReading = require('../models/GenerationReading');
const ensureObjectId = require('../utils/ensureObjectId');
const ApiError = require('../utils/ApiError');
const { parseListQuery, paginated } = require('../utils/listQuery');

async function installation(id) {
  ensureObjectId(id, 'installationId');
  const item = await SolarInstallation.findById(id).select('-__v').lean();
  if (!item) throw new ApiError(404, 'INSTALLATION_NOT_FOUND', 'The requested installation does not exist.');
  return item;
}

async function list(substationId, query, path) {
  ensureObjectId(substationId, 'substationId');
  const options = parseListQuery(query);
  if (!await GridSubstation.exists({ _id: substationId })) throw new ApiError(404, 'SUBSTATION_NOT_FOUND', 'The requested substation does not exist.');
  const filter = { substation: substationId };
  if (options.status) filter.status = options.status;
  const [data, count] = await Promise.all([
    SolarInstallation.find(filter).select('-__v').sort({ meterId: 1 }).skip((options.page - 1) * options.pageSize).limit(options.pageSize).lean(),
    SolarInstallation.countDocuments(filter),
  ]);
  return paginated(data, count, options, path, query);
}

async function overview(id) {
  const item = await installation(id);
  const [substation, latestReading] = await Promise.all([
    GridSubstation.findById(item.substation).populate({ path: 'district', populate: { path: 'province' } }).lean(),
    GenerationReading.findOne({ installation: id }).sort({ timestamp: -1 }).select('-__v').lean(),
  ]);
  return { installation: item, location: { substation: substation?.name ?? null,
    district: substation?.district?.name ?? null, province: substation?.district?.province?.name ?? null }, latestReading };
}

module.exports = { installation, list, overview };
