const mongoose = require('mongoose');

const placementSchema = new mongoose.Schema(
  {
    sno: {
      type: Number,
      required: [true, 'Serial number (sno) is required'],
      min: [1, 'Serial number must be greater than or equal to 1']
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true
    },
    reg_no: {
      type: String,
      trim: true
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    batch_year: {
      type: Number,
      default: function () {
        return this.year;
      },
      min: [2000, 'Batch year must be a valid academic year']
    },
    year: {
      type: Number,
      required: [true, 'Placement year is required'],
      min: [2000, 'Placement year must be a valid academic year']
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      uppercase: true,
      trim: true
    },
    package: {
      type: Number,
      default: 0,
      min: [0, 'Package value must be greater than or equal to 0']
    },
    placement_status: {
      type: String,
      default: 'Placed',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster lookups
placementSchema.index({ reg_no: 1 });
placementSchema.index({ batch_year: 1 });
placementSchema.index({ year: 1 });
placementSchema.index({ department: 1 });
placementSchema.index({ company: 1 });

// Compound unique index to prevent duplicate records
placementSchema.index({ reg_no: 1, batch_year: 1, company: 1 }, { unique: true });

const Placement = mongoose.model('Placement', placementSchema);

module.exports = Placement;
