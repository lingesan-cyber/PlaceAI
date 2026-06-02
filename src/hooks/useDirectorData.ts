import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

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
  activities: {
    id: string;
    user: string;
    time: string;
    action: string;
    role: string;
    target: string;
  }[];
}

const normalizeBatchYear = (record: any): string => {
  return String(record?.batch_year ?? record?.batchYear ?? record?.year ?? '').trim();
};

const normalizePlacementStatus = (value: any): string => {
  return String(value ?? '').trim().toLowerCase();
};

const parsePackageValue = (value: any): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatTimeAgo = (dateValue: any): string => {
  if (!dateValue) return 'Recently';
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) return 'Recently';
  const diffHours = Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60)));
  if (diffHours < 1) return 'Just now';
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
};

const buildTopHiring = (placements: any[]): { name: string; selections: number }[] => {
  const counts = new Map<string, number>();
  placements.forEach((placement: any) => {
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

const buildDepartmentStats = (students: any[], placements: any[]) => {
  const departments = Array.from(
    new Set([
      ...students.map((student: any) => String(student.department ?? '').trim().toUpperCase()),
      ...placements.map((placement: any) => String(placement.department ?? '').trim().toUpperCase())
    ].filter(Boolean))
  ).sort();

  const deptPerformance = departments.map((department) => {
    const deptStudents = students.filter((student: any) => String(student.department ?? '').trim().toUpperCase() === department);
    const deptPlacements = placements.filter((placement: any) => String(placement.department ?? '').trim().toUpperCase() === department && normalizePlacementStatus(placement.placement_status) === 'placed');
    const total = deptStudents.length;
    const placed = deptPlacements.length;
    const percentage = total > 0 ? parseFloat(((placed / total) * 100).toFixed(1)) : 0;
    const topCompanyCounts = new Map<string, number>();

    deptPlacements.forEach((placement: any) => {
      const companyName = String(placement.company ?? '').trim();
      if (!companyName) return;
      topCompanyCounts.set(companyName, (topCompanyCounts.get(companyName) || 0) + 1);
    });

    const topCompany = Array.from(topCompanyCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const highestPackage = deptPlacements.length > 0
      ? `${Math.max(...deptPlacements.map((placement: any) => parsePackageValue(placement.package))).toFixed(1)} LPA`
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
    const deptPlacements = placements.filter((placement: any) => String(placement.department ?? '').trim().toUpperCase() === department && normalizePlacementStatus(placement.placement_status) === 'placed');
    const avgPkg = deptPlacements.length > 0
      ? deptPlacements.reduce((sum: number, placement: any) => sum + parsePackageValue(placement.package), 0) / deptPlacements.length
      : 0;

    return {
      name: department,
      avgPkg: parseFloat(avgPkg.toFixed(1))
    };
  });

  return { deptPerformance, deptPackages };
};

const buildActivities = (placements: any[], companies: any[]) => {
  const placementEvents = placements
    .map((placement: any, index: number) => ({
      id: `placement-${placement._id || index}`,
      user: 'Placement Officer',
      time: formatTimeAgo(placement.updatedAt || placement.createdAt),
      action: `${placement.name || placement.reg_no || 'Student'} placed at ${placement.company || 'Unknown Company'}`,
      role: 'Placement Officer',
      target: placement.company || 'Unknown Company',
      timestamp: new Date(placement.updatedAt || placement.createdAt || 0).getTime()
    }))
    .filter((event: any) => Number.isFinite(event.timestamp));

  const companyEvents = companies
    .map((company: any, index: number) => ({
      id: `company-${company._id || index}`,
      user: 'Recruitment Team',
      time: formatTimeAgo(company.updatedAt || company.createdAt),
      action: `${company.company_name || 'Company'} drive updated`,
      role: 'Recruitment Team',
      target: company.company_name || 'Company',
      timestamp: new Date(company.updatedAt || company.createdAt || 0).getTime()
    }))
    .filter((event: any) => Number.isFinite(event.timestamp));

  return [...placementEvents, ...companyEvents]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3)
    .map(({ id, user, time, action, role, target }: any) => ({ id, user, time, action, role, target }));
};

/**
 * Fetches strategic director stats directly from student, placement, and company records.
 */
export const useDirectorData = (year: string) => {
  return useQuery<DirectorStats>({
    queryKey: ['director', 'stats', year],
    queryFn: async () => {
      const [studentsRes, placementsRes, companiesRes] = await Promise.all([
        apiClient.get('/students?limit=5000'),
        apiClient.get('/placements?limit=5000'),
        apiClient.get('/companies')
      ]);

      const studentPayload = studentsRes.data?.data;
      const placementPayload = placementsRes.data?.data;
      const rawStudents = Array.isArray(studentPayload) ? studentPayload : (studentPayload?.students || []);
      const rawPlacements = Array.isArray(placementPayload) ? placementPayload : (placementPayload?.placements || []);
      const rawCompanies = companiesRes.data?.data || [];

      const isAllYears = !year || year.toLowerCase() === 'all';
      const selectedStudents = isAllYears
        ? rawStudents
        : rawStudents.filter((student: any) => normalizeBatchYear(student) === String(year));

      const selectedPlacements = isAllYears
        ? rawPlacements
        : rawPlacements.filter((placement: any) => normalizeBatchYear(placement) === String(year));

      // temporary debug logs removed; use React Query DevTools if needed

      const packages = selectedPlacements
        .filter((placement: any) => normalizePlacementStatus(placement.placement_status) === 'placed')
        .map((placement: any) => parsePackageValue(placement.package))
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
      const activities = buildActivities(selectedPlacements, rawCompanies);

      return {
        packages: {
          highest: `${highestPackage.toFixed(1)} LPA`,
          average: `${averagePackage.toFixed(1)} LPA`,
          median: `${medianPackage.toFixed(1)} LPA`
        },
        deptPerformance,
        deptPackages,
        topHiring,
        activities
      };
    },
    staleTime: 5 * 60 * 1000
  });
};

/**
 * Fetches strategic institutional multi-year stacked placement trends.
 */
export const useDirectorYearlyAnalysis = (year: string) => {
  return useQuery<any[]>({
    queryKey: ['director', 'yearly-analysis', year],
    queryFn: async () => {
      const response = await apiClient.get('/placements?limit=5000');
      const payload = response.data?.data;
      const placements = Array.isArray(payload) ? payload : (payload?.placements || []);
      const isAllYears = !year || year.toLowerCase() === 'all';
      const filteredPlacements = isAllYears
        ? placements
        : placements.filter((placement: any) => normalizeBatchYear(placement) === String(year));

      const batchYears: string[] = Array.from(
        new Set<string>(filteredPlacements.map((placement: any) => normalizeBatchYear(placement)).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b));
      const departments: string[] = Array.from(
        new Set<string>(filteredPlacements.map((placement: any) => String(placement.department ?? '').trim().toUpperCase()).filter(Boolean) as string[])
      ).sort();

      const rows = batchYears.map((batchYear) => {
        const row: Record<string, any> = { year: batchYear };
        departments.forEach((department) => {
          row[department] = filteredPlacements.filter((placement: any) => normalizeBatchYear(placement) === batchYear && String(placement.department ?? '').trim().toUpperCase() === department && normalizePlacementStatus(placement.placement_status) === 'placed').length;
        });
        return row;
      });

      // temporary debug logs removed; use React Query DevTools if needed

      return rows;
    },
    staleTime: 5 * 60 * 1000
  });
};
