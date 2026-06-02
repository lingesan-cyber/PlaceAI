const express = require('express');
const router = express.Router();
const {
  getTrainingDetails,
  getTrainingDetailByRegNo,
  createTrainingDetail,
  updateTrainingDetail,
  deleteTrainingDetail,
  importTrainingDetails
} = require('../controllers/trainingDetailController');

router.route('/')
  .get(getTrainingDetails)
  .post(createTrainingDetail);

router.route('/import')
  .post(importTrainingDetails);

router.route('/reg/:reg_no')
  .get(getTrainingDetailByRegNo);

router.route('/:id')
  .put(updateTrainingDetail)
  .delete(deleteTrainingDetail);

module.exports = router;
