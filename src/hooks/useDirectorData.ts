import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import {
  normalizeBatchYear,
  normalizePlacementStatus,
  normalizeDepartment,
  parsePackageValue
} from '../lib/utils';

export interface DirectorStats {
  packages: {
    highest: string;
    average: string;
    median: string;
  };
  deptPerformance: {
    department: string;
    placed: number;
    total: number;
    percentage: number;
    topCompany: string;
    highestPackage: string;
  }[];
  deptPackages: {
    name: string;
    avgPkg: number;
  }[];
  topHiring: {
    name: string;
    selections: number;
  }[];
}

interface StudentRecord {
  batch_year?: string | number;
  batchYear?: string | number;
  year?: string | number;
  department?: string;
  dept?: string;
  [key: string]: unknown;
}

interface PlacementRecord {
  batch_year?: string | number;
  batchYear?: string | number;
  year?: string | number;
  placement_status?: string;
  placementStatus?: string;
  company?: string;
  package?: number | string;
  department?: string;
  dept?: string;
  [key: string]: unknown;
}

const buildTopHiring = (placements: PlacementRecord[]): { name: string; selections: number }[] => {
  const counts = new Map<string, number>();
  placements.forEach((placement: PlacementRecord) => {
    if (normalizePlacementStatus(placement.placement_status) !== 'placed') return;
    const companyName = String(placement.company ?? '').trim();
    if (!companyName) return;
    counts.set(companyName, (counts.get(companyName) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([name, selections]) => ({ name, selections }))
    .sort((a, b) => b.selections - a.selections)
    .slice(0, 3);
};

const buildDepartmentStats = (students: StudentRecord[], placements: PlacementRecord[]) => {
  const departments = Array.from(
    new Set([
      ...students.map((student: StudentRecord) => normalizeDepartment(student)),
      ...placements.map((placement: PlacementRecord) => normalizeDepartment(placement))
    ].filter(Boolean))
  ).sort();

  const deptPerformance = departments.map((department) => {
    const deptStudents = students.filter((student: StudentRecord) => normalizeDepartment(student) === department);
    const deptPlacements = placements.filter((placement: PlacementRecord) => normalizeDepartment(placement) === department && normalizePlacementStatus(placement.placement_status) === 'placed');
    const total = deptStudents.length;
    const placed = deptPlacements.length;
    const percentage = total > 0 ? parseFloat(((placed / total) * 100).toFixed(1)) : 0;
    const topCompanyCounts = new Map<string, number>();

    deptPlacements.forEach((placement: PlacementRecord) => {
      const companyName = String(placement.company ?? '').trim();
      if (!companyName) return;
      topCompanyCounts.set(companyName, (topCompanyCounts.get(companyName) || 0) + 1);
    });

    const topCompany = Array.from(topCompanyCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const highestPackage = deptPlacements.length > 0
      ? `${Math.max(...deptPlacements.map((placement: PlacementRecord) => parsePackageValue(placement.package))).toFixed(1)} LPA`
      : '0.0 LPA';

    return {
      department,
      placed,
      total,
      percentage,
      topCompany,
      highestPackage
    };
  });

  const deptPackages = departments.map((department) => {
    const deptPlacements = placements.filter((placement: PlacementRecord) => normalizeDepartment(placement) === department && normalizePlacementStatus(placement.placement_status) === 'placed');
    const avgPkg = deptPlacements.length > 0
      ? deptPlacements.reduce((sum: number, placement: PlacementRecord) => sum + parsePackageValue(placement.package), 0) / deptPlacements.length
      : 0;

    return {
      name: department,
      avgPkg: parseFloat(avgPkg.toFixed(1))
    };
  });

  return { deptPerformance, deptPackages };
};

/**
 * Fetches strategic director stats directly from student, placement, and company records.
 */
export const useDirectorData = (year: string) => {
  return useQuery<DirectorStats>({
    queryKey: ['director', 'stats', year],
    queryFn: async () => {
      const [studentsRes, placementsRes] = await Promise.all([
        apiClient.get('/students?limit=5000'),
        apiClient.get('/placements?limit=5000')
      ]);

      const studentPayload = studentsRes.data?.data;
      const placementPayload = placementsRes.data?.data;
      const rawStudents = Array.isArray(studentPayload) ? studentPayload : (studentPayload?.students || []);
      const rawPlacements = Array.isArray(placementPayload) ? placementPayload : (placementPayload?.placements || []);

      const isAllYears = !year || year.toLowerCase() === 'all';
      const selectedStudents = isAllYears
        ? rawStudents
        : rawStudents.filter((student: StudentRecord) => normalizeBatchYear(student) === String(year));

      const selectedPlacements = isAllYears
        ? rawPlacements
        : rawPlacements.filter((placement: PlacementRecord) => normalizeBatchYear(placement) === String(year));

      const packages = selectedPlacements
        .filter((placement: PlacementRecord) => normalizePlacementStatus(placement.placement_status) === 'placed')
        .map((placement: PlacementRecord) => parsePackageValue(placement.package))
        .filter((value: number) => value > 0)
        .sort((a: number, b: number) => a - b);

      const highestPackage = packages.length > 0 ? packages[packages.length - 1] : 0;
      const averagePackage = packages.length > 0
        ? packages.reduce((sum: number, value: number) => sum + value, 0) / packages.length
        : 0;
      const medianPackage = packages.length > 0
        ? (packages.length % 2 === 0
          ? (packages[packages.length / 2 - 1] + packages[packages.length / 2]) / 2
          : packages[Math.floor(packages.length / 2)])
        : 0;

      const { deptPerformance, deptPackages } = buildDepartmentStats(selectedStudents, selectedPlacements);
      const topHiring = buildTopHiring(selectedPlacements);

      return {
        packages: {
          highest: `${highestPackage.toFixed(1)} LPA`,
          average: `${averagePackage.toFixed(1)} LPA`,
          median: `${medianPackage.toFixed(1)} LPA`
        },
        deptPerformance,
        deptPackages,
        topHiring
      };
    },
    staleTime: 5 * 60 * 1000
  });
};

/**
 * Fetches strategic institutional multi-year stacked placement trends.
 */
export const useDirectorYearlyAnalysis = (year: string) => {
  return useQuery<Record<string, unknown>[]>({
    queryKey: ['director', 'yearly-analysis', year],
    queryFn: async () => {
      const response = await apiClient.get('/placements?limit=5000');
      const payload = response.data?.data;
      const placements = Array.isArray(payload) ? payload : (payload?.placements || []);
      const isAllYears = !year || year.toLowerCase() === 'all';
      const filteredPlacements = isAllYears
        ? placements
        : placements.filter((placement: PlacementRecord) => normalizeBatchYear(placement) === String(year));

      const batchYears: string[] = Array.from(
        new Set<string>(filteredPlacements.map((placement: PlacementRecord) => normalizeBatchYear(placement)).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b));
      const departments: string[] = Array.from(
        new Set<string>(filteredPlacements.map((placement: PlacementRecord) => normalizeDepartment(placement)).filter(Boolean) as string[])
      ).sort();

      const rows = batchYears.map((batchYear) => {
        const row: Record<string, unknown> = { year: batchYear };
        departments.forEach((department) => {
          row[department] = filteredPlacements.filter((placement: PlacementRecord) => normalizeBatchYear(placement) === batchYear && normalizeDepartment(placement) === department && normalizePlacementStatus(placement.placement_status) === 'placed').length;
        });
        return row;
      });

      return rows;
    },
    staleTime: 5 * 60 * 1000
  });
};
