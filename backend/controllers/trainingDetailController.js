const TrainingDetail = require('../models/TrainingDetail');

/**
 * @desc    Get all student training details
 * @route   GET /api/training-details
 * @access  Public
 */
const getTrainingDetails = async (req, res, next) => {
  try {
    const records = await TrainingDetail.find({}).sort({ reg_no: 1 });
    res.status(200).json({
      success: true,
      message: 'Training details retrieved successfully',
      data: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single student training detail by reg_no
 * @route   GET /api/training-details/:reg_no
 * @access  Public
 */
const getTrainingDetailByRegNo = async (req, res, next) => {
  try {
    const record = await TrainingDetail.findOne({ reg_no: req.params.reg_no });
    if (!record) {
      res.status(404);
      throw new Error(`Training detail with Register Number '${req.params.reg_no}' not found`);
    }

    res.status(200).json({
      success: true,
      message: 'Training detail retrieved successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new student training record
 * @route   POST /api/training-details
 * @access  Public
 */
const createTrainingDetail = async (req, res, next) => {
  try {
    const {
      reg_no,
      name,
      department,
      aptitude_score,
      coding_score,
      communication_score,
      mock_interview_score,
      attendance
    } = req.body;

    if (!reg_no || !name || !department) {
      res.status(400);
      throw new Error('Register number, student name, and department are required');
    }

    // Check if record already exists
    const existing = await TrainingDetail.findOne({ reg_no: reg_no.trim() });
    if (existing) {
      res.status(400);
      throw new Error(`Record with register number '${reg_no}' already exists`);
    }

    const record = await TrainingDetail.create({
      reg_no: reg_no.trim(),
      name: name.trim(),
      department: department.trim().toUpperCase(),
      aptitude_score: Number(aptitude_score),
      coding_score: Number(coding_score),
      communication_score: Number(communication_score),
      mock_interview_score: Number(mock_interview_score),
      attendance: Number(attendance)
    });

    res.status(201).json({
      success: true,
      message: 'Training detail created successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing student training record
 * @route   PUT /api/training-details/:id
 * @access  Public
 */
const updateTrainingDetail = async (req, res, next) => {
  try {
    const {
      name,
      department,
      aptitude_score,
      coding_score,
      communication_score,
      mock_interview_score,
      attendance
    } = req.body;

    const record = await TrainingDetail.findById(req.params.id);
    if (!record) {
      res.status(404);
      throw new Error(`Training detail record with ID '${req.params.id}' not found`);
    }

    if (name !== undefined) record.name = name.trim();
    if (department !== undefined) record.department = department.trim().toUpperCase();
    if (aptitude_score !== undefined) record.aptitude_score = Number(aptitude_score);
    if (coding_score !== undefined) record.coding_score = Number(coding_score);
    if (communication_score !== undefined) record.communication_score = Number(communication_score);
    if (mock_interview_score !== undefined) record.mock_interview_score = Number(mock_interview_score);
    if (attendance !== undefined) record.attendance = Number(attendance);

    await record.save();

    res.status(200).json({
      success: true,
      message: 'Training detail updated successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a student training record
 * @route   DELETE /api/training-details/:id
 * @access  Public
 */
const deleteTrainingDetail = async (req, res, next) => {
  try {
    const record = await TrainingDetail.findByIdAndDelete(req.params.id);
    if (!record) {
      res.status(404);
      throw new Error(`Training detail record with ID '${req.params.id}' not found`);
    }

    res.status(200).json({
      success: true,
      message: 'Training detail deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk import training details via JSON array
 * @route   POST /api/training-details/import
 * @access  Public
 */
const importTrainingDetails = async (req, res, next) => {
  try {
    const records = Array.isArray(req.body) 
      ? req.body 
      : req.body.records || [];
    
    if (!Array.isArray(records) || records.length === 0) {
      res.status(400);
      throw new Error('Please provide a valid JSON array of training details to import');
    }

    const policy = req.query.policy || 'skip'; // 'skip' or 'overwrite'
    const stats = {
      inserted: 0,
      updated: 0,
      duplicates: 0,
      invalid: 0
    };

    for (const item of records) {
      const reg_no = item.reg_no ? String(item.reg_no).trim() : '';
      const name = item.name ? String(item.name).trim() : '';
      const department = item.department || item.dept ? String(item.department || item.dept).trim().toUpperCase() : '';
      
      const aptitude_score = item.aptitude_score !== undefined ? Number(item.aptitude_score) : NaN;
      const coding_score = item.coding_score !== undefined ? Number(item.coding_score) : NaN;
      const communication_score = item.communication_score !== undefined ? Number(item.communication_score) : NaN;
      const mock_interview_score = item.mock_interview_score !== undefined ? Number(item.mock_interview_score) : NaN;
      const attendance = item.attendance !== undefined ? Number(item.attendance) : NaN;

      // Basic validations
      if (
        !reg_no || 
        !name || 
        !department ||
        isNaN(aptitude_score) || aptitude_score < 0 || aptitude_score > 100 ||
        isNaN(coding_score) || coding_score < 0 || coding_score > 100 ||
        isNaN(communication_score) || communication_score < 0 || communication_score > 100 ||
        isNaN(mock_interview_score) || mock_interview_score < 0 || mock_interview_score > 100 ||
        isNaN(attendance) || attendance < 0 || attendance > 100
      ) {
        stats.invalid++;
        continue;
      }

      try {
        const existing = await TrainingDetail.findOne({ reg_no });
        const payload = {
          reg_no,
          name,
          department,
          aptitude_score,
          coding_score,
          communication_score,
          mock_interview_score,
          attendance
        };

        if (existing) {
          if (policy === 'overwrite') {
            await TrainingDetail.findByIdAndUpdate(existing._id, payload, { runValidators: true });
            stats.updated++;
          } else {
            stats.duplicates++;
          }
        } else {
          await TrainingDetail.create(payload);
          stats.inserted++;
        }
      } catch (err) {
        console.error(`Failed to bulk import student ${reg_no}:`, err.message);
        stats.invalid++;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk import of training details completed',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrainingDetails,
  getTrainingDetailByRegNo,
  createTrainingDetail,
  updateTrainingDetail,
  deleteTrainingDetail,
  importTrainingDetails
};
