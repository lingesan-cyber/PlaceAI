import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { useYearsStore } from '../store/useYearsStore';

export interface PortalMetadata {
  years: string[];
  departments: string[];
}

/**
 * Hook to retrieve static/dynamic portal metadata, combining database year profiles
 * with verified academic departments constants.
 */
export const useMetadataQuery = () => {
  return useQuery<PortalMetadata>({
    queryKey: ['metadata'],
    queryFn: async () => {
      const response = await apiClient.get('/years?all=true');
      const years = (response.data?.data || []).map((y: any) => String(y.year));
      return {
        years,
        departments: ['CSE', 'IT', 'ADS', 'ECE', 'EEE', 'MECH', 'MECHATRONICS', 'CIVIL', 'FT']
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Queries active available batch years from database, automatically synchronising
 * and initializing the Zustand global years store.
 */
export const useYearsQuery = () => {
  const { initializeYears, years: storeYears } = useYearsStore();

  const query = useQuery<{ active: string[]; archived: string[] }>({
    queryKey: ['years'],
    queryFn: async () => {
      const response = await apiClient.get('/years?all=true');
      const list = response.data?.data || [];

      const active = list
        .filter((y: any) => y.visible !== false)
        .map((y: any) => String(y.year))
        .sort((a: string, b: string) => b.localeCompare(a)); // newest-first

      const archived = list
        .filter((y: any) => y.visible === false)
        .map((y: any) => String(y.year))
        .sort((a: string, b: string) => b.localeCompare(a));

      return { active, archived };
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: { active: [], archived: [] }
  });

  // Synchronise Zustand store state when the fresh database records load
  useEffect(() => {
    if (query.data && (query.data.active.length > 0 || query.data.archived.length > 0)) {
      initializeYears(query.data.active, query.data.archived);
    }
  }, [query.data, initializeYears]);

  const years: string[] = storeYears.length > 0 ? storeYears : (query.data?.active ?? []);
  const latestYear: string = years.length > 0 ? years[0] : 'All';

  return { ...query, years, latestYear };
};

export const YEAR_COLORS = [
  '#1E40AF', // Blue-800
  '#3B82F6', // Blue-500
  '#7C3AED', // Violet-600
  '#10B981', // Emerald-500
  '#F59E0B', // Amber-500
  '#EF4444', // Red-500
  '#EC4899', // Pink-500
  '#06B6D4', // Cyan-500
  '#8B5CF6', // Purple-500
  '#64748B', // Slate-500
];

export const getYearColor = (index: number): string =>
  YEAR_COLORS[index % YEAR_COLORS.length];
