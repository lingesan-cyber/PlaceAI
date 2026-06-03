import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { Company } from '../types';
import {
  normalizeBatchYear,
  normalizePlacementStatus,
  normalizeDepartment,
  parsePackageValue,
  mapStatus
} from '../lib/utils';

export interface DashboardStats {
  totalStudents: number;
  placedStudents: number;
  pendingStudents: number;
  companiesVisited: number;
  placementRate: number;
  avgPackage: string;
  highestPackage: string;
}

export interface DashboardData {
  year: string;
  stats: DashboardStats;
  comparison: any[];
  growth: any[];
  funnel: { name: string; value: number; percentage: number }[];
  companies: Company[];
}

/**
 * Hook to retrieve unified dashboard stats, aggregates, and recruiting company lists
 * directly from the student, placement, and company APIs.
 */
export const useDashboardData = (year: string) => {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', 'overall', year],
    queryFn: async () => {
      const [studentsRes, placementsRes, companyRes] = await Promise.all([
        apiClient.get('/students?limit=5000'),
        apiClient.get('/placements?limit=5000'),
        apiClient.get('/companies')
      ]);

      const studentPayload = studentsRes.data?.data;
      const placementPayload = placementsRes.data?.data;
      const rawStudents = Array.isArray(studentPayload) ? studentPayload : (studentPayload?.students || []);
      const rawPlacements = Array.isArray(placementPayload) ? placementPayload : (placementPayload?.placements || []);
      const rawCompanies = companyRes.data?.data || [];

      const isAllYears = !year || year.toLowerCase() === 'all';
      const selectedStudents = isAllYears
        ? rawStudents
        : rawStudents.filter((student: any) => normalizeBatchYear(student) === String(year));

      const selectedPlacements = isAllYears
        ? rawPlacements
        : rawPlacements.filter((placement: any) => normalizeBatchYear(placement) === String(year));

      // temporary debug logs removed; use React Query DevTools if needed

      const totalStudents = selectedStudents.length;
      const placedStudents = selectedPlacements.filter((placement: any) => normalizePlacementStatus(placement) === 'placed').length;
      const pendingStudents = Math.max(0, totalStudents - placedStudents);
      const companiesVisited = new Set(
        selectedPlacements
          .map((placement: any) => String(placement.company ?? '').trim())
          .filter(Boolean)
      ).size;
      const placementRate = totalStudents > 0
        ? parseFloat(((placedStudents / totalStudents) * 100).toFixed(1))
        : 0.0;

      const placedPackages = selectedPlacements
        .filter((placement: any) => normalizePlacementStatus(placement) === 'placed')
        .map((placement: any) => parsePackageValue(placement.package));

      const avgPackageValue = placedPackages.length > 0
        ? (placedPackages.reduce((sum, value) => sum + value, 0) / placedPackages.length).toFixed(1)
        : '0.0';
      const highestPackageValue = placedPackages.length > 0
        ? Math.max(...placedPackages).toFixed(1)
        : '0.0';

      const batchYears = Array.from(
        new Set(
          [...rawStudents, ...rawPlacements]
            .map((record: any) => normalizeBatchYear(record))
            .filter(Boolean)
        )
      ).sort((a, b) => b.localeCompare(a));

      const departments = Array.from(
        new Set(
          [...rawStudents, ...rawPlacements]
            .map((record: any) => normalizeDepartment(record))
            .filter(Boolean)
        )
      ).sort();

      const studentCountByBatch = new Map<string, number>();
      const studentCountByBatchDept = new Map<string, number>();
      rawStudents.forEach((student: any) => {
        const batchYear = normalizeBatchYear(student);
        const department = normalizeDepartment(student);
        if (!batchYear) return;
        studentCountByBatch.set(batchYear, (studentCountByBatch.get(batchYear) || 0) + 1);
        if (department) {
          const key = `${batchYear}::${department}`;
          studentCountByBatchDept.set(key, (studentCountByBatchDept.get(key) || 0) + 1);
        }
      });

      const placementGroups = new Map<string, { count: number; packageValues: number[] }>();
      rawPlacements.forEach((placement: any) => {
        const batchYear = normalizeBatchYear(placement);
        const department = normalizeDepartment(placement);
        if (!batchYear || !department) return;

        const key = `${batchYear}::${department}`;
        const current = placementGroups.get(key) || { count: 0, packageValues: [] };

        if (normalizePlacementStatus(placement) === 'placed') {
          current.count += 1;
          current.packageValues.push(parsePackageValue(placement.package));
        }

        placementGroups.set(key, current);
      });

      const comparison = departments.map((department) => {
        const row: Record<string, any> = { name: department };

        batchYears.forEach((batchYear) => {
          const group = placementGroups.get(`${batchYear}::${department}`);
          const deptBatchTotal = studentCountByBatchDept.get(`${batchYear}::${department}`) || 0;
          const percentage = deptBatchTotal > 0
            ? parseFloat((((group?.count || 0) / deptBatchTotal) * 100).toFixed(1))
            : 0;
          row[`rate${batchYear}`] = percentage;
        });

        return row;
      });

      const growth = batchYears
        .slice()
        .sort((a, b) => a.localeCompare(b))
        .map((batchYear) => {
          const row: Record<string, any> = { year: batchYear };

          departments.forEach((department) => {
            const group = placementGroups.get(`${batchYear}::${department}`);
            const deptBatchTotal = studentCountByBatchDept.get(`${batchYear}::${department}`) || 0;
            row[department] = deptBatchTotal > 0
              ? parseFloat((((group?.count || 0) / deptBatchTotal) * 100).toFixed(1))
              : 0;
          });

          return row;
        });

      // Console Verification logs for comparison and growth widgets
      console.log('Chart Data (Multi-Year Comparison):');
      departments.forEach((department) => {
        batchYears.forEach((batchYear) => {
          const group = placementGroups.get(`${batchYear}::${department}`);
          const deptBatchTotal = studentCountByBatchDept.get(`${batchYear}::${department}`) || 0;
          const percentage = deptBatchTotal > 0
            ? parseFloat((((group?.count || 0) / deptBatchTotal) * 100).toFixed(1))
            : 0;
          console.log({ year: batchYear, department, placementPercentage: percentage });
        });
      });

      console.log('Growth Data (Year-on-Year Growth):');
      const growthLogs: { year: string; department: string; placementRate: number }[] = [];
      batchYears.forEach((batchYear) => {
        departments.forEach((department) => {
          const group = placementGroups.get(`${batchYear}::${department}`);
          const deptBatchTotal = studentCountByBatchDept.get(`${batchYear}::${department}`) || 0;
          const percentage = deptBatchTotal > 0
            ? parseFloat((((group?.count || 0) / deptBatchTotal) * 100).toFixed(1))
            : 0;
          growthLogs.push({ year: batchYear, department, placementRate: percentage });
        });
      });
      console.log(JSON.stringify(growthLogs, null, 2));

      const statusCounts: Record<string, number> = {};
      selectedPlacements.forEach((placement: any) => {
        const status = normalizePlacementStatus(placement) || 'applied';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const appliedCount = statusCounts['applied'] || 0;
      const shortlistedCount = statusCounts['shortlisted'] || 0;
      const interviewedCount = statusCounts['interviewed'] || 0;
      const placedCount = statusCounts['placed'] || placedStudents || 0;

      const pct = (value: number) => (totalStudents > 0 ? parseFloat(((value / totalStudents) * 100).toFixed(1)) : 0);

      const funnel = [
        { name: 'Eligible', value: totalStudents, percentage: totalStudents > 0 ? 100 : 0 },
        { name: 'Applied', value: appliedCount, percentage: pct(appliedCount) },
        { name: 'Shortlisted', value: shortlistedCount, percentage: pct(shortlistedCount) },
        { name: 'Interviewed', value: interviewedCount, percentage: pct(interviewedCount) },
        { name: 'Placed', value: placedCount, percentage: pct(placedCount) }
      ];

      // Console Verification logs for funnel widget
      console.log('Pipeline Data:', {
        eligibleCount: totalStudents,
        appliedCount,
        shortlistedCount,
        interviewedCount,
        placedCount
      });

      const companySelectionsByName = new Map<string, number>();
      selectedPlacements.forEach((placement: any) => {
        const companyName = String(placement.company ?? '').trim();
        if (!companyName || normalizePlacementStatus(placement) !== 'placed') return;
        companySelectionsByName.set(companyName, (companySelectionsByName.get(companyName) || 0) + 1);
      });

      const companies: Company[] = rawCompanies.map((company: any, index: number) => {
        const companyName = String(company.company_name ?? '').trim();

        return {
          id: company._id || String(index + 1),
          name: companyName,
          package: `${parsePackageValue(company.package)} LPA`,
          packageOffer: `${parsePackageValue(company.package)} LPA`,
          status: mapStatus(company.status),
          driveDate: company.drive_date ? new Date(company.drive_date).toISOString().split('T')[0] : '',
          selections: companySelectionsByName.get(companyName) || 0
        };
      });

      return {
        year,
        stats: {
          totalStudents,
          placedStudents,
          pendingStudents,
          companiesVisited,
          placementRate,
          avgPackage: `${avgPackageValue} LPA`,
          highestPackage: `${highestPackageValue} LPA`
        },
        comparison,
        growth,
        funnel,
        companies
      };
    },
    staleTime: 5 * 60 * 1000
  });
};