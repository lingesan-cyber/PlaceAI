import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (role: UserRole, customEmail?: string) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  // ── Single-year filter ──────────────────────────────────────────────────
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  // ── Compare years mode ──────────────────────────────────────────────────
  /** Years selected for side-by-side comparison. Empty = not in compare mode. */
  compareYears: string[];
  /** Whether compare mode is active */
  isCompareMode: boolean;
  /** Set the list of years to compare */
  setCompareYears: (years: string[]) => void;
  /** Toggle compare mode on/off. Turning off also clears compareYears. */
  toggleCompareMode: () => void;
}

const roleNames: Record<UserRole, string> = {
  overall: 'Global Administrator',
  director: 'Dr. Sarah Jenkins (Director)',
  officer: 'Mr. Rajesh Kumar (Placement Officer)',
  training: 'Prof. Amit Sharma (Training Head)',
};

const roleEmails: Record<UserRole, string> = {
  overall: 'admin@placement.edu',
  director: 'director@placement.edu',
  officer: 'officer@placement.edu',
  training: 'training@placement.edu',
};

const roleAvatars: Record<UserRole, string> = {
  overall: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  director: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
  officer: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  training: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      // Default to empty string — Topbar will replace this with the latest year
      // once the /years API resolves. This means zero hardcoded years anywhere.
      selectedYear: '',
      login: (role, customEmail) => {
        const email = customEmail || roleEmails[role];
        const name = customEmail
          ? customEmail.split('@')[0].split(/[._-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
          : roleNames[role];

        set({
          user: {
            id: role,
            name: name,
            email: email,
            role,
            avatar: roleAvatars[role],
          },
          token: `mock-jwt-token-for-${role}`,
          isAuthenticated: true,
        });
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
      setRole: (role) => {
        set({
          user: {
            id: role,
            name: roleNames[role],
            email: roleEmails[role],
            role,
            avatar: roleAvatars[role],
          },
        });
      },
      setSelectedYear: (year) => {
        set({ selectedYear: year });
      },
      compareYears: [],
      isCompareMode: false,
      setCompareYears: (years) => {
        set({ compareYears: years });
      },
      toggleCompareMode: () => {
        set((state) => ({
          isCompareMode: !state.isCompareMode,
          // Clear selection when turning off so UI resets cleanly
          compareYears: state.isCompareMode ? [] : state.compareYears,
        }));
      },
    }),
    {
      name: 'placement-auth-store',
    }
  )
);
