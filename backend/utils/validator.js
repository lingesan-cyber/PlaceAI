const { DEPARTMENTS } = require('../constants/departments');

/**
 * Validates a single placement record.
 * @param {Object} record - The placement record to validate.
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
const validatePlacementRecord = (record) => {
  const errors = [];

  // Validate serial number (sno)
  const sno = Number(record.sno);
  if (!record.sno || isNaN(sno) || sno < 1) {
    errors.push('sno must be a number greater than or equal to 1');
  }

  // Validate name
  if (!record.name || typeof record.name !== 'string' || record.name.trim() === '') {
    errors.push('name must be a non-empty string');
  }

  // Validate register number (reg_no)
  if (!record.reg_no || (typeof record.reg_no !== 'string' && typeof record.reg_no !== 'number') || String(record.reg_no).trim() === '') {
    errors.push('reg_no must be a non-empty string or number');
  }

  // Validate company
  if (!record.company || typeof record.company !== 'string' || record.company.trim() === '') {
    errors.push('company must be a non-empty string');
  }

  // Validate year
  const year = Number(record.year);
  if (!record.year || isNaN(year) || year < 2000) {
    errors.push('year must be a valid academic year >= 2000');
  }

  // Validate department
  if (!record.department || typeof record.department !== 'string') {
    errors.push('department must be a string');
  } else {
    const deptUpper = record.department.trim().toUpperCase();
    if (!DEPARTMENTS.includes(deptUpper)) {
      errors.push(`department '${record.department}' is invalid. Must be one of: ${DEPARTMENTS.join(', ')}`);
    }
  }

  // Validate optional package field
  if (record.package !== undefined && record.package !== null) {
    const pkg = Number(record.package);
    if (isNaN(pkg) || pkg < 0) {
      errors.push('package must be a positive number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validatePlacementRecord
};
