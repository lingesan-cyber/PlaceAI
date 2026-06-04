import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, AlertCircle } from 'lucide-react';

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
    setError, 
    formState: { errors } 
  } = useForm<LoginFields>({
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);

  const onSubmit = async (data: LoginFields) => {
    const validationResult = loginSchema.safeParse(data);
    if (!validationResult.success) {
      validationResult.error.errors.forEach(err => {
        setError(err.path[0] as keyof LoginFields, { type: 'manual', message: err.message });
      });
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      await login(data.email.toLowerCase().trim(), data.password);
      navigate(from, { replace: true });
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
      const msg = errorObj.response?.data?.message || errorObj.message || 'Invalid email or password';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[140px] pointer-events-none"></div>
      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,6,23,0.6))] pointer-events-none"></div>

      {/* Main card */}
      <div className="w-full max-w-[460px] bg-slate-950/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col animate-fade-in-up">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <div className="mb-4 p-3 bg-slate-900/40 border border-slate-800/60 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.08)]">
            <img 
              src="/sona_logo.png" 
              alt="Sona College Logo" 
              className="h-10 w-auto object-contain" 
            />
          </div>
          <h1 className="font-extrabold text-2xl text-white tracking-tight">
            Placement Portal
          </h1>
          <p className="text-slate-400 text-[11px] mt-1.5 font-medium tracking-wide">
            Placement Management & Analytics System
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                {...register('email')}
                placeholder="e.g. admin@placement.edu"
                className="w-full bg-slate-900/40 border border-slate-800/80 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/80 hover:border-slate-700/80 transition-all duration-300 font-medium"
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
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="w-full bg-slate-900/40 border border-slate-800/80 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/80 hover:border-slate-700/80 transition-all duration-300 font-medium"
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
            disabled={loading}
            className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 shadow-[0_4px_12px_rgba(59,130,246,0.15)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.25)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Login to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};
