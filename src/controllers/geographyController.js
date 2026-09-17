const Province = require('../models/Province');
const District = require('../models/District');
const GridSubstation = require('../models/GridSubstation');
const ApiError = require('../utils/ApiError');
const ensureObjectId = require('../utils/ensureObjectId');

const projection = '-__v';
const findOrNotFound = async (Model, id, label) => {
  const document = await Model.findById(id).select(projection).lean();
  if (!document) throw new ApiError(404, `${label.toUpperCase().replaceAll(' ', '_')}_NOT_FOUND`, `The requested ${label.toLowerCase()} does not exist.`, { id });
  return document;
};

exports.listProvinces = async (provinceId) => ({ data: await Province.find(provinceId ? { _id: provinceId } : {}).select(projection).sort({ name: 1 }).lean() });
exports.getProvince = async (provinceId) => findOrNotFound(Province, ensureObjectId(provinceId, 'provinceId'), 'Province');
exports.listDistricts = async (provinceId) => {
  const id = ensureObjectId(provinceId, 'provinceId');
  await findOrNotFound(Province, id, 'Province');
  return { data: await District.find({ province: id }).select(projection).sort({ name: 1 }).lean() };
};
exports.getDistrict = async (districtId) => findOrNotFound(District, ensureObjectId(districtId, 'districtId'), 'District');
exports.listSubstations = async (districtId) => {
  const id = ensureObjectId(districtId, 'districtId');
  await findOrNotFound(District, id, 'District');
  return { data: await GridSubstation.find({ district: id }).select(projection).sort({ name: 1 }).lean() };
};
exports.getSubstation = async (substationId) => findOrNotFound(GridSubstation, ensureObjectId(substationId, 'substationId'), 'Grid substation');
