const BatchYear = require('../models/BatchYear');

/**
 * @desc    Get all academic batch years
 * @route   GET /api/years
 * @access  Public
 */
const getYears = async (req, res, next) => {
  try {
    // If request contains query all=true, return active and archived, otherwise return only visible ones
    const filter = {};
    if (req.query.all !== 'true') {
      filter.visible = true;
    }

    const years = await BatchYear.find(filter).sort({ year: -1 });

    res.status(200).json({
      success: true,
      message: 'Batch years retrieved successfully',
      data: years
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new batch year
 * @route   POST /api/years
 * @access  Public
 */
const createYear = async (req, res, next) => {
  try {
    const { year } = req.body;
    const numericYear = Number(year);

    if (!year || isNaN(numericYear) || numericYear < 2000) {
      res.status(400);
      throw new Error('Valid academic batch year >= 2000 is required');
    }

    // Check if the year already exists
    const existing = await BatchYear.findOne({ year: numericYear });
    if (existing) {
      res.status(409);
      throw new Error(`Academic batch year '${numericYear}' already exists.`);
    }

    const batch = await BatchYear.create({
      year: numericYear,
      visible: true
    });

    res.status(201).json({
      success: true,
      message: 'Academic batch year created successfully',
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Archive a batch year (soft-hide)
 * @route   PATCH /api/years/:id/archive
 * @access  Public
 */
const archiveYear = async (req, res, next) => {
  try {
    const { id } = req.params;

    const batch = await BatchYear.findById(id);
    if (!batch) {
      res.status(404);
      throw new Error(`Academic batch year not found`);
    }

    batch.visible = false;
    await batch.save();

    res.status(200).json({
      success: true,
      message: `Batch year ${batch.year} archived successfully`,
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Restore an archived batch year
 * @route   PATCH /api/years/:id/restore
 * @access  Public
 */
const restoreYear = async (req, res, next) => {
  try {
    const { id } = req.params;

    const batch = await BatchYear.findById(id);
    if (!batch) {
      res.status(404);
      throw new Error(`Academic batch year not found`);
    }

    batch.visible = true;
    await batch.save();

    res.status(200).json({
      success: true,
      message: `Batch year ${batch.year} restored successfully`,
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getYears,
  createYear,
  archiveYear,
  restoreYear
};
