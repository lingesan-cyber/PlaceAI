const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'global-settings',
      unique: true,
      immutable: true
    },
    institution: {
      college_name: {
        type: String,
        default: ''
      },
      college_logo: {
        type: String,
        default: ''
      },
      placement_cell_email: {
        type: String,
        default: ''
      },
      placement_cell_phone: {
        type: String,
        default: ''
      }
    },
    placement_rules: {
      default_cgpa_cutoff: {
        type: Number,
        default: 6,
        min: 0,
        max: 10
      },
      default_arrear_limit: {
        type: Number,
        default: 0,
        min: 0
      },
      default_placement_status: {
        type: String,
        default: 'Pending',
        enum: ['Applied', 'Shortlisted', 'Interviewed', 'Placed', 'Pending', 'Rejected']
      }
    },
    importer_settings: {
      default_conflict_policy: {
        type: String,
        default: 'skip_duplicates',
        enum: ['skip_duplicates', 'update_existing']
      },
      allowed_file_types: {
        type: [String],
        default: ['csv', 'xlsx', 'xls', 'json']
      },
      maximum_upload_size_mb: {
        type: Number,
        default: 25,
        min: 1
      }
    },
    dashboard_preferences: {
      default_landing_dashboard: {
        type: String,
        default: 'overall',
        enum: ['overall', 'director', 'officer', 'training']
      },
      theme_preference: {
        type: String,
        default: 'system',
        enum: ['system', 'light', 'dark', 'auto']
      }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;