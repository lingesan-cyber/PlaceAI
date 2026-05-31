const Company = require('../models/Company');

/**
 * @desc    Get all companies
 * @route   GET /api/companies
 * @access  Public
 */
const getCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find({}).sort({ drive_date: 1 });
    res.status(200).json({
      success: true,
      message: 'Companies retrieved successfully',
      data: companies
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single company by ID
 * @route   GET /api/companies/:id
 * @access  Public
 */
const getCompanyById = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      res.status(404);
      throw new Error(`Company with ID '${req.params.id}' not found`);
    }

    res.status(200).json({
      success: true,
      message: 'Company details retrieved',
      data: company
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new company / drive
 * @route   POST /api/companies
 * @access  Public
 */
const createCompany = async (req, res, next) => {
  try {
    const { company_name, package: pkg, drive_date, status } = req.body;

    if (!company_name || !drive_date) {
      res.status(400);
      throw new Error('Company name and drive date are required fields');
    }

    // Check if company drive name already exists
    const existing = await Company.findOne({ company_name: company_name.trim() });
    if (existing) {
      res.status(409);
      throw new Error(`Company '${company_name.trim()}' already has a registered drive.`);
    }

    const company = await Company.create({
      company_name: company_name.trim(),
      package: Number(pkg) || 0,
      drive_date: new Date(drive_date),
      status: status || 'Upcoming'
    });

    res.status(201).json({
      success: true,
      message: 'Company drive registered successfully',
      data: company
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanies,
  getCompanyById,
  createCompany
};
