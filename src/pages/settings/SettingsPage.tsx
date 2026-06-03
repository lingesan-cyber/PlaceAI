import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Building2, CheckCircle2, Database, Info, Settings2, Lock, User, Eye, EyeOff } from 'lucide-react';
import { fetchPortalSettings, savePortalSettings } from '../../api/settingsApi';
import type { PortalSettings, PortalSettingsMeta, SettingsPayload } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';

type SettingsTab = 'account' | 'general' | 'about';

const DEFAULT_SETTINGS: PortalSettings = {
  key: 'global-settings',
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
  },
  createdAt: '',
  updatedAt: ''
};

const cloneSettings = (settings: PortalSettings): PortalSettings => ({
  ...settings,
  institution: { ...settings.institution },
  placement_rules: { ...settings.placement_rules },
  importer_settings: {
    ...settings.importer_settings,
    allowed_file_types: [...settings.importer_settings.allowed_file_types]
  },
  dashboard_preferences: { ...settings.dashboard_preferences }
});

const normalizeSettings = (settings?: PortalSettings | null): PortalSettings => {
  if (!settings) return cloneSettings(DEFAULT_SETTINGS);

  return {
    key: settings.key || DEFAULT_SETTINGS.key,
    institution: {
      college_name: settings.institution?.college_name || '',
      college_logo: settings.institution?.college_logo || '',
      placement_cell_email: settings.institution?.placement_cell_email || '',
      placement_cell_phone: settings.institution?.placement_cell_phone || ''
    },
    placement_rules: {
      default_cgpa_cutoff: Number(settings.placement_rules?.default_cgpa_cutoff ?? DEFAULT_SETTINGS.placement_rules.default_cgpa_cutoff),
      default_arrear_limit: Number(settings.placement_rules?.default_arrear_limit ?? DEFAULT_SETTINGS.placement_rules.default_arrear_limit),
      default_placement_status: settings.placement_rules?.default_placement_status || DEFAULT_SETTINGS.placement_rules.default_placement_status
    },
    importer_settings: {
      default_conflict_policy: settings.importer_settings?.default_conflict_policy || DEFAULT_SETTINGS.importer_settings.default_conflict_policy,
      allowed_file_types: Array.isArray(settings.importer_settings?.allowed_file_types)
        ? settings.importer_settings.allowed_file_types.filter(Boolean)
        : [...DEFAULT_SETTINGS.importer_settings.allowed_file_types],
      maximum_upload_size_mb: Number(settings.importer_settings?.maximum_upload_size_mb ?? DEFAULT_SETTINGS.importer_settings.maximum_upload_size_mb)
    },
    dashboard_preferences: {
      default_landing_dashboard: settings.dashboard_preferences?.default_landing_dashboard || DEFAULT_SETTINGS.dashboard_preferences.default_landing_dashboard,
      theme_preference: settings.dashboard_preferences?.theme_preference || DEFAULT_SETTINGS.dashboard_preferences.theme_preference
    },
    createdAt: settings.createdAt || '',
    updatedAt: settings.updatedAt || ''
  };
};

const formatMeta = (meta?: PortalSettingsMeta | null) => {
  if (!meta) {
    return {
      application_version: 'Unknown',
      build_information: {
        environment: 'unknown',
        node_version: 'unknown',
        process_id: 0,
        server_time: 'unknown',
        uptime_seconds: 0
      },
      mongodb_connection_status: {
        ready_state: 0,
        status: 'unknown',
        host: '',
        name: ''
      }
    };
  }

  return meta;
};

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  // Account Settings Form State
  const [accountForm, setAccountForm] = useState({ name: '', email: '', avatar: '' });
  const [savedAccount, setSavedAccount] = useState({ name: '', email: '', avatar: '' });
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // General Settings Form State
  const [generalForm, setGeneralForm] = useState({
    portalName: '',
    defaultLandingDashboard: 'overall',
    themePreference: 'system',
    defaultConflictPolicy: 'skip_duplicates',
    defaultExportFormat: 'xlsx',
    recordsPerPage: 25,
  });
  const [savedGeneral, setSavedGeneral] = useState({
    portalName: '',
    defaultLandingDashboard: 'overall',
    themePreference: 'system',
    defaultConflictPolicy: 'skip_duplicates',
    defaultExportFormat: 'xlsx',
    recordsPerPage: 25,
  });

  const [meta, setMeta] = useState<PortalSettingsMeta | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const savedSettingsRef = useRef<PortalSettings>(cloneSettings(DEFAULT_SETTINGS));
  const toastTimer = useRef<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchPortalSettings,
    staleTime: 30 * 1000
  });

  const mutation = useMutation({
    mutationFn: savePortalSettings,
    onSuccess: (response) => {
      const nextSettings = normalizeSettings(response.settings);
      savedSettingsRef.current = cloneSettings(nextSettings);

      const localExport = localStorage.getItem('placement_default_export_format') || 'xlsx';
      const localRecords = Number(localStorage.getItem('placement_records_per_page') || '25');

      const gen = {
        portalName: nextSettings.institution.college_name || '',
        defaultLandingDashboard: nextSettings.dashboard_preferences.default_landing_dashboard || 'overall',
        themePreference: nextSettings.dashboard_preferences.theme_preference || 'system',
        defaultConflictPolicy: nextSettings.importer_settings.default_conflict_policy || 'skip_duplicates',
        defaultExportFormat: localExport,
        recordsPerPage: localRecords
      };
      setGeneralForm(gen);
      setSavedGeneral(gen);

      setMeta(formatMeta(response.meta));
      setValidationError('');
      queryClient.setQueryData(['settings'], response);
    },
    onError: () => {
      setValidationError('Unable to save settings right now. Please try again.');
    }
  });

  const isSaving = isSavingAccount || mutation.isPending;

  // Hydrate DB settings + localStorage general settings
  useEffect(() => {
    if (!data) return;

    const nextSettings = normalizeSettings(data.settings);
    savedSettingsRef.current = cloneSettings(nextSettings);

    const localExport = localStorage.getItem('placement_default_export_format') || 'xlsx';
    const localRecords = Number(localStorage.getItem('placement_records_per_page') || '25');

    const gen = {
      portalName: nextSettings.institution.college_name || '',
      defaultLandingDashboard: nextSettings.dashboard_preferences.default_landing_dashboard || 'overall',
      themePreference: nextSettings.dashboard_preferences.theme_preference || 'system',
      defaultConflictPolicy: nextSettings.importer_settings.default_conflict_policy || 'skip_duplicates',
      defaultExportFormat: localExport,
      recordsPerPage: localRecords
    };

    setGeneralForm(gen);
    setSavedGeneral(gen);
    setMeta(formatMeta(data.meta));
    setIsHydrated(true);
  }, [data]);

  // Hydrate user profile settings from Zustand store
  useEffect(() => {
    if (user) {
      const u = {
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || ''
      };
      setAccountForm(u);
      setSavedAccount(u);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const hasUnsavedChanges = isHydrated && (
    JSON.stringify(accountForm) !== JSON.stringify(savedAccount) ||
    JSON.stringify(generalForm) !== JSON.stringify(savedGeneral)
  );

  const handleCancel = () => {
    setAccountForm(savedAccount);
    setGeneralForm(savedGeneral);
    setValidationError('');
    setToastVisible(false);
    setToastMessage('');
  };

  const handleSaveChanges = async () => {
    // Validate Account fields
    if (!accountForm.name.trim()) {
      setValidationError('Full name is required.');
      return;
    }
    if (!accountForm.email.trim()) {
      setValidationError('Email address is required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(accountForm.email)) {
      setValidationError('Email address is invalid.');
      return;
    }

    // Validate General fields
    if (!generalForm.portalName.trim()) {
      setValidationError('Portal name is required.');
      return;
    }

    setValidationError('');
    setIsSavingAccount(true);

    const hasAccountChanges = JSON.stringify(accountForm) !== JSON.stringify(savedAccount);
    const hasGeneralChanges = JSON.stringify(generalForm) !== JSON.stringify(savedGeneral);

    try {
      if (hasAccountChanges) {
        const { updateProfile } = useAuthStore.getState();
        await updateProfile({
          name: accountForm.name,
          email: accountForm.email,
          avatar: accountForm.avatar
        });
        const u = {
          name: accountForm.name,
          email: accountForm.email,
          avatar: accountForm.avatar
        };
        setSavedAccount(u);
      }

      if (hasGeneralChanges) {
        // Save local storage settings
        localStorage.setItem('placement_default_export_format', generalForm.defaultExportFormat);
        localStorage.setItem('placement_records_per_page', String(generalForm.recordsPerPage));

        // Build schema settings payload for DB (keeping backend validation safe)
        const payload: SettingsPayload = {
          institution: {
            ...savedSettingsRef.current.institution,
            college_name: generalForm.portalName
          },
          placement_rules: savedSettingsRef.current.placement_rules,
          importer_settings: {
            ...savedSettingsRef.current.importer_settings,
            default_conflict_policy: generalForm.defaultConflictPolicy
          },
          dashboard_preferences: {
            ...savedSettingsRef.current.dashboard_preferences,
            default_landing_dashboard: generalForm.defaultLandingDashboard,
            theme_preference: generalForm.themePreference
          }
        };

        await mutation.mutateAsync(payload);
      }

      // Show success toast
      setToastMessage('Changes saved successfully');
      setToastVisible(true);
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
      }
      toastTimer.current = window.setTimeout(() => setToastVisible(false), 2500);

    } catch (err: unknown) {
      console.error(err);
      const errorObj = err as {
        response?: {
          data?: {
            message?: string;
          };
        };
        message?: string;
      };
      const msg = errorObj.response?.data?.message || errorObj.message || 'Unable to save changes right now. Please try again.';
      setValidationError(msg);
    } finally {
      setIsSavingAccount(false);
    }
  };

  const isPasswordValid = 
    currentPassword.trim().length > 0 &&
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    newPassword === confirmPassword;

  const handleUpdatePassword = async () => {
    if (!isPasswordValid) return;
    
    setPasswordError('');
    setPasswordSuccess('');
    setIsSavingPassword(true);

    try {
      const { changePassword } = useAuthStore.getState();
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword
      });

      setPasswordSuccess('Password updated successfully');
      // Clear fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      console.error(err);
      const errorObj = err as {
        response?: {
          data?: {
            message?: string;
          };
        };
        message?: string;
      };
      const msg = errorObj.response?.data?.message || errorObj.message || 'Unable to update password. Please try again.';
      setPasswordError(msg);
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading && !isHydrated) {
    return (
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
        <div className="h-10 w-48 rounded-lg bg-slate-200 animate-pulse" />
        <div className="h-[32rem] rounded-3xl bg-white border border-slate-200 shadow-sm animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <h1 className="text-lg font-bold">Unable to load settings</h1>
              <p className="text-sm mt-1">The portal could not fetch settings from MongoDB. Please verify the backend service and database connection.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center shadow-lg">
            <Settings2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
            <p className="text-sm text-slate-500 mt-0.5">Configure placement portal preferences and system settings.</p>
          </div>
        </div>
      </div>

      {/* Tabs Inline Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'account'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span className="text-sm">👤</span> Account Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span className="text-sm">⚙️</span> General Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('about')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'about'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span className="text-sm">ℹ️</span> About System
        </button>
      </div>

      {/* Unsaved changes & validation errors */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {toastVisible ? (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm">
            <CheckCircle2 className="h-4 w-4" />
            {toastMessage}
          </div>
        ) : (
          <div />
        )}

        {hasUnsavedChanges && (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm">
            <span className="text-base leading-none text-amber-500 animate-pulse">●</span>
            Unsaved Changes
          </div>
        )}
      </div>

      {validationError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
          {validationError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={!hasUnsavedChanges || isSaving}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={!hasUnsavedChanges || isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Main Content Area - Full width */}
      <section className="w-full space-y-6">
        {activeTab === 'account' && (
          <>
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Account Settings</h2>
                <p className="text-sm text-slate-500">Manage your user profile identity and settings.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <FieldLabel label="Full Name">
                  <input
                    type="text"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm((current) => ({ ...current, name: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. John Doe"
                  />
                </FieldLabel>

                <FieldLabel label="Email Address">
                  <input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm((current) => ({ ...current, email: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. john@placement.edu"
                  />
                </FieldLabel>

                <FieldLabel label="User Role (Read-Only)">
                  <input
                    type="text"
                    value={
                      user?.role === 'overall' ? 'Global Administrator' :
                      user?.role === 'director' ? 'Director' :
                      user?.role === 'officer' ? 'Placement Officer' :
                      user?.role === 'training' ? 'Training Staff' :
                      user?.role || 'User'
                    }
                    disabled
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none cursor-not-allowed"
                  />
                </FieldLabel>
              </div>

              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6">
                <div className="mb-4 flex flex-col items-center text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400 text-center mb-3">Profile Preview</p>
                  <div className="h-32 w-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-lg flex items-center justify-center mb-3">
                    {accountForm.avatar ? (
                      <img
                        src={accountForm.avatar}
                        alt={accountForm.name || 'User avatar'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-16 w-16 text-slate-300" />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 truncate max-w-[240px]">{accountForm.name || 'Your Name'}</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[240px] mt-0.5">{accountForm.email || 'your-email@domain.edu'}</p>
                  <span className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {
                      user?.role === 'overall' ? 'Global Admin' :
                      user?.role === 'director' ? 'Director' :
                      user?.role === 'officer' ? 'Placement Officer' :
                      user?.role === 'training' ? 'Training Staff' :
                      user?.role || 'User'
                    }
                  </span>
                </div>
                <div className="w-full max-w-sm mt-2">
                  <FieldLabel label="Profile Picture URL">
                    <input
                      type="url"
                      value={accountForm.avatar}
                      onChange={(e) => setAccountForm((current) => ({ ...current, avatar: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-xs text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Paste profile image URL"
                    />
                  </FieldLabel>
                </div>
              </div>
            </div>

          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-7 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
                <p className="text-sm text-slate-500">Update your account credentials. Securely hashed using bcrypt.</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {passwordSuccess}
              </div>
            )}

            {passwordError && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {passwordError}
              </div>
            )}

            <div className="space-y-5 max-w-xl">
              {/* Current Password Field */}
              <FieldLabel label="Current Password">
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 pl-4 pr-12 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 outline-none"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FieldLabel>

              {/* New Password Field */}
              <FieldLabel label="New Password">
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 pl-4 pr-12 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 outline-none"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Live Password Strength Checklist */}
                {newPassword && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-medium">
                    <p className="font-bold text-slate-500 mb-1">New Password Requirements:</p>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className={newPassword.length >= 8 ? "text-emerald-500 font-bold" : "text-slate-400 font-bold"}>
                        {newPassword.length >= 8 ? '✓' : '✗'}
                      </span>
                      <span className={newPassword.length >= 8 ? "text-slate-700" : "text-slate-400"}>At least 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className={/[A-Z]/.test(newPassword) ? "text-emerald-500 font-bold" : "text-slate-400 font-bold"}>
                        {/[A-Z]/.test(newPassword) ? '✓' : '✗'}
                      </span>
                      <span className={/[A-Z]/.test(newPassword) ? "text-slate-700" : "text-slate-400"}>At least 1 uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className={/[a-z]/.test(newPassword) ? "text-emerald-500 font-bold" : "text-slate-400 font-bold"}>
                        {/[a-z]/.test(newPassword) ? '✓' : '✗'}
                      </span>
                      <span className={/[a-z]/.test(newPassword) ? "text-slate-700" : "text-slate-400"}>At least 1 lowercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className={/[0-9]/.test(newPassword) ? "text-emerald-500 font-bold" : "text-slate-400 font-bold"}>
                        {/[0-9]/.test(newPassword) ? '✓' : '✗'}
                      </span>
                      <span className={/[0-9]/.test(newPassword) ? "text-slate-700" : "text-slate-400"}>At least 1 number</span>
                    </div>
                  </div>
                )}
              </FieldLabel>

              {/* Confirm Password Field */}
              <FieldLabel label="Confirm Password">
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 pl-4 pr-12 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 outline-none"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Live Password Confirmation matching message */}
                {confirmPassword && (
                  <div className="mt-2 text-xs font-semibold">
                    {newPassword === confirmPassword ? (
                      <span className="text-emerald-600">✅ Passwords match</span>
                    ) : (
                      <span className="text-rose-600">❌ Passwords do not match</span>
                    )}
                  </div>
                )}
              </FieldLabel>

              {/* Update Password Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={!isPasswordValid || isSavingPassword}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {isSavingPassword ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

        {/* TAB 2: GENERAL SETTINGS */}
        {activeTab === 'general' && (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">General Settings</h2>
                <p className="text-sm text-slate-500">Configure global portal parameters and defaults.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Portal Name */}
              <FieldLabel label="Portal Name">
                <input
                  type="text"
                  value={generalForm.portalName}
                  onChange={(e) => setGeneralForm((current) => ({ ...current, portalName: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. PLACE AI"
                />
              </FieldLabel>

              {/* 2. Default Landing Dashboard */}
              <FieldLabel label="Default Landing Dashboard">
                <select
                  value={generalForm.defaultLandingDashboard}
                  onChange={(e) => setGeneralForm((current) => ({ ...current, defaultLandingDashboard: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 bg-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="overall">Overall Analytics</option>
                  <option value="director">Director Dashboard</option>
                  <option value="officer">Placement Officer</option>
                  <option value="training">Training Staff</option>
                </select>
              </FieldLabel>

              {/* 3. Default Export Format */}
              <FieldLabel label="Default Export Format">
                <select
                  value={generalForm.defaultExportFormat}
                  onChange={(e) => setGeneralForm((current) => ({ ...current, defaultExportFormat: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 bg-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="csv">CSV</option>
                </select>
              </FieldLabel>

              {/* 4. Default Import Conflict Policy */}
              <FieldLabel label="Default Import Conflict Policy">
                <select
                  value={generalForm.defaultConflictPolicy}
                  onChange={(e) => setGeneralForm((current) => ({ ...current, defaultConflictPolicy: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 bg-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="skip_duplicates">Skip Duplicates</option>
                  <option value="update_existing">Update Existing</option>
                </select>
              </FieldLabel>

              {/* 5. Records Per Page */}
              <FieldLabel label="Records Per Page">
                <select
                  value={generalForm.recordsPerPage}
                  onChange={(e) => setGeneralForm((current) => ({ ...current, recordsPerPage: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 bg-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </FieldLabel>

              {/* 6. Theme Preference */}
              <FieldLabel label="Theme Preference">
                <select
                  value={generalForm.themePreference}
                  onChange={(e) => setGeneralForm((current) => ({ ...current, themePreference: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 bg-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Theme selection is a future-ready feature placeholder.</p>
              </FieldLabel>
            </div>
          </div>
        )}

        {/* TAB 3: ABOUT SYSTEM */}
        {activeTab === 'about' && (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">About System</h2>
                <p className="text-sm text-slate-500">Placement portal software and connection state information.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoCard
                title="Application Name"
                value="PLACE AI"
                icon={Building2}
                tone="blue"
              />
              <InfoCard
                title="Version"
                value={meta?.application_version ? `v${meta.application_version}` : 'v1.0.0'}
                icon={Settings2}
                tone="slate"
              />
              <InfoCard
                title="Build Date"
                value={
                  meta?.build_information?.server_time
                    ? new Date(meta.build_information.server_time).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : new Date().toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                }
                icon={Info}
                tone="slate"
              />
              <InfoCard
                title="Database Name"
                value={meta?.mongodb_connection_status?.name || 'PlaceAI'}
                icon={Database}
                tone={meta?.mongodb_connection_status?.status === 'connected' ? 'green' : 'slate'}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-800 mb-1">Live Backend Status</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Environment: <span className="font-semibold uppercase font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">{meta?.build_information?.environment || 'development'}</span> · Node Version: <span className="font-semibold">{meta?.build_information?.node_version || 'N/A'}</span> · Uptime: <span className="font-semibold">{meta?.build_information?.uptime_seconds ?? 0}s</span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-800 mb-1">Database Connectivity</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Status: <span className={`font-semibold uppercase font-mono text-[10px] px-1.5 py-0.5 rounded ${meta?.mongodb_connection_status?.status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{meta?.mongodb_connection_status?.status || 'disconnected'}</span> · Connection Host: <span className="font-semibold font-mono text-[10px] break-all">{meta?.mongodb_connection_status?.host || 'localhost'}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

const FieldLabel: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">{label}</span>
    {children}
  </label>
);

const InfoCard: React.FC<{
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'blue' | 'green' | 'slate';
}> = ({ title, value, icon: Icon, tone }) => {
  const toneClass = tone === 'blue'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : tone === 'green'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${toneClass} mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800 break-words">{value}</p>
    </div>
  );
};