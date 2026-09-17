const router = require('express').Router();
const { authenticate, requireUser } = require('../middleware/authenticate');
const asyncHandler = require('../utils/asyncHandler');
const analytics = require('../services/analyticsService');
router.get('/readings', authenticate, requireUser, asyncHandler(async (req, res) => {
  res.json(await analytics.readings(req.auth, req.query, req.baseUrl + req.path));
}));
router.get('/districts/:districtId/generation-summary', authenticate, requireUser, asyncHandler(async (req, res) => {
  res.json(await analytics.summary(req.auth, req.params.districtId, req.query));
}));
module.exports = router;
