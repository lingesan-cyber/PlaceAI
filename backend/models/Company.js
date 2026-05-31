const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    company_name: {
      type: String,
      required: [true, 'Company name is required'],
      unique: true,
      trim: true
    },
    package: {
      type: Number,
      default: 0,
      min: [0, 'Package value must be greater than or equal to 0']
    },
    drive_date: {
      type: Date,
      required: [true, 'Drive date is required']
    },
    status: {
      type: String,
      default: 'Active',
      enum: {
        values: ['Active', 'Completed', 'Upcoming'],
        message: 'Status must be Active, Completed, or Upcoming'
      },
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
