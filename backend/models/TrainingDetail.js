const mongoose = require('mongoose');

const trainingDetailSchema = new mongoose.Schema(
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
      trim: true
    },
    aptitude_score: {
      type: Number,
      required: [true, 'Aptitude score is required'],
      min: [0, 'Aptitude score must be at least 0'],
      max: [100, 'Aptitude score cannot exceed 100']
    },
    coding_score: {
      type: Number,
      required: [true, 'Coding score is required'],
      min: [0, 'Coding score must be at least 0'],
      max: [100, 'Coding score cannot exceed 100']
    },
    communication_score: {
      type: Number,
      required: [true, 'Communication score is required'],
      min: [0, 'Communication score must be at least 0'],
      max: [100, 'Communication score cannot exceed 100']
    },
    mock_interview_score: {
      type: Number,
      required: [true, 'Mock interview score is required'],
      min: [0, 'Mock interview score must be at least 0'],
      max: [100, 'Mock interview score cannot exceed 100']
    },
    attendance: {
      type: Number,
      required: [true, 'Attendance is required'],
      min: [0, 'Attendance must be at least 0'],
      max: [100, 'Attendance cannot exceed 100']
    }
  },
  {
    timestamps: true,
    collection: 'training_details'
  }
);

trainingDetailSchema.index({ department: 1 });

const TrainingDetail = mongoose.model('TrainingDetail', trainingDetailSchema);

module.exports = TrainingDetail;
