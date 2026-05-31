const mongoose = require('mongoose');

const batchYearSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: [true, 'Academic batch year is required'],
      unique: true,
      min: [2000, 'Academic batch year must be at least 2000']
    },
    visible: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const BatchYear = mongoose.model('BatchYear', batchYearSchema);

module.exports = BatchYear;
