const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    department_code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    department_name: {
      type: String,
      trim: true,
      default: function () {
        return this.department_code;
      }
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
