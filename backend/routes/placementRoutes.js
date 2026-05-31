const express = require('express');
const router = express.Router();
const {
  getPlacements,
  getPlacementsByYear,
  getPlacementsByDept,
  searchPlacements,
  createPlacement
} = require('../controllers/placementController');

router.route('/')
  .get(getPlacements)
  .post(createPlacement);

router.get('/year/:year', getPlacementsByYear);
router.get('/department/:dept', getPlacementsByDept);
router.get('/search/:keyword', searchPlacements);

module.exports = router;
