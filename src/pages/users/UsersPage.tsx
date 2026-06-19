import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Plus,
  Pencil,
  UserMinus,
  UserPlus2,
  ChevronDown,
  Loader2,
  AlertCircle,
  X,
  Trash2,
} from 'lucide-react';
import { useUsers, useActivateUser, useDeactivateUser, useDeleteUser, type DbUser } from '../../hooks/useUsers';
import { CreateUserModal } from '../../components/CreateUserModal';
import { EditUserModal } from '../../components/EditUserModal';
import { useAuthStore } from '../../store/useAuthStore';
import type { UserRole } from '../../types';

/* ── role helpers ─────────────────────────────────────────────────────────── */
const ROLE_LABELS: Record<UserRole, string> = {
  director: 'Director',
  officer: 'Placement Officer',
  training: 'Training Staff',
};

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  director: 'bg-violet-50 border border-violet-200 text-violet-700',
  officer:  'bg-emerald-50 border border-emerald-200 text-emerald-700',
  training: 'bg-amber-50 border border-amber-200 text-amber-700',
};

/* ── stat card ───────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number;
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, iconBg, iconColor }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between kpi-card">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className={`p-2 rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
    </div>
    <p className="text-3xl font-black text-slate-800 mt-3">{value}</p>
  </div>
);

/* ── filter options ──────────────────────────────────────────────────────── */
type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Users' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const ROLE_FILTER_OPTIONS: { value: UserRole | 'all'; label: string }[] = [
  { value: 'all', label: 'All Roles' },
  { value: 'director', label: 'Director' },
  { value: 'officer', label: 'Placement Officer' },
  { value: 'training', label: 'Training Staff' },
];

/* ── component ───────────────────────────────────────────────────────────── */
export const UsersPage: React.FC = () => {
  const { data: users = [], isLoading, isError, error } = useUsers();
  const { mutateAsync: activateUser } = useActivateUser();
  const { mutateAsync: deactivateUser } = useDeactivateUser();
  const { mutateAsync: deleteUser } = useDeleteUser();
  const { userId, role: loggedInRole } = useAuthStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<DbUser | null>(null);

  const [userToDelete, setUserToDelete] = useState<DbUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete._id);
      setUserToDelete(null);
      setToastMessage('User deleted successfully.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setDeleteError(errorObj.response?.data?.message || errorObj.message || 'Failed to delete user.');
    } finally {
      setIsDeleting(false);
    }
  };

  /* ── derived stats ─────────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
  }), [users]);

  /* ── filtered list ─────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !term ||
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        ROLE_LABELS[u.role].toLowerCase().includes(term);

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive) ||
        (statusFilter === 'inactive' && !u.isActive);

      const matchRole = roleFilter === 'all' || u.role === roleFilter;

      return matchSearch && matchStatus && matchRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  /* ── actions ───────────────────────────────────────────────────────── */
  const handleDeactivate = async (id: string) => {
    setActionLoading(id + ':deactivate');
    try {
      await deactivateUser(id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (id: string) => {
    setActionLoading(id + ':activate');
    try {
      await activateUser(id);
    } finally {
      setActionLoading(null);
    }
  };

  /* ── format date ───────────────────────────────────────────────────── */
  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  /* ── render ────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">User Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage staff accounts and portal access.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Users"    value={stats.total}    icon={Users}       iconBg="bg-blue-50"    iconColor="text-blue-600" />
        <StatCard label="Active Users"   value={stats.active}   icon={UserCheck}   iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <StatCard label="Inactive Users" value={stats.inactive} icon={UserX}       iconBg="bg-rose-50"    iconColor="text-rose-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="appearance-none border border-slate-200 bg-white text-sm text-slate-700 rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Role filter */}
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className="appearance-none border border-slate-200 bg-white text-sm text-slate-700 rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            {ROLE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="overflow-x-auto animate-pulse">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="px-5 py-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-slate-200 rounded w-36"></div></td>
                    <td className="px-4 py-4"><div className="h-5 bg-slate-200 rounded-full w-24"></div></td>
                    <td className="px-4 py-4"><div className="h-5 bg-slate-200 rounded-full w-16"></div></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="px-5 py-4"><div className="h-6 bg-slate-200 rounded w-12 ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-20 gap-3 text-rose-500">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{(error as Error)?.message ?? 'Failed to load users'}</span>
          </div>
        ) : (
          <div className="overflow-x-auto animate-table-fade">
            <table className="w-full text-sm table-row-hover">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-slate-400 text-sm">
                      No users match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const isActing = actionLoading?.startsWith(u._id);
                    return (
                      <tr
                        key={u._id}
                        className={`hover:bg-slate-50 transition-colors ${!u.isActive ? 'opacity-60' : ''}`}
                      >
                        {/* Avatar + Name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                u.avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=e2e8f0&color=475569`
                              }
                              alt={u.name}
                              className="h-8 w-8 rounded-full border border-slate-200 object-cover flex-shrink-0"
                            />
                            <span className="font-semibold text-slate-800 truncate max-w-[140px]">{u.name}</span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3.5 text-slate-500 hidden md:table-cell">{u.email}</td>

                        {/* Role badge */}
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${ROLE_BADGE_CLASSES[u.role]}`}>
                            {ROLE_LABELS[u.role]}
                          </span>
                        </td>

                        {/* Status badge */}
                        <td className="px-4 py-3.5">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Created date */}
                        <td className="px-4 py-3.5 text-slate-400 text-xs hidden lg:table-cell">{fmtDate(u.createdAt)}</td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit */}
                            <button
                              onClick={() => setEditTarget(u)}
                              title="Edit User"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete */}
                            {loggedInRole === 'director' && !u.isActive && u.role !== 'director' && u._id !== userId && (
                              <button
                                onClick={() => {
                                  setDeleteError(null);
                                  setUserToDelete(u);
                                }}
                                title="Delete User"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Deactivate / Activate */}
                            {u.isActive ? (
                              <button
                                onClick={() => handleDeactivate(u._id)}
                                disabled={isActing}
                                title="Deactivate Account"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                              >
                                {isActing && actionLoading?.endsWith(':deactivate') ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UserMinus className="h-3.5 w-3.5" />
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(u._id)}
                                disabled={isActing}
                                title="Activate Account"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                              >
                                {isActing && actionLoading?.endsWith(':activate') ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UserPlus2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Footer row count */}
            {filtered.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                <p className="text-[10px] text-slate-400">
                  Showing <span className="font-bold text-slate-600">{filtered.length}</span> of <span className="font-bold text-slate-600">{users.length}</span> users
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {editTarget && <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} />}

      {/* Delete User Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-overlay-fade">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden animate-modal-scale">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-red-50 text-red-700 rounded-xl flex items-center justify-center">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Delete User</h2>
                  <p className="text-[10px] text-slate-500">Remove user permanently</p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-4">
              {deleteError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete this inactive user? This action cannot be undone.
              </p>
              
              {/* User preview */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-150">
                <img
                  src={userToDelete.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userToDelete.name)}&background=e2e8f0&color=475569`}
                  alt={userToDelete.name}
                  className="h-9 w-9 rounded-full border border-slate-200 object-cover"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">{userToDelete.name}</div>
                  <div className="text-[10px] text-slate-500">{userToDelete.email}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-red-500/10 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Delete Permanently'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showToast && (
        <div className="fixed top-20 right-5 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-800 flex items-center gap-3 z-[200] animate-toast-in">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-xs font-semibold">{toastMessage}</p>
          <button 
            onClick={() => setShowToast(false)} 
            className="text-slate-400 hover:text-white ml-2 transition-colors cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
