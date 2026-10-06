const District = require('../models/District');
const GridSubstation = require('../models/GridSubstation');
const geography = require('../controllers/geographyController');
const ApiError = require('../utils/ApiError');
const ensureObjectId = require('../utils/ensureObjectId');
const { tag } = require('../utils/entityTag');

const fields = ['district', 'latitude', 'longitude'];

async function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length ||
    Object.keys(body).some(key => !fields.includes(key))) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Supply only district, latitude or longitude.');
  }
  for (const field of ['latitude', 'longitude']) {
    if (body[field] !== undefined && (typeof body[field] !== 'number' || !Number.isFinite(body[field]) ||
      (field === 'latitude' && (body[field] < -90 || body[field] > 90)) ||
      (field === 'longitude' && (body[field] < -180 || body[field] > 180)))) {
      throw new ApiError(400, 'VALIDATION_ERROR', `${field} is outside its valid coordinate range.`);
    }
  }
  if (body.district !== undefined) {
    ensureObjectId(body.district, 'district');
    if (!await District.exists({ _id: body.district })) throw new ApiError(404, 'DISTRICT_NOT_FOUND', 'Destination district does not exist.');
  }
  return body;
}

async function patch(id, ifMatch, body) {
  if (!ifMatch) throw new ApiError(428, 'PRECONDITION_REQUIRED', 'Send the current substation ETag in If-Match.');
  const current = await geography.getSubstation(id);
  if (!ifMatch.split(',').map(value => value.trim()).includes(tag(current))) {
    throw new ApiError(412, 'PRECONDITION_FAILED', 'Substation changed. Retrieve it again before writing.');
  }
  const values = await validate(body);
  const filter = {
    _id: current._id,
    name: current.name,
    code: current.code,
    district: current.district,
    updatedAt: current.updatedAt,
    latitude: current.latitude === undefined ? { $exists: false } : current.latitude,
    longitude: current.longitude === undefined ? { $exists: false } : current.longitude,
  };
  const updated = await GridSubstation.findOneAndUpdate(filter, { $set: values }, { new: true, runValidators: true })
    .select('-__v').lean();
  if (!updated) throw new ApiError(412, 'PRECONDITION_FAILED', 'A concurrent change invalidated the supplied ETag.');
  return updated;
}

module.exports = { patch };
