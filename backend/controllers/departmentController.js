const Department = require('../models/Department');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Public
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({}).sort({ department_code: 1 });
    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: departments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new department
// @route   POST /api/departments
// @access  Public
const createDepartment = async (req, res, next) => {
  try {
    const { department_code, department_name, active } = req.body;
    if (!department_code) {
      res.status(400);
      throw new Error('Department code is required');
    }

    const codeUpper = String(department_code).trim().toUpperCase();

    // Check for duplicates
    const existing = await Department.findOne({ department_code: codeUpper });
    if (existing) {
      res.status(400);
      throw new Error(`Department with code '${codeUpper}' already exists`);
    }

    const department = await Department.create({
      department_code: codeUpper,
      department_name: department_name ? String(department_name).trim() : codeUpper,
      active: active !== undefined ? Boolean(active) : true
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a department
// @route   PUT /api/departments/:id
// @access  Public
const updateDepartment = async (req, res, next) => {
  try {
    const { department_code, department_name, active } = req.body;
    const department = await Department.findById(req.params.id);
    if (!department) {
      res.status(404);
      throw new Error(`Department with ID '${req.params.id}' not found`);
    }

    if (department_code !== undefined) {
      const codeUpper = String(department_code).trim().toUpperCase();
      if (codeUpper !== department.department_code) {
        // Check for duplicates on code change
        const existing = await Department.findOne({ department_code: codeUpper });
        if (existing) {
          res.status(400);
          throw new Error(`Department with code '${codeUpper}' already exists`);
        }
        department.department_code = codeUpper;
      }
    }

    if (department_name !== undefined) {
      department.department_name = String(department_name).trim();
    }

    if (active !== undefined) {
      department.active = Boolean(active);
    }

    await department.save();

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a department
// @route   DELETE /api/departments/:id
// @access  Public
const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      res.status(404);
      throw new Error(`Department with ID '${req.params.id}' not found`);
    }

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
