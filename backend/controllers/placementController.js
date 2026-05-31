const Placement = require('../models/Placement');
const { validatePlacementRecord } = require('../utils/validator');

/**
 * @desc    Get all placements (with pagination and optional filters)
 * @route   GET /api/placements
 * @access  Public
 */
const getPlacements = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.year) {
      filter.year = Number(req.query.year);
    }
    if (req.query.department) {
      filter.department = req.query.department.trim().toUpperCase();
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [{ name: searchRegex }, { reg_no: searchRegex }, { company: searchRegex }];
    }

    const total = await Placement.countDocuments(filter);
    const placements = await Placement.find(filter)
      .sort({ sno: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Placements retrieved successfully',
      data: {
        placements,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get placements by academic year
 * @route   GET /api/placements/year/:year
 * @access  Public
 */
const getPlacementsByYear = async (req, res, next) => {
  try {
    const year = Number(req.params.year);
    if (isNaN(year)) {
      res.status(400);
      throw new Error('Invalid year parameter');
    }

    const placements = await Placement.find({ year }).sort({ sno: 1 });

    res.status(200).json({
      success: true,
      message: `Placements for academic year ${year} retrieved`,
      data: placements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get placements by department
 * @route   GET /api/placements/department/:dept
 * @access  Public
 */
const getPlacementsByDept = async (req, res, next) => {
  try {
    const dept = req.params.dept.trim().toUpperCase();
    const placements = await Placement.find({ department: dept }).sort({ sno: 1 });

    res.status(200).json({
      success: true,
      message: `Placements for department ${dept} retrieved`,
      data: placements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search placements by student name, register number, or company keyword
 * @route   GET /api/placements/search/:keyword
 * @access  Public
 */
const searchPlacements = async (req, res, next) => {
  try {
    const keyword = req.params.keyword.trim();
    if (!keyword) {
      res.status(400);
      throw new Error('Search keyword cannot be empty');
    }

    const regex = new RegExp(keyword, 'i');
    const placements = await Placement.find({
      $or: [{ name: regex }, { reg_no: regex }, { company: regex }]
    }).sort({ sno: 1 });

    res.status(200).json({
      success: true,
      message: `Search results for keyword '${keyword}'`,
      data: placements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a single placement record
 * @route   POST /api/placements
 * @access  Public
 */
const createPlacement = async (req, res, next) => {
  try {
    const record = req.body;
    
    // Normalize department code to uppercase
    if (record.department) {
      record.department = record.department.trim().toUpperCase();
    }

    // Run structural validator
    const validation = validatePlacementRecord(record);
    if (!validation.isValid) {
      res.status(400);
      throw new Error(`Validation Error: ${validation.errors.join(', ')}`);
    }

    // Check compound constraint duplicate first
    const existing = await Placement.findOne({
      reg_no: record.reg_no,
      year: record.year,
      company: record.company
    });

    if (existing) {
      res.status(409);
      throw new Error(`Duplicate Record: Student with Register Number ${record.reg_no} already has a placement record for company '${record.company}' in year ${record.year}.`);
    }

    const placement = await Placement.create({
      sno: Number(record.sno),
      name: record.name,
      reg_no: record.reg_no,
      company: record.company,
      year: Number(record.year),
      department: record.department,
      package: Number(record.package) || 0,
      placement_status: record.placement_status || 'Placed'
    });

    res.status(201).json({
      success: true,
      message: 'Placement record created successfully',
      data: placement
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlacements,
  getPlacementsByYear,
  getPlacementsByDept,
  searchPlacements,
  createPlacement
};
