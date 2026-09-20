const Installation = require('../models/SolarInstallation');
const Station = require('../models/GridSubstation');
const ApiError = require('../utils/ApiError');
const ensureId = require('../utils/ensureObjectId');
const { installation } = require('./installationService');
const { installationTag } = require('../utils/entityTag');
const fields = ['meterId', 'inverterId', 'substation', 'capacityKw', 'latitude', 'longitude', 'status'];

async function validate(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(k => !fields.includes(k))) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Supply only documented installation fields.');
  }
  const required = ['meterId', 'substation', 'capacityKw', 'status'];
  if (!partial && required.some(k => body[k] === undefined)) throw new ApiError(400, 'VALIDATION_ERROR', 'meterId, substation, capacityKw and status are required.');
  for (const k of ['capacityKw', 'latitude', 'longitude']) {
    if (body[k] !== undefined && (typeof body[k] !== 'number' || !Number.isFinite(body[k]))) throw new ApiError(400, 'VALIDATION_ERROR', `${k} must be a finite number.`);
  }
  for (const k of ['meterId', 'inverterId', 'status']) {
    if (body[k] !== undefined && (typeof body[k] !== 'string' || !body[k].trim())) throw new ApiError(400, 'VALIDATION_ERROR', `${k} must be a nonempty string.`);
  }
  if (body.substation !== undefined) {
    ensureId(body.substation, 'substation');
    if (!await Station.exists({ _id: body.substation })) throw new ApiError(404, 'SUBSTATION_NOT_FOUND', 'Substation does not exist.');
  }
  return Object.fromEntries(Object.entries(body).map(([k,v]) => [k, typeof v === 'string' ? v.trim() : v]));
}

async function create(body) {
  const values = await validate(body);
  const document = await Installation.create(values);
  return installation(document._id.toString());
}

async function mutate(id, header, body, method) {
  if (!header) throw new ApiError(428, 'PRECONDITION_REQUIRED', 'Send the current installation ETag in If-Match.');
  const current = await installation(id);
  const tags = header.split(',').map(t => t.trim());
  // Require a concrete strong validator; wildcard cannot protect against lost updates.
  if (!tags.includes(installationTag(current))) throw new ApiError(412, 'PRECONDITION_FAILED', 'Installation changed. Retrieve it again before writing.');
  const revision = current.revision || 0;
  const filter = { _id: id, deletedAt: null, ...(revision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision }) };
  let update;
  if (method === 'DELETE') update = { $set: { deletedAt: new Date(), status: 'INACTIVE' }, $inc: { revision: 1 } };
  else {
    const values = await validate(body, method === 'PATCH');
    update = { $set: values, $inc: { revision: 1 } };
    if (method === 'PUT') {
      const omitted = fields.filter(k => values[k] === undefined);
      if (omitted.length) update.$unset = Object.fromEntries(omitted.map(k => [k, 1]));
    }
  }
  const result = await Installation.findOneAndUpdate(filter, update, { new: true, runValidators: true }).select('-__v').lean();
  if (!result) throw new ApiError(412, 'PRECONDITION_FAILED', 'A concurrent change invalidated the supplied ETag.');
  return result;
}
module.exports = { create, mutate, validate };
