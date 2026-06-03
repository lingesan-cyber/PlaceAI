import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore } from '../store/useAuthStore';
import type { UserRole } from '../types';
import { GraduationCap, Shield, UserCheck, KeyRound, Mail, Lock, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Define Zod validation schema for login
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFields = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login, logout, isAuthenticated, token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { from?: { pathname?: string } } | null;
  const from = state?.from?.pathname || "/dashboard/overall";

  React.useEffect(() => {
    if (isAuthenticated && !token) {
      logout(); // Clear stale sessions from localStorage that lack a mock JWT token
    }
  }, [isAuthenticated, token, logout]);

  React.useEffect(() => {
    if (isAuthenticated && token) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, token, navigate, from]);

  // React Hook Form initialization
  const { 
    register, 
    handleSubmit, 
    setValue, 
    setError, 
    formState: { errors } 
  } = useForm<LoginFields>({
    defaultValues: {
      email: '',
      password: '',
    }
  });

  // Map demo emails to their roles
  const demoAccounts: { email: string; role: UserRole; label: string; desc: string; icon: LucideIcon; color: string }[] = [
    {
      email: 'admin@placement.edu',
      role: 'overall',
      label: 'Global Admin',
      desc: 'All Portals & Insights',
      icon: Shield,
      color: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
    },
    {
      email: 'director@placement.edu',
      role: 'director',
      label: 'College Director',
      desc: 'Executive KPIs & stacked analytics',
      icon: GraduationCap,
      color: 'bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20'
    },
    {
      email: 'officer@placement.edu',
      role: 'officer',
      label: 'Placement Officer',
      desc: 'Recruiter grids & calendar timelines',
      icon: UserCheck,
      color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
    },
    {
      email: 'training@placement.edu',
      role: 'training',
      label: 'Training Staff',
      desc: 'Mock testing scores & radar chart',
      icon: KeyRound,
      color: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
    }
  ];

  const onSubmit = (data: LoginFields) => {
    // Validate manually against Zod schema (already validated via hook-form, but double check)
    const validationResult = loginSchema.safeParse(data);
    if (!validationResult.success) {
      validationResult.error.errors.forEach(err => {
        setError(err.path[0] as keyof LoginFields, { type: 'manual', message: err.message });
      });
      return;
    }

    const emailLower = data.email.toLowerCase().trim();
    const matchedAccount = demoAccounts.find(acc => acc.email === emailLower);

    let role: UserRole = 'overall'; // Default role
    if (matchedAccount) {
      role = matchedAccount.role;
    } else {
      // Guess role from email prefix/content for any custom email
      if (emailLower.includes('director')) {
        role = 'director';
      } else if (emailLower.includes('officer') || emailLower.includes('placement')) {
        role = 'officer';
      } else if (emailLower.includes('training') || emailLower.includes('staff')) {
        role = 'training';
      }
    }

    // Simulate successful login and store JWT token + user role in Zustand authStore
    login(role, data.email);
    navigate(from, { replace: true });
  };

  const handleAutofill = (email: string) => {
    setValue('email', email);
    setValue('password', 'password');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>

      {/* Main card */}
      <div className="w-full max-w-lg bg-slate-950/40 backdrop-blur-md border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col">
        
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <GraduationCap className="h-8 w-8 text-blue-400" />
          </div>
          <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">
            Placement Portal
          </span>
        </div>

        <h1 className="text-xl md:text-2xl font-black text-white text-center tracking-tight">
          Welcome back!
        </h1>
        <p className="text-slate-400 text-xs text-center mt-1 leading-relaxed">
          Sign in to access your placement analytics workstation.
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                {...register('email')}
                placeholder="e.g. admin@placement.edu"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder-slate-600"
              />
            </div>
            {errors.email && (
              <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{errors.email.message}</span>
              </span>
            )}
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder-slate-600"
              />
            </div>
            {errors.password && (
              <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{errors.password.message}</span>
              </span>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] cursor-pointer"
          >
            Sign In
          </button>
        </form>

        {/* Demo accounts quick autofill */}
        <div className="mt-6 border-t border-slate-800/80 pt-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            Demo Portal Credentials (Autofill)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleAutofill(acc.email)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 ${acc.color}`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold">{acc.label}</span>
                  </div>
                  <span className="text-[8px] opacity-75 mt-0.5 block truncate max-w-full font-medium">
                    {acc.email}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[9px] text-slate-600 text-center mt-6">
          Placement Portal Suite &bull; Secured with persistent JSON Web State
        </p>
      </div>
    </div>
  );
};
