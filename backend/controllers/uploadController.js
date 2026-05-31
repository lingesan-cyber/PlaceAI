const fs = require('fs');
const xlsx = require('xlsx');
const Placement = require('../models/Placement');
const { validatePlacementRecord } = require('../utils/validator');

/**
 * Common processor for parsed placement arrays
 * @param {Array} records - Array of raw parsed records
 * @returns {Object} Statistics summary
 */
const processBulkPlacements = async (records) => {
  let importedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  const validRecordsToInsert = [];
  const processedBatchKeys = new Set();

  // 1. Gather all unique years from this upload to query DB once
  const years = [...new Set(records.map(r => Number(r.year)).filter(y => !isNaN(y) && y >= 2000))];

  // 2. Fetch existing records for these years to build in-memory duplicate checking keys
  const existingRecords = await Placement.find({ year: { $in: years } }, 'reg_no year company');
  const existingKeys = new Set(
    existingRecords.map(r => `${String(r.reg_no).trim().toLowerCase()}_${r.year}_${String(r.company).trim().toLowerCase()}`)
  );

  // 3. Loop and validate each row
  for (const row of records) {
    // Basic normalization of fields
    const normalizedRow = {
      sno: row.sno,
      name: row.name,
      reg_no: row.reg_no,
      company: row.company,
      year: row.year,
      department: row.department,
      package: row.package,
      placement_status: row.placement_status
    };

    // Run custom validator utility
    const validation = validatePlacementRecord(normalizedRow);
    if (!validation.isValid) {
      invalidCount++;
      continue;
    }

    // Build compound key check: reg_no + year + company (lowercased & trimmed)
    const regNoStr = String(normalizedRow.reg_no).trim().toLowerCase();
    const companyStr = String(normalizedRow.company).trim().toLowerCase();
    const compoundKey = `${regNoStr}_${Number(normalizedRow.year)}_${companyStr}`;

    // Verify database constraint and current upload block double submissions
    if (existingKeys.has(compoundKey) || processedBatchKeys.has(compoundKey)) {
      duplicateCount++;
      continue;
    }

    processedBatchKeys.add(compoundKey);
    validRecordsToInsert.push({
      sno: Number(normalizedRow.sno),
      name: String(normalizedRow.name).trim(),
      reg_no: String(normalizedRow.reg_no).trim(),
      company: String(normalizedRow.company).trim(),
      year: Number(normalizedRow.year),
      department: String(normalizedRow.department).trim().toUpperCase(),
      package: Number(normalizedRow.package) || 0,
      placement_status: normalizedRow.placement_status || 'Placed'
    });
  }

  // 4. Batch insert valid entries
  if (validRecordsToInsert.length > 0) {
    await Placement.insertMany(validRecordsToInsert, { ordered: false });
    importedCount = validRecordsToInsert.length;
  }

  return {
    importedRecords: importedCount,
    duplicateRecords: duplicateCount,
    invalidRecords: invalidCount
  };
};

/**
 * @desc    Upload placements via JSON document/body
 * @route   POST /api/upload/json
 * @access  Public
 */
const uploadJsonPlacements = async (req, res, next) => {
  try {
    let records = [];

    // Check if uploaded as a multipart file or passed directly in request body
    if (req.file) {
      const fileData = fs.readFileSync(req.file.path, 'utf8');
      records = JSON.parse(fileData);
      
      // Cleanup uploaded file from disk asynchronously
      fs.unlink(req.file.path, (err) => {
        if (err) console.error(`Error deleting temp file: ${err}`);
      });
    } else if (Array.isArray(req.body)) {
      records = req.body;
    } else if (req.body.placements && Array.isArray(req.body.placements)) {
      records = req.body.placements;
    } else {
      res.status(400);
      throw new Error('Please upload a JSON file or provide a placements JSON array in the body');
    }

    const summary = await processBulkPlacements(records);

    res.status(200).json({
      success: true,
      message: 'JSON upload completed successfully',
      data: summary
    });
  } catch (error) {
    // Delete temp file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * @desc    Upload placements via CSV / Excel (.xlsx) file
 * @route   POST /api/upload/excel
 * @access  Public
 */
const uploadExcelPlacements = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an Excel (.xlsx) or CSV file');
    }

    // Read and parse spreadsheet
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const records = xlsx.utils.sheet_to_json(worksheet);

    // Cleanup temp file from disk asynchronously
    fs.unlink(req.file.path, (err) => {
      if (err) console.error(`Error deleting temp file: ${err}`);
    });

    const summary = await processBulkPlacements(records);

    res.status(200).json({
      success: true,
      message: 'Spreadsheet upload completed successfully',
      data: summary
    });
  } catch (error) {
    // Delete temp file if error occurs
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
