const Student = require('../models/Student');
const { validateStudentRecord } = require('../utils/validator');

const normalizeSkills = (skills) => {
  if (skills === undefined || skills === null) return [];
  if (Array.isArray(skills)) {
    return skills.map((skill) => String(skill).trim()).filter(Boolean);
  }
  return String(skills)
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);
};

const buildStudentPayload = (body) => {
  const reg_no = typeof body.reg_no === 'string' ? body.reg_no.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const department = typeof body.department === 'string' ? body.department.trim().toUpperCase() : '';
  const cgpa = Number(body.cgpa);
  const arrears = Number(body.arrears);
  const placement_status = typeof body.placement_status === 'string' && body.placement_status.trim()
    ? body.placement_status.trim()
    : 'Applied';

  const section = typeof body.section === 'string' ? body.section.trim().toUpperCase() : '';

  const payload = {
    reg_no,
    name,
    department,
    section,
    cgpa,
    arrears: Number.isFinite(arrears) ? arrears : 0,
    skills: normalizeSkills(body.skills),
    placement_status,
  };

  const scoreFields = ['aptitude', 'coding', 'communication', 'mockInterview', 'attendance', 'avgScore'];
  scoreFields.forEach((field) => {
    if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
      const value = Number(body[field]);
      if (!Number.isNaN(value)) {
        payload[field] = value;
      }
    }
  });

  if (body.readinessLevel) {
    payload.readinessLevel = String(body.readinessLevel).trim();
  }

  return payload;
};

const buildStudentFilter = (query) => {
  const filter = {};

  const batchYear = query.batch_year ?? query.year;
  if (batchYear && String(batchYear).trim().toLowerCase() !== 'all') {
    const numericYear = Number(batchYear);
    if (!Number.isNaN(numericYear)) {
      filter.batch_year = numericYear;
    }
  }

  if (query.department) {
    filter.department = String(query.department).trim().toUpperCase();
  }

  if (query.status) {
    filter.placement_status = String(query.status).trim();
  }

  if (query.search) {
    const searchRegex = new RegExp(String(query.search).trim(), 'i');
    filter.$or = [
      { name: searchRegex },
      { reg_no: searchRegex },
      { department: searchRegex },
      { skills: searchRegex }
    ];
  }

  if (query.minCgpa !== undefined) {
    const minCgpa = Number(query.minCgpa);
    if (!Number.isNaN(minCgpa)) {
      filter.cgpa = { ...filter.cgpa, $gte: minCgpa };
    }
  }

  if (query.maxArrears !== undefined) {
    const maxArrears = Number(query.maxArrears);
    if (!Number.isNaN(maxArrears)) {
      filter.arrears = { ...filter.arrears, $lte: maxArrears };
    }
  }

  return filter;
};

const getStudents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 10000);
    const skip = (page - 1) * limit;
    const filter = buildStudentFilter(req.query);

    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .sort({ reg_no: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Students retrieved successfully',
      data: {
        students,
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

const getStudentById = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    let student = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      student = await Student.findById(req.params.id);
    }
    if (!student) {
      student = await Student.findOne({ reg_no: req.params.id });
    }
    
    if (!student) {
      res.status(404);
      throw new Error(`Student with ID or Register Number '${req.params.id}' not found`);
    }

    res.status(200).json({
      success: true,
      message: 'Student details retrieved',
      data: student
    });
  } catch (error) {
    next(error);
  }
};

const createStudent = async (req, res, next) => {
  try {
    const payload = buildStudentPayload(req.body);
    const validation = validateStudentRecord(payload);

    if (!validation.isValid) {
      res.status(400);
      throw new Error(`Validation Error: ${validation.errors.join(', ')}`);
    }

    const existing = await Student.findOne({ reg_no: payload.reg_no });
    if (existing) {
      res.status(409);
      throw new Error(`Student with Register Number '${payload.reg_no}' already exists`);
    }

    const student = await Student.create(payload);

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: student
    });
  } catch (error) {
    next(error);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const payload = buildStudentPayload(req.body);
    const validation = validateStudentRecord(payload);

    if (!validation.isValid) {
      res.status(400);
      throw new Error(`Validation Error: ${validation.errors.join(', ')}`);
    }

    const existing = await Student.findOne({ reg_no: payload.reg_no, _id: { $ne: req.params.id } });
    if (existing) {
      res.status(409);
      throw new Error(`Student with Register Number '${payload.reg_no}' already exists`);
    }

    const student = await Student.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    if (!student) {
      res.status(404);
      throw new Error(`Student with ID '${req.params.id}' not found`);
    }

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    next(error);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      res.status(404);
      throw new Error(`Student with ID '${req.params.id}' not found`);
    }

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
};