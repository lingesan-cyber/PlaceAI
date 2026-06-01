const mongoose = require('mongoose');
const { DEPARTMENTS } = require('../constants/departments');

const studentSchema = new mongoose.Schema(
  {
    reg_no: {
      type: String,
      required: [true, 'Register number is required'],
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      uppercase: true,
      enum: {
        values: DEPARTMENTS,
        message: 'Invalid department: {VALUE}. Must be one of: ' + DEPARTMENTS.join(', ')
      },
      trim: true
    },
    cgpa: {
      type: Number,
      required: [true, 'CGPA is required'],
      min: [0, 'CGPA must be at least 0'],
      max: [10, 'CGPA must not exceed 10']
    },
    arrears: {
      type: Number,
      default: 0,
      min: [0, 'Arrears cannot be negative']
    },
    skills: {
      type: [String],
      default: []
    },
    placement_status: {
      type: String,
      default: 'Applied',
      enum: {
        values: ['Applied', 'Pending', 'Rejected', 'Placed'],
        message: 'Placement status must be Applied, Pending, Rejected, or Placed'
      },
      trim: true
    },
    aptitude: {
      type: Number,
      min: [0, 'Aptitude must be at least 0'],
      max: [100, 'Aptitude must not exceed 100']
    },
    coding: {
      type: Number,
      min: [0, 'Coding must be at least 0'],
      max: [100, 'Coding must not exceed 100']
    },
    communication: {
      type: Number,
      min: [0, 'Communication must be at least 0'],
      max: [100, 'Communication must not exceed 100']
    },
    mockInterview: {
      type: Number,
      min: [0, 'Mock interview must be at least 0'],
      max: [100, 'Mock interview must not exceed 100']
    },
    attendance: {
      type: Number,
      min: [0, 'Attendance must be at least 0'],
      max: [100, 'Attendance must not exceed 100']
    },
    avgScore: {
      type: Number,
      min: [0, 'Average score must be at least 0'],
      max: [100, 'Average score must not exceed 100']
    },
    readinessLevel: {
      type: String,
      enum: {
        values: ['Highly Placeable', 'Placement Ready', 'Needs Improvement', 'High Risk'],
        message: 'Invalid readiness level'
      }
    }
  },
  {
    timestamps: true
  }
);

studentSchema.index({ name: 1 });
studentSchema.index({ department: 1 });
studentSchema.index({ placement_status: 1 });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;