const express = require('express');
const router = express.Router();
const {
  getYears,
  createYear,
  archiveYear,
  restoreYear
} = require('../controllers/yearController');

router.route('/')
  .get(getYears)
  .post(createYear);

router.patch('/:id/archive', archiveYear);
router.patch('/:id/restore', restoreYear);

module.exports = router;
