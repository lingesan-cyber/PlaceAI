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

  // Validate batch year (supports legacy year field as fallback)
  const batchYear = Number(record.batch_year ?? record.year);
  if (!(record.batch_year ?? record.year) || isNaN(batchYear) || batchYear < 2000) {
    errors.push('batch_year must be a valid academic year >= 2000');
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

/**
 * Validates a student record used by the student management module.
 * @param {Object} record - The student record to validate.
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
const validateStudentRecord = (record) => {
  const errors = [];

  if (!record.reg_no || typeof record.reg_no !== 'string' || record.reg_no.trim() === '') {
    errors.push('reg_no is required');
  }

  if (!record.name || typeof record.name !== 'string' || record.name.trim() === '') {
    errors.push('name is required');
  }

  if (!record.department || typeof record.department !== 'string' || record.department.trim() === '') {
    errors.push('department is required');
  }

  const cgpa = Number(record.cgpa);
  if (record.cgpa === undefined || record.cgpa === null || Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
    errors.push('cgpa must be a number between 0 and 10');
  }

  const arrears = Number(record.arrears);
  if (record.arrears === undefined || record.arrears === null || Number.isNaN(arrears) || arrears < 0) {
    errors.push('arrears cannot be negative');
  }

  const skills = Array.isArray(record.skills) ? record.skills : String(record.skills || '').split(',');
  const hasValidSkill = skills.some((skill) => String(skill).trim() !== '');
  if (!hasValidSkill) {
    errors.push('skills must contain at least one value');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validatePlacementRecord,
  validateStudentRecord
};
