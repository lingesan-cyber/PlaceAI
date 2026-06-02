import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

export interface TrainingStudent {
  id: string; // Map from MongoDB _id
  name: string;
  regNo: string; // Map from reg_no
  dept: string; // Map from department
  aptitude: number; // Map from aptitude_score
  coding: number; // Map from coding_score
  communication: number; // Map from communication_score
  mockInterview: number; // Map from mock_interview_score
  attendance: number;
  avgScore: number; // Calculated Readiness Score
  readinessLevel: 'Highly Placeable' | 'Placement Ready' | 'Needs Improvement' | 'High Risk';
}

export interface TrainingAnalysis {
  radarData: any[];
}

/**
 * Calculates readiness details for a student record
 */
export const calculateReadiness = (s: any): { avgScore: number; readinessLevel: TrainingStudent['readinessLevel'] } => {
  const apt = Number(s.aptitude_score || s.aptitude || 0);
  const cod = Number(s.coding_score || s.coding || 0);
  const comm = Number(s.communication_score || s.communication || 0);
  const mock = Number(s.mock_interview_score || s.mockInterview || 0);

  // Formula: (Aptitude * 0.25) + (Coding * 0.35) + (Communication * 0.20) + (Mock Interview * 0.20)
  const avgScore = Math.round((apt * 0.25) + (cod * 0.35) + (comm * 0.20) + (mock * 0.20));

  let readinessLevel: TrainingStudent['readinessLevel'] = 'High Risk';
  if (avgScore >= 85) {
    readinessLevel = 'Highly Placeable';
  } else if (avgScore >= 72) {
    readinessLevel = 'Placement Ready';
  } else if (avgScore >= 60) {
    readinessLevel = 'Needs Improvement';
  }

  return { avgScore, readinessLevel };
};

/**
 * Queries training details from the database
 */
export const useTrainingStudentsQuery = () => {
  return useQuery<TrainingStudent[]>({
    queryKey: ['training', 'students'],
    queryFn: async () => {
      const response = await apiClient.get('/training-details');
      const records = response.data?.data || [];

      return records.map((r: any) => {
        const { avgScore, readinessLevel } = calculateReadiness(r);
        return {
          id: r._id,
          name: r.name,
          regNo: r.reg_no,
          dept: r.department,
          aptitude: r.aptitude_score,
          coding: r.coding_score,
          communication: r.communication_score,
          mockInterview: r.mock_interview_score,
          attendance: r.attendance,
          avgScore,
          readinessLevel
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to retrieve department-wise comparative training radar analysis from live training_details
 */
export const useTrainingAnalysisQuery = () => {
  return useQuery<TrainingAnalysis>({
    queryKey: ['training', 'analysis'],
    queryFn: async () => {
      const response = await apiClient.get('/training-details');
      const records = response.data?.data || [];

      // Group records by department
      const deptsMap: Record<string, {
        aptitude: number[];
        coding: number[];
        communication: number[];
        mock: number[];
        attendance: number[];
      }> = {};

      records.forEach((r: any) => {
        const d = r.department || 'Unknown';
        if (!deptsMap[d]) {
          deptsMap[d] = { aptitude: [], coding: [], communication: [], mock: [], attendance: [] };
        }
        deptsMap[d].aptitude.push(r.aptitude_score || 0);
        deptsMap[d].coding.push(r.coding_score || 0);
        deptsMap[d].communication.push(r.communication_score || 0);
        deptsMap[d].mock.push(r.mock_interview_score || 0);
        deptsMap[d].attendance.push(r.attendance || 0);
      });

      const deptsList = Object.keys(deptsMap);
      const subjects = [
        { name: 'Aptitude', key: 'aptitude' },
        { name: 'Coding', key: 'coding' },
        { name: 'Communication', key: 'communication' },
        { name: 'Mock Interview', key: 'mock' },
        { name: 'Attendance', key: 'attendance' }
      ];

      // Calculate averages per department for each subject
      const radarData = subjects.map(sub => {
        const row: Record<string, any> = { subject: sub.name };
        deptsList.forEach(dept => {
          const scores = deptsMap[dept][sub.key as keyof typeof deptsMap[string]] || [];
          const avg = scores.length > 0 
            ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 10) / 10
            : 0;
          row[dept] = avg;
        });
        return row;
      });

      return { radarData };
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Mutation hooks for CRUD operations
 */
export const useAddTrainingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      reg_no: string;
      name: string;
      department: string;
      aptitude_score: number;
      coding_score: number;
      communication_score: number;
      mock_interview_score: number;
      attendance: number;
    }) => {
      const response = await apiClient.post('/training-details', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
    }
  });
};

export const useUpdateTrainingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      department?: string;
      aptitude_score?: number;
      coding_score?: number;
      communication_score?: number;
      mock_interview_score?: number;
      attendance?: number;
    }) => {
      const { id, ...data } = payload;
      const response = await apiClient.put(`/training-details/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
    }
  });
};

export const useDeleteTrainingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/training-details/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
    }
  });
};

export const useImportTrainingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ records, policy }: { records: any[]; policy: 'skip' | 'overwrite' }) => {
      const response = await apiClient.post(`/training-details/import?policy=${policy}`, records);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
    }
  });
};
