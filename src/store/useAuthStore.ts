import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';
import { apiClient } from '../lib/apiClient';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
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
      user: null,
      token: null,
      isAuthenticated: false,
      selectedYear: '',
      login: async (email, password) => {
        const response = await apiClient.post('/auth/login', { email, password });
        const { data } = response.data;
        set({
          user: {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            avatar: data.avatar,
          },
          token: data.token,
          isAuthenticated: true,
        });
      },
      register: async (name, email, password, role) => {
        const response = await apiClient.post('/auth/register', { name, email, password, role });
        const { data } = response.data;
        set({
          user: {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            avatar: data.avatar,
          },
          token: data.token,
          isAuthenticated: true,
        });
      },
      updateProfile: async (profile) => {
        const response = await apiClient.put('/auth/profile', profile);
        const { data } = response.data;
        set((state) => {
          if (!state.user) return {};
          return {
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
        set({ user: null, token: null, isAuthenticated: false });
      },
      setRole: (role) => {
        set((state) => {
          if (!state.user) return {};
          return {
            user: {
              ...state.user,
              role,
            },
          };
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
          compareYears: state.isCompareMode ? [] : state.compareYears,
        }));
      },
    }),
    {
      name: 'placement-auth-store',
    }
  )
);
