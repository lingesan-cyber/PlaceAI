import React, { useState } from 'react';
import { X, User, Mail, Lock, ChevronDown, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import { useCreateUser, type CreateUserPayload } from '../hooks/useUsers';
import type { UserRole } from '../types';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'director', label: 'Director' },
  { value: 'officer', label: 'Placement Officer' },
  { value: 'training', label: 'Training Staff' },
];

interface Props {
  onClose: () => void;
}

export const CreateUserModal: React.FC<Props> = ({ onClose }) => {
  const { mutateAsync: createUser, isPending } = useCreateUser();

  const [form, setForm] = useState<CreateUserPayload>({
    name: '',
    email: '',
    password: '',
    role: 'officer',
    avatar: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof CreateUserPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Name, email, and password are required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      const payload: CreateUserPayload = { ...form };
      if (!payload.avatar?.trim()) delete payload.avatar;
      await createUser(payload);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      setError(errObj.response?.data?.message ?? errObj.message ?? 'Failed to create user');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-overlay-fade">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden animate-modal-scale">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Create User</h2>
              <p className="text-[10px] text-slate-500">Add a new staff account</p>
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
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full rounded-2xl border border-slate-300 pl-10 pr-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder-slate-400"
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
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="e.g. john@placement.edu"
                className="w-full rounded-2xl border border-slate-300 pl-10 pr-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder-slate-400"
              />
            </div>
          </label>

          {/* Password */}
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">Password</span>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full rounded-2xl border border-slate-300 pl-10 pr-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder-slate-400"
              />
            </div>
          </label>

          {/* Role */}
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">Role</span>
            <div className="relative">
              <select
                value={form.role}
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

          {/* Avatar URL (optional) */}
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
              Avatar URL <span className="normal-case text-slate-400 font-normal">(optional)</span>
            </span>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="url"
                value={form.avatar}
                onChange={(e) => handleChange('avatar', e.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-slate-300 pl-10 pr-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder-slate-400"
              />
            </div>
          </label>

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
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
