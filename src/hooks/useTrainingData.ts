import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

export interface TrainingStudent {
  id: string;
  name: string;
  regNo: string;
  dept: string;
  aptitude?: number;
  coding?: number;
  communication?: number;
  mockInterview?: number;
  attendance?: number;
  avgScore?: number;
  readinessLevel?: 'Highly Placeable' | 'Placement Ready' | 'Needs Improvement' | 'High Risk';
}

export interface TrainingAnalysis {
  department: string;
  placedCount: number;
  aptitude: number;
  coding: number;
  communication: number;
  attendance: number;
}

/**
 * Queries placement candidates from standard records and returns simulated
 * training matrices.
 */
export const useTrainingStudentsQuery = (year: string) => {
  return useQuery<TrainingStudent[]>({
    queryKey: ['training', 'students', year],
    queryFn: async () => {
      const yearParam = year !== 'All' ? `&batch_year=${year}` : '';
      const response = await apiClient.get(`/placements?limit=150${yearParam}`);
      const placements = response.data?.data?.placements || [];

      // debug logs removed: rely on React Query devtools if needed

      return placements.map((p: any, index: number) => {
        // Use real fields from placement records when present.
        // Do NOT synthesize or simulate values here — leave undefined when absent.
        const aptitude = typeof p.aptitude === 'number' ? p.aptitude : undefined;
        const coding = typeof p.coding === 'number' ? p.coding : undefined;
        const communication = typeof p.communication === 'number' ? p.communication : undefined;
        const mockInterview = typeof p.mockInterview === 'number' ? p.mockInterview : undefined;
        const attendance = typeof p.attendance === 'number' ? p.attendance : undefined;

        // Compute avgScore and readinessLevel only when enough real numeric fields exist
        const numericParts = [aptitude, coding, communication, mockInterview, attendance].filter(v => typeof v === 'number') as number[];
        const avgScore = numericParts.length === 5 ? Math.round(numericParts.reduce((s, v) => s + v, 0) / 5) : undefined;

        let readinessLevel: TrainingStudent['readinessLevel'] | undefined;
        if (typeof avgScore === 'number') {
          readinessLevel = avgScore >= 85
            ? 'Highly Placeable'
            : avgScore >= 72
            ? 'Placement Ready'
            : avgScore >= 60
            ? 'Needs Improvement'
            : 'High Risk';
        }

        return {
          id: p._id || String(index + 1),
          regNo: p.reg_no,
          name: p.name,
          dept: p.department,
          aptitude,
          coding,
          communication,
          mockInterview,
          attendance,
          avgScore,
          readinessLevel
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to retrieve department-wise comparative training radar analysis matrices.
 */
export const useTrainingAnalysisQuery = (year: string) => {
  return useQuery<{ radarData: any[] }>({
    queryKey: ['training', 'analysis', year],
    queryFn: async () => {
      const yearParam = year !== 'All' ? `?batch_year=${year}` : '';
      const response = await apiClient.get(`/analytics/departments${yearParam}`);
      const depts = response.data?.data || [];

      // debug logs removed: rely on React Query devtools if needed

      const subjects = ['Aptitude', 'Coding', 'Communication', 'Mock Interview', 'Attendance'];

      // Use real department analytics when available. Backend currently provides
      // department aggregates (placementPercentage, avgPackage). We map those
      // values into radar rows without fabricating per-subject scores.
      const radarData = subjects.map(subject => {
        const row: Record<string, any> = { subject };
        depts.forEach((d: any) => {
          // Prefer placementPercentage if present, otherwise fall back to avgPackage numeric value
          const score = (typeof d.placementPercentage === 'number' && d.placementPercentage) || (typeof d.avgPackage === 'number' && d.avgPackage) || 0;
          row[d.department] = score;
        });
        return row;
      });

      return { radarData };
    },
    staleTime: 5 * 60 * 1000,
  });
};
