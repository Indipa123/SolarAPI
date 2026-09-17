const express = require('express');
const controller = require('../controllers/geographyController');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, requireUser } = require('../middleware/authenticate');
const jurisdiction = require('../middleware/authorizeJurisdiction');

const router = express.Router();
router.get('/provinces', authenticate, requireUser, jurisdiction.provinceList, asyncHandler(async (req, res) => res.json(await controller.listProvinces(req.accessibleProvinceId))));
router.get('/provinces/:provinceId', authenticate, requireUser, jurisdiction.province, asyncHandler(async (req, res) => res.json(await controller.getProvince(req.params.provinceId))));
router.get('/provinces/:provinceId/districts', authenticate, requireUser, jurisdiction.province, asyncHandler(async (req, res) => res.json(await controller.listDistricts(req.params.provinceId))));
router.get('/districts/:districtId', authenticate, requireUser, jurisdiction.district, asyncHandler(async (req, res) => res.json(await controller.getDistrict(req.params.districtId))));
router.get('/districts/:districtId/substations', authenticate, requireUser, jurisdiction.district, asyncHandler(async (req, res) => res.json(await controller.listSubstations(req.params.districtId))));
router.get('/substations/:substationId', authenticate, requireUser, jurisdiction.substation, asyncHandler(async (req, res) => res.json(await controller.getSubstation(req.params.substationId))));

module.exports = router;
