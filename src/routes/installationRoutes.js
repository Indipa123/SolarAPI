const router = require('express').Router();
const installations = require('../services/installationService');
const readings = require('../services/readingService');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, requireUser, requireDeviceForInstallation } = require('../middleware/authenticate');
const jurisdiction = require('../middleware/authorizeJurisdiction');
const readingValidation = require('../validators/readingValidator');

router.get('/substations/:substationId/installations', authenticate, requireUser, jurisdiction.substation, asyncHandler(async (req, res) => res.json(await installations.list(req.params.substationId, req.query, req.baseUrl + req.path))));
router.get('/installations/:installationId', authenticate, requireUser, jurisdiction.installation, asyncHandler(async (req, res) => res.json(await installations.installation(req.params.installationId))));
router.get('/installations/:installationId/overview', authenticate, requireUser, jurisdiction.installation, asyncHandler(async (req, res) => res.json(await installations.overview(req.params.installationId))));
router.get('/installations/:installationId/latest-reading', authenticate, requireUser, jurisdiction.installation, asyncHandler(async (req, res) => res.json(await readings.latest(req.params.installationId))));
router.get('/installations/:installationId/readings', authenticate, requireUser, jurisdiction.installation, asyncHandler(async (req, res) => res.json(await readings.history(req.params.installationId, req.query, req.baseUrl + req.path))));
router.get('/installations/:installationId/readings/:readingId', authenticate, requireUser, jurisdiction.installation, asyncHandler(async (req, res) => res.json(await readings.get(req.params.installationId, req.params.readingId))));
router.post('/installations/:installationId/readings', authenticate, requireDeviceForInstallation, readingValidation, asyncHandler(async (req, res) => {
  const reading = await readings.create(req.params.installationId, req.body);
  res.location(`/api/v1/installations/${req.params.installationId}/readings/${reading.id}`).status(201).json(reading);
}));

const admin = require('../services/installationAdmin');
const { requireInstallationAdmin } = require('../middleware/authenticate');
const { installationTag } = require('../utils/entityTag');
router.post('/installations/:installationId/device-credentials', authenticate, requireInstallationAdmin, jurisdiction.installationAdministration,
  asyncHandler(require('../controllers/deviceAuthController').rotate));
router.post('/installations', authenticate, requireInstallationAdmin, jurisdiction.installationAdministration, asyncHandler(async (req, res) => {
  const item = await admin.create(req.body);
  res.location(`/api/v1/installations/${item._id}`).set('ETag', installationTag(item)).status(201).json(item);
}));
for (const method of ['put', 'patch', 'delete']) {
  router[method]('/installations/:installationId', authenticate, requireInstallationAdmin, jurisdiction.installationAdministration, asyncHandler(async (req, res) => {
    const item = await admin.mutate(req.params.installationId, req.get('If-Match'), req.body, method.toUpperCase());
    if (method === 'delete') return res.status(204).end();
    res.set('ETag', installationTag(item)).json(item);
  }));
}
module.exports = router;
