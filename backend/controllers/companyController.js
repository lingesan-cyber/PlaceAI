const Company = require('../models/Company');

const parsePositivePackage = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const buildCompanyPayload = (body) => {
  const company_name = typeof body.company_name === 'string' ? body.company_name.trim() : '';
  const role = typeof body.role === 'string' ? body.role.trim() : '';
  const packageValue = parsePositivePackage(body.package);
  const driveDate = body.drive_date ? new Date(body.drive_date) : null;
  const status = typeof body.status === 'string' && body.status.trim() ? body.status.trim() : 'Upcoming';

  return {
    company_name,
    role,
    packageValue,
    driveDate,
    status
  };
};

/**
 * @desc    Get all companies
 * @route   GET /api/companies
 * @access  Public
 */
const getCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find({}).sort({ createdAt: -1 });
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
    const { company_name, role, packageValue, driveDate, status } = buildCompanyPayload(req.body);

    if (!company_name || !driveDate) {
      res.status(400);
      throw new Error('Company name and drive date are required fields');
    }

    if (!packageValue) {
      res.status(400);
      throw new Error('Package must be a positive number');
    }

    if (Number.isNaN(driveDate.getTime())) {
      res.status(400);
      throw new Error('Drive date must be a valid date');
    }

    // Check if company drive name already exists
    const existing = await Company.findOne({ company_name });
    if (existing) {
      res.status(409);
      throw new Error(`Company '${company_name}' already has a registered drive.`);
    }

    const company = await Company.create({
      company_name,
      role,
      package: packageValue,
      drive_date: driveDate,
      status
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

/**
 * @desc    Update an existing company / drive
 * @route   PUT /api/companies/:id
 * @access  Public
 */
const updateCompany = async (req, res, next) => {
  try {
    const { company_name, role, packageValue, driveDate, status } = buildCompanyPayload(req.body);

    if (!company_name || !driveDate) {
      res.status(400);
      throw new Error('Company name and drive date are required fields');
    }

    if (!packageValue) {
      res.status(400);
      throw new Error('Package must be a positive number');
    }

    if (Number.isNaN(driveDate.getTime())) {
      res.status(400);
      throw new Error('Drive date must be a valid date');
    }

    const existing = await Company.findOne({
      company_name,
      _id: { $ne: req.params.id }
    });

    if (existing) {
      res.status(409);
      throw new Error(`Company '${company_name}' already has a registered drive.`);
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      {
        company_name,
        role,
        package: packageValue,
        drive_date: driveDate,
        status
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!company) {
      res.status(404);
      throw new Error(`Company with ID '${req.params.id}' not found`);
    }

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: company
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a company / drive
 * @route   DELETE /api/companies/:id
 * @access  Public
 */
const deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      res.status(404);
      throw new Error(`Company with ID '${req.params.id}' not found`);
    }

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany
};
