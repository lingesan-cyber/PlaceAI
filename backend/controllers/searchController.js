const Student = require('../models/Student');
const Company = require('../models/Company');
const Placement = require('../models/Placement');
const HRContact = require('../models/HRContact');
const TrainingDetail = require('../models/TrainingDetail');

/**
 * Executes a case-insensitive search across all core data collections.
 * @desc    Global search across students, companies, placements, HR contacts, and training records.
 * @route   GET /api/search?q=<query>
 * @access  Public
 */
const searchAll = async (req, res, next) => {
  try {
    const query = req.query.q ? String(req.query.q).trim() : '';

    // If query is empty or less than 2 characters, return empty categories array
    if (query.length < 2) {
      return res.status(200).json({
        success: true,
        message: 'Search query must be at least 2 characters',
        data: {
          students: [],
          companies: [],
          placements: [],
          hr_contacts: [],
          training_details: []
        }
      });
    }

    const regex = new RegExp(query, 'i');

    // Run parallel queries across all five collections using lean for performance
    const [students, rawCompanies, placements, hr_contacts, rawTrainingDetails] = await Promise.all([
      Student.find({
        $or: [
          { name: regex },
          { reg_no: regex },
          { department: regex }
        ]
      }).limit(15).lean(),

      Company.find({
        $or: [
          { company_name: regex }
        ]
      }).limit(15).lean(),

      Placement.find({
        $or: [
          { name: regex },
          { reg_no: regex },
          { company: regex },
          { department: regex }
        ]
      }).limit(15).lean(),

      HRContact.find({
        $or: [
          { hr_name: regex },
          { company_name: regex },
          { email: regex }
        ]
      }).limit(15).lean(),

      TrainingDetail.find({
        $or: [
          { name: regex },
          { reg_no: regex },
          { department: regex }
        ]
      }).limit(15).lean()
    ]);

    // Format companies to include a batch_year derived from drive_date
    const companies = rawCompanies.map(c => ({
      ...c,
      batch_year: c.drive_date ? new Date(c.drive_date).getFullYear() : null
    }));

    // Resolve student batch_year for each training detail record
    const training_details = await Promise.all(
      rawTrainingDetails.map(async (td) => {
        const student = await Student.findOne({ reg_no: td.reg_no }).select('batch_year').lean();
        return {
          ...td,
          batch_year: student ? student.batch_year : null
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Global search completed successfully',
      data: {
        students,
        companies,
        placements,
        hr_contacts,
        training_details
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchAll
};

