const express = require('express');
const router = express.Router();
const {
  getOverviewAnalytics,
  getDepartmentAnalytics,
  getCompanyAnalytics
} = require('../controllers/analyticsController');

router.get('/overview', getOverviewAnalytics);
router.get('/departments', getDepartmentAnalytics);
router.get('/companies', getCompanyAnalytics);

module.exports = router;
