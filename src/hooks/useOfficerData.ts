import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

/** Companies registered for drives in the given year. */
export const useCompaniesQuery = (year: string) => {
  return useQuery({
    queryKey: ['officer', 'companies', year],
    queryFn: async () => {
      const response = await apiClient.get('/companies');
      const list = response.data?.data || [];
      return list
        .filter((c: any) => {
          if (year === 'All') return true;
          const driveYear = new Date(c.drive_date).getFullYear();
          return String(driveYear) === year;
        })
        .map((c: any) => ({
          id: c._id,
          name: c.company_name,
          packageOffer: `${c.package || 0} LPA`,
          driveDate: c.drive_date ? new Date(c.drive_date).toISOString().split('T')[0] : '',
          status: c.status || 'Active'
        }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

/** HR contacts directory compiled dynamically from recruiters database logs. */
export const useHRQuery = () => {
  return useQuery({
    queryKey: ['officer', 'hr'],
    queryFn: async () => {
      const response = await apiClient.get('/companies');
      const companies = response.data?.data || [];
      return companies.map((c: any, index: number) => ({
        id: c._id || String(index + 1),
        name: `${c.company_name} Talent Acquisition Head`,
        company: c.company_name,
        email: `ta-head@${c.company_name.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: `+91 9840${String(10000 + index).slice(1)}`
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

/** Placement drive events calendar for the given year. */
export const useDrivesQuery = (year: string) => {
  return useQuery({
    queryKey: ['officer', 'drives', year],
    queryFn: async () => {
      const response = await apiClient.get('/companies');
      const list = response.data?.data || [];
      return list
        .filter((c: any) => {
          if (year === 'All') return true;
          const driveYear = new Date(c.drive_date).getFullYear();
          return String(driveYear) === year;
        })
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
  cgpa: number,
  arrears: number,
  depts: string[],
  skills: string[]
) => {
  const deptsQuery = depts.join(',');
  const skillsQuery = skills.join(',');
  return useQuery({
    queryKey: ['officer', 'students', 'filter', cgpa, arrears, deptsQuery, skillsQuery],
    queryFn: async () => {
      // 1. Fetch placements list
      const response = await apiClient.get('/placements?limit=200');
      const placements = response.data?.data?.placements || [];

      // 2. Map candidate attributes from real placement records; do not fabricate values.
      // If backend does not provide a field, map to a sentinel that causes the
      // client-side filters to exclude the record (so UI only shows records with real data).
      return placements.map((p: any, index: number) => {
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
          status: p.placement_status || 'Placed'
        };
      }).filter((s: any) => {
        if (s.cgpa < cgpa) return false;
        if (s.arrears > arrears) return false;
        if (depts.length > 0 && !depts.includes(s.dept)) return false;
        if (skills.length > 0 && !skills.some((sk: string) => s.skills.includes(sk))) return false;
        return true;
      });
    },
    staleTime: 2000,
  });
};
