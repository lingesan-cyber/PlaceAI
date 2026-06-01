const mongoose = require('mongoose');

const hrContactSchema = new mongoose.Schema(
  {
    company_name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    hr_name: {
      type: String,
      required: [true, 'HR name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    designation: {
      type: String,
      default: 'Talent Acquisition Head',
      trim: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    batch_year: {
      type: Number,
      required: [true, 'Batch year is required'],
      min: [2000, 'Batch year must be a valid academic year >= 2000']
    }
  },
  {
    timestamps: true,
    collection: 'hr_contacts'
  }
);

// Indexes for fast querying
hrContactSchema.index({ company_name: 1 });
hrContactSchema.index({ batch_year: 1 });

const HRContact = mongoose.model('HRContact', hrContactSchema);

module.exports = HRContact;
