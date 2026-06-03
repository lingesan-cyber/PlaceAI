import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { 
  LayoutDashboard, 
  Award, 
  Briefcase, 
  BookOpen, 
  LogOut, 
  ShieldCheck, 
  GraduationCap,
  Settings2
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      name: 'Overall Analytics',
      path: '/dashboard/overall',
      icon: LayoutDashboard,
      roles: ['overall', 'director', 'officer', 'training'],
    },
    {
      name: 'Director Dashboard',
      path: '/dashboard/director',
      icon: Award,
      roles: ['director'],
    },
    {
      name: 'Placement Officer',
      path: '/dashboard/officer',
      icon: Briefcase,
      roles: ['officer'],
    },
    {
      name: 'Training Staff',
      path: '/dashboard/training',
      icon: BookOpen,
      roles: ['training'],
    },
    {
      name: 'Settings',
      path: '/dashboard/settings',
      icon: Settings2,
      roles: ['overall', 'director', 'officer', 'training'],
    },
  ];

  // Filter items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (!user) return false;
    if (user.role === 'overall') return true;
    return item.roles.includes(user.role);
  });

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800 shadow-xl transition-all duration-300">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3 bg-slate-950/40">
        <GraduationCap className="h-8 w-8 text-violet-500" />
        <span className="font-extrabold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">
          Placement Portal
        </span>
      </div>

      {/* Profile Detail */}
      {user && (
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-3">
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="h-10 w-10 rounded-full border-2 border-violet-500/50 object-cover shadow-md"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
              <div className="flex items-center gap-1 mt-1">
                <ShieldCheck className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider truncate">
                  {user.role === 'overall' ? 'Global Admin' : `${user.role} Portal`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
          Navigation
        </p>
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/20"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn(
                    "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                  )} />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg text-sm font-medium transition-all duration-200 group"
        >
          <LogOut className="h-5 w-5 text-slate-400 group-hover:text-red-400 transition-transform duration-200 group-hover:translate-x-1" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
