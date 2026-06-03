import React, { useState, useEffect } from 'react';
import { X, User, Mail, ChevronDown, Image as ImageIcon, AlertCircle, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useUpdateUser, type DbUser, type UpdateUserPayload } from '../hooks/useUsers';
import type { UserRole } from '../types';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'overall', label: 'Overall Admin' },
  { value: 'director', label: 'Director' },
  { value: 'officer', label: 'Placement Officer' },
  { value: 'training', label: 'Training Staff' },
];

interface Props {
  user: DbUser;
  onClose: () => void;
}

export const EditUserModal: React.FC<Props> = ({ user, onClose }) => {
  const { mutateAsync: updateUser, isPending } = useUpdateUser();

  const [form, setForm] = useState<UpdateUserPayload>({
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isActive: user.isActive,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
    });
  }, [user]);

  const handleChange = (field: keyof UpdateUserPayload, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name?.trim() || !form.email?.trim()) {
      setError('Name and email are required.');
      return;
    }

    try {
      await updateUser({ id: user._id, payload: form });
      onClose();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      setError(errObj.response?.data?.message ?? errObj.message ?? 'Failed to update user');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e2e8f0&color=475569`}
              alt={user.name}
              className="h-9 w-9 rounded-full border border-slate-200 object-cover"
            />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Edit User</h2>
              <p className="text-[10px] text-slate-500">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">Full Name</span>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={form.name ?? ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full rounded-2xl border border-slate-300 pl-10 pr-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </label>

          {/* Email */}
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">Email Address</span>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full rounded-2xl border border-slate-300 pl-10 pr-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </label>

          {/* Role */}
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">Role</span>
            <div className="relative">
              <select
                value={form.role ?? 'officer'}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 pr-9 py-3 text-sm text-slate-900 bg-white appearance-none outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </label>

          {/* Avatar URL */}
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">Avatar URL</span>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="url"
                value={form.avatar ?? ''}
                onChange={(e) => handleChange('avatar', e.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-slate-300 pl-10 pr-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder-slate-400"
              />
            </div>
          </label>

          {/* Status toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <p className="text-sm font-semibold text-slate-800">Account Status</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {form.isActive ? 'User can log in normally' : 'User is blocked from logging in'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('isActive', !form.isActive)}
              className="flex-shrink-0 cursor-pointer transition-transform hover:scale-110"
            >
              {form.isActive ? (
                <ToggleRight className="h-8 w-8 text-emerald-500" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-slate-400" />
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
