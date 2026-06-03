const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const backendPackage = require('../package.json');

const SETTINGS_KEY = 'global-settings';

const DEFAULT_SETTINGS = {
  key: SETTINGS_KEY,
  institution: {
    college_name: '',
    college_logo: '',
    placement_cell_email: '',
    placement_cell_phone: ''
  },
  placement_rules: {
    default_cgpa_cutoff: 6,
    default_arrear_limit: 0,
    default_placement_status: 'Pending'
  },
  importer_settings: {
    default_conflict_policy: 'skip_duplicates',
    allowed_file_types: ['csv', 'xlsx', 'xls', 'json'],
    maximum_upload_size_mb: 25
  },
  dashboard_preferences: {
    default_landing_dashboard: 'overall',
    theme_preference: 'system'
  }
};

const trimString = (value, fallback = '') => (typeof value === 'string' ? value.trim() : fallback);

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseAllowedFileTypes = (value, fallback) => {
  if (Array.isArray(value)) {
    const list = value.map((item) => trimString(item).toLowerCase()).filter(Boolean);
    return list.length > 0 ? Array.from(new Set(list)) : fallback;
  }

  if (typeof value === 'string') {
    const list = value
      .split(',')
      .map((item) => trimString(item).toLowerCase())
      .filter(Boolean);
    return list.length > 0 ? Array.from(new Set(list)) : fallback;
  }

  return fallback;
};

const normalizeSettingsPayload = (body = {}) => ({
  institution: {
    college_name: trimString(body?.institution?.college_name, DEFAULT_SETTINGS.institution.college_name),
    college_logo: trimString(body?.institution?.college_logo, DEFAULT_SETTINGS.institution.college_logo),
    placement_cell_email: trimString(body?.institution?.placement_cell_email, DEFAULT_SETTINGS.institution.placement_cell_email),
    placement_cell_phone: trimString(body?.institution?.placement_cell_phone, DEFAULT_SETTINGS.institution.placement_cell_phone)
  },
  placement_rules: {
    default_cgpa_cutoff: parseNumber(body?.placement_rules?.default_cgpa_cutoff, DEFAULT_SETTINGS.placement_rules.default_cgpa_cutoff),
    default_arrear_limit: parseNumber(body?.placement_rules?.default_arrear_limit, DEFAULT_SETTINGS.placement_rules.default_arrear_limit),
    default_placement_status: trimString(body?.placement_rules?.default_placement_status, DEFAULT_SETTINGS.placement_rules.default_placement_status)
  },
  importer_settings: {
    default_conflict_policy: trimString(body?.importer_settings?.default_conflict_policy, DEFAULT_SETTINGS.importer_settings.default_conflict_policy),
    allowed_file_types: parseAllowedFileTypes(
      body?.importer_settings?.allowed_file_types,
      DEFAULT_SETTINGS.importer_settings.allowed_file_types
    ),
    maximum_upload_size_mb: parseNumber(
      body?.importer_settings?.maximum_upload_size_mb,
      DEFAULT_SETTINGS.importer_settings.maximum_upload_size_mb
    )
  },
  dashboard_preferences: {
    default_landing_dashboard: trimString(
      body?.dashboard_preferences?.default_landing_dashboard,
      DEFAULT_SETTINGS.dashboard_preferences.default_landing_dashboard
    ),
    theme_preference: trimString(body?.dashboard_preferences?.theme_preference, DEFAULT_SETTINGS.dashboard_preferences.theme_preference)
  }
});

const mergeSettings = (existing, incoming) => ({
  ...DEFAULT_SETTINGS,
  ...(existing || {}),
  ...incoming,
  institution: {
    ...DEFAULT_SETTINGS.institution,
    ...(existing?.institution || {}),
    ...(incoming?.institution || {})
  },
  placement_rules: {
    ...DEFAULT_SETTINGS.placement_rules,
    ...(existing?.placement_rules || {}),
    ...(incoming?.placement_rules || {})
  },
  importer_settings: {
    ...DEFAULT_SETTINGS.importer_settings,
    ...(existing?.importer_settings || {}),
    ...(incoming?.importer_settings || {})
  },
  dashboard_preferences: {
    ...DEFAULT_SETTINGS.dashboard_preferences,
    ...(existing?.dashboard_preferences || {}),
    ...(incoming?.dashboard_preferences || {})
  }
});

const buildMeta = () => {
  const readyState = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    application_version: backendPackage.version,
    build_information: {
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version,
      process_id: process.pid,
      server_time: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime())
    },
    mongodb_connection_status: {
      ready_state: readyState,
      status: statusMap[readyState] || 'unknown',
      host: mongoose.connection.host || '',
      name: mongoose.connection.name || ''
    }
  };
};

const getStoredSettings = async () => {
  const settings = await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: DEFAULT_SETTINGS },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  ).lean();

  return mergeSettings(DEFAULT_SETTINGS, settings);
};

/**
 * @desc    Get portal settings and live system metadata
 * @route   GET /api/settings
 * @access  Public
 */
const getSettings = async (req, res, next) => {
  try {
    const settings = await getStoredSettings();

    res.status(200).json({
      success: true,
      message: 'Settings retrieved successfully',
      data: {
        settings,
        meta: buildMeta()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update portal settings
 * @route   PUT /api/settings
 * @access  Public
 */
const updateSettings = async (req, res, next) => {
  try {
    const currentSettings = await getStoredSettings();
    const normalized = normalizeSettingsPayload(req.body);
    const merged = mergeSettings(currentSettings, normalized);
    const { key, ...settingsToSave } = merged;

    const settings = await Settings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      {
        $set: settingsToSave,
        $setOnInsert: { key: SETTINGS_KEY }
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    ).lean();

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        settings: mergeSettings(DEFAULT_SETTINGS, settings),
        meta: buildMeta()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings
};