import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../lib/apiClient';

interface YearsState {
  /** Ordered list of active available batch years, newest-first. */
  years: string[];

  /** List of archived/hidden batch years. */
  archivedYears: string[];

  /**
   * Seed / refresh the years list from the API response.
   */
  initializeYears: (serverYears: string[], serverArchivedYears?: string[]) => void;

  /**
   * Add a new batch year.
   */
  addYear: (year: string) => Promise<void>;

  /**
   * Archive a batch year (moves it from active to archived).
   */
  archiveYear: (year: string) => Promise<void>;

  /**
   * Restore an archived batch year (moves it from archived to active).
   */
  restoreYear: (year: string) => Promise<void>;

  /** Backwards compatibility alias for archiveYear */
  removeYear: (year: string) => void;
}

const sortNewestFirst = (years: string[]): string[] =>
  [...new Set(years)].sort((a, b) => b.localeCompare(a));

export const useYearsStore = create<YearsState>()(
  persist(
    (set, get) => ({
      years: [],
      archivedYears: [],

      initializeYears: (serverYears: string[], serverArchivedYears: string[] = []) => {
        const currentActive = get().years;
        const currentArchived = get().archivedYears || [];

        const maxServerYear = serverYears.length > 0
          ? Math.max(...serverYears.map(Number))
          : 0;

        const futureActiveAdminYears = currentActive.filter(
          (y) => !serverYears.includes(y) && !serverArchivedYears.includes(y) && parseInt(y, 10) > maxServerYear
        );

        // Merge active years
        const finalActive = sortNewestFirst([...serverYears, ...futureActiveAdminYears]).filter(
          (y) => !currentArchived.includes(y)
        );

        // Merge archived years
        const finalArchived = sortNewestFirst([...serverArchivedYears, ...currentArchived]).filter(
          (y) => !finalActive.includes(y)
        );

        set({
          years: finalActive,
          archivedYears: finalArchived
        });
      },

      addYear: async (year: string) => {
        const trimmed = year.trim();
        if (!trimmed || !/^\d{4}$/.test(trimmed)) return; // must be 4-digit year

        const currentActive = get().years;
        const currentArchived = get().archivedYears || [];

        // If it was archived, restore it
        if (currentArchived.includes(trimmed)) {
          await get().restoreYear(trimmed);
          return;
        }

        if (currentActive.includes(trimmed)) return; // already exists

        set({ years: sortNewestFirst([...currentActive, trimmed]) });

        try {
          await apiClient.post('/years', { year: Number(trimmed) });
        } catch (e) {
          console.error('Failed to create academic batch year:', e);
        }
      },

      archiveYear: async (year: string) => {
        const currentActive = get().years;
        const currentArchived = get().archivedYears || [];

        if (!currentActive.includes(year)) return;

        set({
          years: currentActive.filter((y) => y !== year),
          archivedYears: sortNewestFirst([...currentArchived, year])
        });

        try {
          // Lookup database _id by year number string
          const response = await apiClient.get('/years?all=true');
          const list = response.data?.data || [];
          const match = list.find((y: { _id: string; year: number | string }) => String(y.year) === year);
          
          if (match) {
            await apiClient.patch(`/years/${match._id}/archive`);
          }
        } catch (e) {
          console.error('Failed to archive year:', e);
        }
      },

      restoreYear: async (year: string) => {
        const currentActive = get().years;
        const currentArchived = get().archivedYears || [];

        if (!currentArchived.includes(year)) return;

        set({
          years: sortNewestFirst([...currentActive, year]),
          archivedYears: currentArchived.filter((y) => y !== year)
        });

        try {
          // Lookup database _id by year number string
          const response = await apiClient.get('/years?all=true');
          const list = response.data?.data || [];
          const match = list.find((y: { _id: string; year: number | string }) => String(y.year) === year);
          
          if (match) {
            await apiClient.patch(`/years/${match._id}/restore`);
          }
        } catch (e) {
          console.error('Failed to restore year:', e);
        }
      },

      removeYear: (year: string) => {
        get().archiveYear(year);
      }
    }),
    {
      name: 'placement-years-store', // localStorage key
    }
  )
);
