import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { Company } from '../types';
import {
  normalizeBatchYear,
  normalizePlacementStatus,
  getFilteredCompaniesForYear,
  mapStatus
} from '../lib/utils';

const mapPlacementStage = (status: any): string => {
  const normalized = normalizePlacementStatus(status);
  if (normalized === 'placed' || normalized === 'selected') return 'Selected';
  if (normalized === 'shortlisted') return 'Shortlisted';
  if (normalized === 'interviewed') return 'Interviewed';
  if (normalized === 'rejected') return 'Rejected';
  return 'Applied';
};

export const usePlacementsQuery = (year: string) => {
  return useQuery({
    queryKey: ['officer', 'placements', year],
    queryFn: async () => {
      const response = await apiClient.get('/placements?limit=5000');
      const payload = response.data?.data;
      const placements = Array.isArray(payload) ? payload : (payload?.placements || []);

      const isAllYears = !year || year.toLowerCase() === 'all';
      const filteredPlacements = isAllYears
        ? placements
        : placements.filter((placement: any) => normalizeBatchYear(placement) === String(year));

      // temporary debug logs removed; use React Query DevTools if needed

      return filteredPlacements.map((placement: any, index: number) => ({
        id: placement._id || String(index + 1),
        name: placement.name ?? placement.student_name ?? '',
        regNo: placement.reg_no,
        dept: placement.department,
        company: placement.company,
        role: placement.role || '',
        package: `${placement.package || 0} LPA`,
        packageOffer: `${placement.package || 0} LPA`,
        year: normalizeBatchYear(placement),
        batchYear: normalizeBatchYear(placement),
        stage: mapPlacementStage(placement.placement_status),
        placementStatus: placement.placement_status || 'Placed',
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

/** Companies registered for drives in the given year. */
export const useCompaniesQuery = (year: string) => {
  return useQuery<Company[]>({
    queryKey: ['officer', 'companies', year],
    queryFn: async () => {
      const [companiesRes, placementsRes] = await Promise.all([
        apiClient.get('/companies'),
        apiClient.get('/placements?limit=5000')
      ]);

      const companies = companiesRes.data?.data || [];
      const placementsPayload = placementsRes.data?.data;
      const placements = Array.isArray(placementsPayload) ? placementsPayload : (placementsPayload?.placements || []);
      const filteredCompanies = getFilteredCompaniesForYear(companies, placements, year);

      // temporary debug logs removed; use React Query DevTools if needed

      return filteredCompanies.map((c: any) => ({
        id: c._id || '',
        name: c.company_name || '',
        role: c.role || 'Campus Drive',
        package: `${c.package || 0} LPA`,
        packageOffer: `${c.package || 0} LPA`,
        driveDate: c.drive_date ? new Date(c.drive_date).toISOString().split('T')[0] : '',
        status: mapStatus(c.status)
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

/** HR contacts directory loaded dynamically from MongoDB. */
export const useHRQuery = (year: string) => {
  return useQuery({
    queryKey: ['officer', 'hr', year],
    queryFn: async () => {
      const response = await apiClient.get(`/hr-contacts?year=${year}`);
      const payload = response.data?.data || [];
      return payload.map((c: any) => ({
        id: c._id,
        name: c.hr_name,
        company: c.company_name,
        email: c.email,
        phone: c.phone || '',
        designation: c.designation || 'Talent Acquisition Head',
        notes: c.notes || '',
        batchYear: c.batch_year
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAddHRMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newHR: {
      company_name: string;
      hr_name: string;
      email: string;
      phone?: string;
      designation?: string;
      notes?: string;
      batch_year: number;
    }) => {
      const response = await apiClient.post('/hr-contacts', newHR);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officer', 'hr'] });
    }
  });
};

export const useUpdateHRMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string;
      company_name?: string;
      hr_name?: string;
      email?: string;
      phone?: string;
      designation?: string;
      notes?: string;
      batch_year?: number;
    }) => {
      const response = await apiClient.put(`/hr-contacts/${id}`, payload);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officer', 'hr'] });
    }
  });
};

export const useDeleteHRMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/hr-contacts/${id}`);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officer', 'hr'] });
    }
  });
};

/** Placement drive events calendar for the given year. */
export const useDrivesQuery = (year: string) => {
  return useQuery({
    queryKey: ['officer', 'drives', year],
    queryFn: async () => {
      const [companiesRes, placementsRes] = await Promise.all([
        apiClient.get('/companies'),
        apiClient.get('/placements?limit=5000')
      ]);

      const companies = companiesRes.data?.data || [];
      const placementsPayload = placementsRes.data?.data;
      const placements = Array.isArray(placementsPayload) ? placementsPayload : (placementsPayload?.placements || []);
      const filteredCompanies = getFilteredCompaniesForYear(companies, placements, year);

      // temporary debug logs removed; use React Query DevTools if needed

      return filteredCompanies
        .map((c: any, index: number) => ({
          id: c._id || String(index + 1),
          title: `${c.company_name} Off-Campus Placement Drive`,
          company: c.company_name,
          date: c.drive_date ? new Date(c.drive_date).toISOString().split('T')[0] : '',
          status: c.status || 'Active'
        }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

/** Student candidate search filter matching register codes and dynamic attributes. */
export const useStudentFilterQuery = (
  year: string,
  cgpa: number,
  arrears: number,
  depts: string[],
  skills: string[]
) => {
  const deptsQuery = depts.join(',');
  const skillsQuery = skills.join(',');
  return useQuery({
    queryKey: ['officer', 'students', 'filter', year, cgpa, arrears, deptsQuery, skillsQuery],
    queryFn: async () => {
      const response = await apiClient.get('/students?limit=5000');
      const payload = response.data?.data;
      const students = Array.isArray(payload) ? payload : (payload?.students || []);
      const isAllYears = !year || year.toLowerCase() === 'all';
      const filteredStudents = isAllYears
        ? students
        : students.filter((student: any) => normalizeBatchYear(student) === String(year));

      // temporary debug logs removed; use React Query DevTools if needed

      const studentsResult = filteredStudents.map((p: any, index: number) => {
        const cgpa = typeof p.cgpa === 'number' ? parseFloat(p.cgpa.toFixed ? p.cgpa.toFixed(2) : String(p.cgpa)) : -1; // -1 indicates missing
        const arrears = typeof p.arrears === 'number' ? p.arrears : Number.POSITIVE_INFINITY; // Infinity indicates missing
        const skills = Array.isArray(p.skills) ? p.skills : [];

        return {
          id: p._id || String(index + 1),
          name: p.name,
          dept: p.department,
          cgpa,
          arrears,
          skills,
          regNo: p.reg_no,
          company: p.company,
          status: p.placement_status || 'Applied'
        };
      }).filter((s: any) => {
        if (s.cgpa < cgpa) return false;
        if (s.arrears > arrears) return false;
        if (depts.length > 0 && !depts.includes(s.dept)) return false;
        if (skills.length > 0 && !skills.some((sk: string) => s.skills.includes(sk))) return false;
        return true;
      });

      return { students: studentsResult };
    },
    staleTime: 2000,
  });
};
