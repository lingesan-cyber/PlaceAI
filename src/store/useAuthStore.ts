import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';
import { apiClient } from '../lib/apiClient';

interface AuthState {
  userId: string | null;
  name: string | null;
  email: string | null;
  role: UserRole | null;
  token: string | null;
  user: User | null; // Legacy object for backward compatibility
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  updateProfile: (profile: { name: string; email: string; avatar: string }) => Promise<void>;
  changePassword: (payload: Record<string, string>) => Promise<void>;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      name: null,
      email: null,
      role: null,
      token: null,
      user: null,
      isAuthenticated: false,
      selectedYear: '',
      login: async (email, password, role) => {
        const response = await apiClient.post('/auth/login', { email, password, role });
        const { data } = response.data;
        set({
          userId: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          token: data.token,
          isAuthenticated: true,
          user: {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            avatar: data.avatar,
          },
        });
      },
      register: async (name, email, password, role) => {
        const response = await apiClient.post('/auth/register', { name, email, password, role });
        const { data } = response.data;
        set({
          userId: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          token: data.token,
          isAuthenticated: true,
          user: {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            avatar: data.avatar,
          },
        });
      },
      updateProfile: async (profile) => {
        const response = await apiClient.put('/auth/profile', profile);
        const { data } = response.data;
        set((state) => {
          if (!state.user) return {};
          return {
            name: data.name,
            email: data.email,
            user: {
              ...state.user,
              name: data.name,
              email: data.email,
              avatar: data.avatar,
            }
          };
        });
      },
      changePassword: async (payload) => {
        await apiClient.put('/auth/change-password', payload);
      },
      logout: () => {
        set({
          userId: null,
          name: null,
          email: null,
          role: null,
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },
      setRole: () => {
        // Disabled dynamic role switching to ensure secure route/sidebar protection
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
          compareYears: state.isCompareMode ? [] : state.compareYears,
        }));
      },
    }),
    {
      name: 'placement-auth-store',
    }
  )
);
