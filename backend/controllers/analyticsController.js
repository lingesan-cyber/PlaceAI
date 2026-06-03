const Placement = require('../models/Placement');
const Company = require('../models/Company');
const Student = require('../models/Student');


/**
 * @desc    Get placement overview metrics
 * @route   GET /api/analytics/overview
 * @access  Public
 */
const getOverviewAnalytics = async (req, res, next) => {
  try {
    const rawBatchYear = req.query.batch_year ?? req.query.year;
    const isAll = !rawBatchYear || String(rawBatchYear).trim().toLowerCase() === 'all';
    
    const studentFilter = isAll ? {} : { $or: [{ batch_year: Number(rawBatchYear) }, { year: Number(rawBatchYear) }] };
    const placementFilter = isAll ? {} : { $or: [{ batch_year: Number(rawBatchYear) }, { year: Number(rawBatchYear) }] };

    if (isAll) {
      console.log(`all -> unfiltered aggregate`);
    } else {
      console.log(`${Number(rawBatchYear)} -> filtered`);
    }

    const totalStudents = await Student.countDocuments(studentFilter);
    const placedStudents = await Placement.countDocuments({
      ...placementFilter,
      placement_status: 'Placed'
    });

    const uniqueCompanies = !isAll
      ? await Placement.distinct('company', placementFilter)
      : await Placement.distinct('company');

    const totalCompanies = uniqueCompanies.length > 0
      ? uniqueCompanies.length
      : await Company.countDocuments({});

    const placementPercentage = totalStudents > 0
      ? parseFloat(((placedStudents / totalStudents) * 100).toFixed(1))
      : 0.0;

    res.status(200).json({
      success: true,
      message: 'Overview analytics retrieved successfully',
      data: {
        totalStudents,
        placedStudents,
        placementPercentage,
        totalCompanies
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get department-wise placement counts and rankings
 * @route   GET /api/analytics/departments
 * @access  Public
 */
const getDepartmentAnalytics = async (req, res, next) => {
  try {
    const rawBatchYear = req.query.batch_year ?? req.query.year;
    const isAll = !rawBatchYear || String(rawBatchYear).trim().toLowerCase() === 'all';

    if (isAll) {
      console.log(`all -> unfiltered aggregate`);
    } else {
      console.log(`${Number(rawBatchYear)} -> filtered`);
    }

    const matchStage = isAll
      ? {}
      : {
          $or: [
            { batch_year: Number(rawBatchYear) },
            { year: Number(rawBatchYear) }
          ]
        };

    const deptStats = await Placement.aggregate([
      {
        $match: matchStage
      },
      {
        $addFields: {
          effectiveBatchYear: { $ifNull: ['$batch_year', '$year'] }
        }
      },
      {
        $group: {
          _id: '$department',
          placedCount: { $sum: 1 },
          highestPackage: { $max: '$package' },
          avgPackage: { $avg: '$package' }
        }
      },
      {
        $project: {
          _id: 0,
          department: '$_id',
          placedCount: 1,
          highestPackage: 1,
          avgPackage: { $round: ['$avgPackage', 1] }
        }
      },
      {
        $sort: { placedCount: -1 }
      }
    ]);

    // Compute relative rankings & mock eligible student ratio for frontend compatibility
    const studentCounts = await Student.aggregate([
      {
        $match: isAll
          ? {}
          : {
              $or: [
                { batch_year: Number(rawBatchYear) },
                { year: Number(rawBatchYear) }
              ]
            }
      },
      {
        $group: {
          _id: '$department',
          totalStudents: { $sum: 1 }
        }
      }
    ]);

    const studentCountMap = new Map(studentCounts.map((row) => [row._id, row.totalStudents]));

    const rankings = deptStats.map((item, index) => {
      const estimatedCohort = studentCountMap.get(item.department) || item.placedCount || 0;
      const placementPercentage = estimatedCohort > 0 
        ? parseFloat(((item.placedCount / estimatedCohort) * 100).toFixed(1))
        : 0.0;

      return {
        rank: index + 1,
        ...item,
        estimatedCohort,
        placementPercentage
      };
    });

    res.status(200).json({
      success: true,
      message: 'Departmental placement analytics compiled',
      data: rankings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get company-wise selection statistics
 * @route   GET /api/analytics/companies
 * @access  Public
 */
const getCompanyAnalytics = async (req, res, next) => {
  try {
    const rawBatchYear = req.query.batch_year ?? req.query.year;
    const isAll = !rawBatchYear || String(rawBatchYear).trim().toLowerCase() === 'all';

    if (isAll) {
      console.log(`all -> unfiltered aggregate`);
    } else {
      console.log(`${Number(rawBatchYear)} -> filtered`);
    }

    const matchStage = isAll
      ? {}
      : {
          $or: [
            { batch_year: Number(rawBatchYear) },
            { year: Number(rawBatchYear) }
          ]
        };

    const companyStats = await Placement.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: '$company',
          hiringCount: { $sum: 1 },
          maxPackageOffer: { $max: '$package' },
          avgPackageOffer: { $avg: '$package' }
        }
      },
      {
        $project: {
          _id: 0,
          company: '$_id',
          hiringCount: 1,
          maxPackageOffer: 1,
          avgPackageOffer: { $round: ['$avgPackageOffer', 1] }
        }
      },
      {
        $sort: { hiringCount: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Company placement analytics compiled',
      data: companyStats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverviewAnalytics,
  getDepartmentAnalytics,
  getCompanyAnalytics
};
