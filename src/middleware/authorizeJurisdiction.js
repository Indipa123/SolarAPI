const District = require('../models/District');
const GridSubstation = require('../models/GridSubstation');
const SolarInstallation = require('../models/SolarInstallation');
const ApiError = require('../utils/ApiError');
const ensureObjectId = require('../utils/ensureObjectId');

function forbidden() { return new ApiError(403, 'JURISDICTION_FORBIDDEN', 'Your account is not authorised to access this jurisdiction.'); }
async function districtProvince(districtId) {
  const district = await District.findById(districtId).select('province').lean();
  return district?.province?.toString();
}
async function assertAccess(auth, provinceId, districtId) {
  if (auth.role === 'NATIONAL') return;
  if (auth.role === 'PROVINCE' && auth.provinceId === provinceId) return;
  if (auth.role === 'DISTRICT' && auth.districtId === districtId) return;
  throw forbidden();
}
async function regionForSubstation(id) {
  const item = await GridSubstation.findById(id).populate({ path: 'district', select: 'province' }).lean();
  if (item && !item.district?.province) throw forbidden();
  return item ? { provinceId: item.district.province.toString(), districtId: item.district._id.toString() } : null;
}
async function regionForInstallation(id) {
  const item = await SolarInstallation.findById(id).populate({ path: 'substation', populate: { path: 'district', select: 'province' } }).lean();
  if (item && !item.substation?.district?.province) throw forbidden();
  return item ? { provinceId: item.substation.district.province.toString(), districtId: item.substation.district._id.toString() } : null;
}
function guard(resolve, parameter) {
  return async (req, res, next) => {
    try {
      const id = ensureObjectId(req.params[parameter], parameter);
      const region = await resolve(id);
      if (region) await assertAccess(req.auth, region.provinceId, region.districtId);
      return next();
    } catch (error) { return next(error); }
  };
}

exports.province = guard(async (id) => ({ provinceId: id, districtId: null }), 'provinceId');
exports.district = guard(async (id) => {
  const provinceId = await districtProvince(id);
  return provinceId ? { provinceId, districtId: id } : null;
}, 'districtId');
exports.substation = guard(regionForSubstation, 'substationId');
exports.installation = guard(regionForInstallation, 'installationId');
exports.provinceList = async (req, res, next) => {
  try {
    if (req.auth.role === 'NATIONAL') return next();
    if (req.auth.role === 'PROVINCE') { req.accessibleProvinceId = req.auth.provinceId; return next(); }
    if (req.auth.role === 'DISTRICT') {
      const provinceId = await districtProvince(req.auth.districtId);
      if (!provinceId) throw forbidden();
      req.accessibleProvinceId = provinceId;
      return next();
    }
    throw forbidden();
  } catch (error) { return next(error); }
};
