const fs = require('fs');
const xlsx = require('xlsx');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Placement = require('../models/Placement');
const HRContact = require('../models/HRContact');
const Department = require('../models/Department');

/**
 * Common master distribution engine for parsed arrays
 * @param {Array} records - Array of raw parsed records
 * @param {String} policy - Conflict resolution: 'skip' or 'overwrite'
 * @returns {Object} Relational import summary report stats
 */
const processBulkMasterUpload = async (records, policy = 'skip') => {
  const stats = {
    studentsInserted: 0,
    studentsUpdated: 0,
    companiesInserted: 0,
    companiesUpdated: 0,
    placementsInserted: 0,
    placementsUpdated: 0,
    hrInserted: 0,
    hrUpdated: 0,
    invalidRecords: 0,
    duplicateRecords: 0
  };

  // Pre-fetch current max placements serial number (sno) to increment sequentially
  let currentMaxSno = 0;
  try {
    const maxPlacement = await Placement.findOne({}).sort({ sno: -1 }).select('sno');
    if (maxPlacement && maxPlacement.sno) {
      currentMaxSno = Number(maxPlacement.sno);
    }
  } catch (err) {
    console.error('Error fetching max placement serial number:', err.message);
  }

  // Iterate over each record in bulk
  for (const row of records) {
    // 1. Normalize core student fields
    const reg_no = row.reg_no ? String(row.reg_no).trim() : '';
    const student_name = row.student_name || row.name ? String(row.student_name || row.name).trim() : '';
    const department = row.department || row.dept ? String(row.department || row.dept).trim().toUpperCase() : '';
    const section = row.section ? String(row.section).trim().toUpperCase() : '';
    const batch_year = Number(row.batch_year || row.year);
    const cgpa = row.cgpa !== undefined ? Number(row.cgpa) : NaN;
    const arrears = row.arrears !== undefined ? Number(row.arrears) : NaN;

    // Dynamically seed/create the department if it doesn't exist in our dynamic collections
    if (department) {
      try {
        const deptExists = await Department.findOne({ department_code: department });
        if (!deptExists) {
          await Department.create({
            department_code: department,
            department_name: department,
            active: true
          });
          console.log(`[Auto-Department] Created new department: ${department}`);
        }
      } catch (deptErr) {
        console.error(`Failed to auto-create department: ${department}`, deptErr.message);
      }
    }

    // Normalizing skills
    let skillsArray = [];
    if (row.skills) {
      if (Array.isArray(row.skills)) {
        skillsArray = row.skills.map(s => String(s).trim()).filter(Boolean);
      } else {
        skillsArray = String(row.skills).split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // Core validation checks (Required student records)
    if (!reg_no || !student_name || !department || isNaN(batch_year) || batch_year < 2000) {
      stats.invalidRecords++;
      continue;
    }

    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10 || isNaN(arrears) || arrears < 0) {
      stats.invalidRecords++;
      continue;
    }

    // Normalize optional relational entity fields
    const company_name = row.company_name || row.company ? String(row.company_name || row.company).trim() : '';
    const role = row.role ? String(row.role).trim() : '';
    const packageVal = row.package !== undefined ? Number(row.package) : NaN;
    const placement_status = row.placement_status ? String(row.placement_status).trim() : '';
    const drive_date = row.drive_date ? new Date(row.drive_date) : null;
    const hr_name = row.hr_name ? String(row.hr_name).trim() : '';
    const hr_email = row.hr_email || row.email ? String(row.hr_email || row.email).trim() : '';
    const hr_phone = row.hr_phone || row.phone ? String(row.hr_phone || row.phone).trim() : '';

    // Verify optional entity validation constraints
    let isRowInvalid = false;
    if (company_name) {
      if (row.package !== undefined && (isNaN(packageVal) || packageVal <= 0)) {
        isRowInvalid = true;
      }
      if (drive_date && isNaN(drive_date.getTime())) {
        isRowInvalid = true;
      }
      if (hr_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hr_email)) {
        isRowInvalid = true;
      }
    }

    if (isRowInvalid) {
      stats.invalidRecords++;
      continue;
    }

    // ─── A. PROCESS STUDENTS ───
    try {
      const existingStudent = await Student.findOne({ reg_no });
      const studentPayload = {
        reg_no,
        name: student_name,
        department,
        section,
        batch_year,
        cgpa,
        arrears,
        skills: skillsArray,
        placement_status: placement_status || 'Applied'
      };

      if (existingStudent) {
        if (policy === 'overwrite') {
          await Student.findByIdAndUpdate(existingStudent._id, studentPayload, { runValidators: true });
          stats.studentsUpdated++;
        } else {
          stats.duplicateRecords++;
        }
      } else {
        await Student.create(studentPayload);
        stats.studentsInserted++;
      }
    } catch (err) {
      console.error(`Failed to process Student record ${reg_no}:`, err.message);
      stats.invalidRecords++;
      continue; // Skip other entities for this row if core student fails
    }

    // ─── B. PROCESS COMPANIES ───
    if (company_name) {
      try {
        const existingCompany = await Company.findOne({ company_name });
        const companyPayload = {
          company_name,
          role: role || 'Campus Drive',
          package: !isNaN(packageVal) ? packageVal : 0,
          drive_date: drive_date || new Date(),
          status: 'Active'
        };

        if (existingCompany) {
          if (policy === 'overwrite') {
            await Company.findByIdAndUpdate(existingCompany._id, companyPayload, { runValidators: true });
            stats.companiesUpdated++;
          } else {
            stats.duplicateRecords++;
          }
        } else {
          await Company.create(companyPayload);
          stats.companiesInserted++;
        }
      } catch (err) {
        console.error(`Failed to process Company record ${company_name}:`, err.message);
      }
    }

    // ─── C. PROCESS PLACEMENTS ───
    if (company_name && placement_status) {
      try {
        const existingPlacement = await Placement.findOne({
          reg_no,
          company: company_name
        });

        if (existingPlacement) {
          if (policy === 'overwrite') {
            await Placement.findByIdAndUpdate(existingPlacement._id, {
              name: student_name,
              department,
              year: batch_year,
              batch_year,
              package: !isNaN(packageVal) ? packageVal : 0,
              placement_status,
              role
            }, { runValidators: true });
            stats.placementsUpdated++;
          } else {
            stats.duplicateRecords++;
          }
        } else {
          currentMaxSno++;
          await Placement.create({
            sno: currentMaxSno,
            name: student_name,
            reg_no,
            company: company_name,
            year: batch_year,
            batch_year,
            department,
            package: !isNaN(packageVal) ? packageVal : 0,
            placement_status
          });
          stats.placementsInserted++;
        }
      } catch (err) {
        console.error(`Failed to process Placement record ${reg_no} @ ${company_name}:`, err.message);
      }
    }

    // ─── D. PROCESS HR CONTACTS ───
    if (company_name && hr_name && hr_email) {
      try {
        const existingHR = await HRContact.findOne({
          company_name,
          email: hr_email
        });

        const hrPayload = {
          company_name,
          hr_name,
          email: hr_email,
          phone: hr_phone,
          designation: 'Talent Acquisition Head',
          notes: '• Imported via single master upload.',
          batch_year
        };

        if (existingHR) {
          if (policy === 'overwrite') {
            await HRContact.findByIdAndUpdate(existingHR._id, hrPayload, { runValidators: true });
            stats.hrUpdated++;
          } else {
            stats.duplicateRecords++;
          }
        } else {
          await HRContact.create(hrPayload);
          stats.hrInserted++;
        }
      } catch (err) {
        console.error(`Failed to process HR contact record ${hr_email}:`, err.message);
      }
    }
  }

  return stats;
};

/**
 * @desc    Upload master placement details via JSON body/file
 * @route   POST /api/upload/json
 * @access  Public
 */
const uploadJsonPlacements = async (req, res, next) => {
  try {
    let records = [];
    const policy = req.query.policy || 'skip';

    if (req.file) {
      const fileData = fs.readFileSync(req.file.path, 'utf8');
      records = JSON.parse(fileData);
      
      fs.unlink(req.file.path, (err) => {
        if (err) console.error(`Error deleting temp file: ${err}`);
      });
    } else if (Array.isArray(req.body)) {
      records = req.body;
    } else if (req.body.records && Array.isArray(req.body.records)) {
      records = req.body.records;
    } else if (req.body.placements && Array.isArray(req.body.placements)) {
      records = req.body.placements;
    } else if (req.body.students && Array.isArray(req.body.students)) {
      records = req.body.students;
    } else {
      res.status(400);
      throw new Error('Please upload a JSON file or provide a master JSON array in the body');
    }

    const summary = await processBulkMasterUpload(records, policy);

    res.status(200).json({
      success: true,
      message: 'Master JSON upload and distribution completed successfully',
      data: summary
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * @desc    Upload master placement details via CSV / Excel (.xlsx) file
 * @route   POST /api/upload/excel
 * @access  Public
 */
const uploadExcelPlacements = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an Excel (.xlsx) or CSV file');
    }

    const policy = req.query.policy || 'skip';

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const records = xlsx.utils.sheet_to_json(worksheet);

    fs.unlink(req.file.path, (err) => {
      if (err) console.error(`Error deleting temp file: ${err}`);
    });

    const summary = await processBulkMasterUpload(records, policy);

    res.status(200).json({
      success: true,
      message: 'Master spreadsheet upload and distribution completed successfully',
      data: summary
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

module.exports = {
  uploadJsonPlacements,
  uploadExcelPlacements
};
