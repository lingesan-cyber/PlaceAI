const express = require('express');
const router = express.Router();
const {
  getCompanies,
  getCompanyById,
  createCompany
} = require('../controllers/companyController');

router.route('/')
  .get(getCompanies)
  .post(createCompany);

router.route('/:id')
  .get(getCompanyById);

module.exports = router;
