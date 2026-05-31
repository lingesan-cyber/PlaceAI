import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { Company } from '../types';

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

const mapStatus = (status: string): 'Visiting' | 'Ongoing' | 'Completed' => {
  const normalized = String(status).trim().toLowerCase();
  if (normalized === 'completed') return 'Completed';
  if (normalized === 'active' || normalized === 'ongoing') return 'Ongoing';
  return 'Visiting'; // default fallback matching Company.status options
};

/**
 * Hook to retrieve unified dashboard stats, aggregates, and recruiting company lists
 * dynamically compiled from the backend analytics pipelines.
 */
export const useDashboardData = (year: string) => {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', 'overall', year],
    queryFn: async () => {
      const yearParam = year !== 'All' ? `?year=${year}` : '';

      // 1. Fetch overview stats, departmental performance aggregates, and companies list
      const [overviewRes, deptRes, companyRes, yearsRes] = await Promise.all([
        apiClient.get(`/analytics/overview${yearParam}`),
        apiClient.get(`/analytics/departments${yearParam}`),
        apiClient.get('/companies'),
        apiClient.get('/years?all=true')
      ]);

      const overview = overviewRes.data?.data || { totalStudents: 0, placedStudents: 0, placementPercentage: 0, totalCompanies: 0 };
      const depts = deptRes.data?.data || [];
      const rawCompanies = companyRes.data?.data || [];
      const activeYearsList = (yearsRes.data?.data || []).map((y: any) => String(y.year));

      // 2. Map standard metrics
      const totalStudents = overview.totalStudents || 0;
      const placedStudents = overview.placedStudents || 0;
      const pendingStudents = Math.max(0, totalStudents - placedStudents);
      const companiesVisited = overview.totalCompanies || rawCompanies.length;
      const placementRate = overview.placementPercentage || 0.0;

      // Extract packaging metrics
      const avgPackageValue = depts.length > 0
        ? (depts.reduce((acc: number, d: any) => acc + (d.avgPackage || 0), 0) / depts.length).toFixed(1)
        : '0.0';
      const highestPackageValue = depts.length > 0
        ? Math.max(...depts.map((d: any) => d.highestPackage || 0)).toFixed(1)
        : '0.0';

      // 3. Compile dynamic YoY comparison and chronological growth series
      let comparison: any[] = [];
      let growth: any[] = [];

      if (activeYearsList.length > 0) {
        // Fetch departmental performance statistics for all years in parallel to construct YoY comparison maps
        const yearlyDepts = await Promise.all(
          activeYearsList.map(async (yr: string) => {
            const res = await apiClient.get(`/analytics/departments?year=${yr}`);
            return { year: yr, depts: res.data?.data || [] };
          })
        );

        const deptsSet = new Set<string>();
        yearlyDepts.forEach(yd => yd.depts.forEach((d: any) => deptsSet.add(d.department)));

        // Comparison format: [{ name: 'CSE', rate2024: 92, rate2025: 95, rate2026: 96 }]
        comparison = Array.from(deptsSet).map(deptName => {
          const row: Record<string, any> = { name: deptName };
          yearlyDepts.forEach(yd => {
            const match = yd.depts.find((d: any) => d.department === deptName);
            row[`rate${yd.year}`] = match ? match.placementPercentage : 0;
          });
          return row;
        });

        // Growth format: [{ year: '2024', CSE: 92, ECE: 85, IT: 90 }] sorted oldest first
        growth = yearlyDepts
          .map(yd => {
            const row: Record<string, any> = { year: yd.year };
            Array.from(deptsSet).forEach(deptName => {
              const match = yd.depts.find((d: any) => d.department === deptName);
              row[deptName] = match ? match.placementPercentage : 0;
            });
            return row;
          })
          .sort((a, b) => a.year.localeCompare(b.year));
      }

      // 4. Construct candidate pipeline funnel from real placement records where possible
      // Fetch placements for the year and compute counts by placement_status.
      const placementsResFull = await apiClient.get(`/placements?limit=2000${yearParam}`);
      const allPlacements = placementsResFull.data?.data?.placements || [];

      // Eligible: prefer overview.totalStudents, else fall back to unique reg_no count
      const eligibleCount = totalStudents || new Set(allPlacements.map((p: any) => p.reg_no)).size || 0;

      // Tally statuses (normalize to lowercase)
      const statusCounts: Record<string, number> = {};
      allPlacements.forEach((p: any) => {
        const st = String(p.placement_status || '').trim().toLowerCase() || 'applied';
        statusCounts[st] = (statusCounts[st] || 0) + 1;
      });

      const appliedCount = statusCounts['applied'] || 0;
      const shortlistedCount = statusCounts['shortlisted'] || 0;
      const interviewedCount = statusCounts['interviewed'] || 0;
      const placedCount = statusCounts['placed'] || placedStudents || 0;

      const pct = (n: number) => (eligibleCount > 0 ? parseFloat(((n / eligibleCount) * 100).toFixed(1)) : 0);

      const funnel = [
        { name: 'Eligible', value: eligibleCount, percentage: eligibleCount > 0 ? 100 : 0 },
        { name: 'Applied', value: appliedCount, percentage: pct(appliedCount) },
        { name: 'Shortlisted', value: shortlistedCount, percentage: pct(shortlistedCount) },
        { name: 'Interviewed', value: interviewedCount, percentage: pct(interviewedCount) },
        { name: 'Placed', value: placedCount, percentage: pct(placedCount) }
      ];

      // 5. Map recruiters schema matching frontend Company interface
      const companies: Company[] = rawCompanies.map((c: any, index: number) => ({
        id: c._id || String(index + 1),
        name: c.company_name,
        package: `${c.package || 0} LPA`,
        packageOffer: `${c.package || 0} LPA`,
        status: mapStatus(c.status),
        driveDate: c.drive_date ? new Date(c.drive_date).toISOString().split('T')[0] : '',
        selections: depts.reduce((acc: number, d: any) => acc + (d.placedCount || 0), 0) || 0
      }));

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