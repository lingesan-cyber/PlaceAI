import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { useYearsStore } from '../store/useYearsStore';

export interface PortalMetadata {
  years: string[];
  departments: string[];
}

interface RawYear {
  year: number | string;
  visible?: boolean;
}

interface RawDepartment {
  department_code: string;
  department_name?: string;
}


/**
 * Hook to retrieve static/dynamic portal portal metadata, combining database year profiles
 * with verified academic departments constants.
 */
export const useMetadataQuery = () => {
  return useQuery<PortalMetadata>({
    queryKey: ['metadata'],
    queryFn: async () => {
      const [yearsResponse, deptsResponse] = await Promise.all([
        apiClient.get('/years?all=true'),
        apiClient.get('/departments')
      ]);
      const years = (yearsResponse.data?.data || []).map((y: RawYear) => String(y.year));
      const departments = (deptsResponse.data?.data || []).map((d: RawDepartment) =>
        String(d.department_code || d.department_name).trim().toUpperCase()
      );
      return {
        years,
        departments
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
      const list = (response.data?.data || []) as RawYear[];

      const active = list
        .filter((y: RawYear) => y.visible !== false)
        .map((y: RawYear) => String(y.year))
        .sort((a: string, b: string) => b.localeCompare(a)); // newest-first

      const archived = list
        .filter((y: RawYear) => y.visible === false)
        .map((y: RawYear) => String(y.year))
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
  const latestYear: string = years.length > 0 ? years[0] : 'all';

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
