import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { z } from 'zod';
import { Search, Plus, Edit2, Trash2, Eye, X } from 'lucide-react';

type StudentRecord = {
  _id?: string;
  id?: string;
  reg_no: string;
  name: string;
  department: string;
  batch_year?: string | number;
  cgpa: number;
  arrears: number;
  skills: string[];
  placement_status: string;
  aptitude?: number;
  coding?: number;
  communication?: number;
  mockInterview?: number;
  attendance?: number;
  avgScore?: number;
  readinessLevel?: string;
  createdAt?: string;
  updatedAt?: string;
};

const studentSchema = z.object({
  regNo: z.string().trim().min(1, 'Register Number is required'),
  name: z.string().trim().min(1, 'Name is required'),
  department: z.string().trim().min(1, 'Department is required'),
  cgpa: z.string().trim().refine((value) => {
    const parsed = Number(value);
    return !Number.isNaN(parsed) && parsed >= 0 && parsed <= 10;
  }, { message: 'CGPA must be between 0 and 10' }),
  arrears: z.string().trim().refine((value) => {
    const parsed = Number(value);
    return !Number.isNaN(parsed) && parsed >= 0;
  }, { message: 'Arrears cannot be negative' }),
  skills: z.string().trim().min(1, 'Skills are required'),
  placementStatus: z.string().trim().min(1, 'Placement status is required'),
});

const emptyForm = {
  regNo: '',
  name: '',
  department: 'CSE',
  cgpa: '0',
  arrears: '0',
  skills: '',
  placementStatus: 'Applied'
};

type StudentManagementPanelProps = {
  selectedYear: string;
};

const normalizeBatchYear = (student: StudentRecord): string => {
  return String(student.batch_year ?? '').trim();
};

export const StudentManagementPanel: React.FC<StudentManagementPanelProps> = ({ selectedYear }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [studentForm, setStudentForm] = useState(emptyForm);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [viewStudent, setViewStudent] = useState<StudentRecord | null>(null);
  const [deleteTargetStudent, setDeleteTargetStudent] = useState<StudentRecord | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery<StudentRecord[]>({
    queryKey: ['students-management', selectedYear],
    queryFn: async () => {
      const response = await apiClient.get('/students?limit=500');
      const studentsList = response.data?.data?.students || [];
      const filteredStudents = selectedYear.toLowerCase() === 'all'
        ? studentsList
        : studentsList.filter((student: StudentRecord) => normalizeBatchYear(student) === String(selectedYear));

      console.log('selectedYear', selectedYear);
      console.log('[StudentManagementPanel]', {
        selectedYear,
        filteredStudentsLength: filteredStudents.length,
      });

      return filteredStudents;
    },
    staleTime: 5 * 60 * 1000,
  });

  const students = data || [];

  const departments = useMemo(() => {
    return ['All', ...Array.from(new Set(students.map((student) => student.department))).sort()];
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch = !search ||
        student.name.toLowerCase().includes(search) ||
        student.reg_no.toLowerCase().includes(search) ||
        student.department.toLowerCase().includes(search) ||
        student.skills.some((skill) => skill.toLowerCase().includes(search));
      const matchesDept = deptFilter === 'All' || student.department === deptFilter;
      const matchesStatus = statusFilter === 'All' || student.placement_status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [students, searchTerm, deptFilter, statusFilter]);

  const resetForm = () => {
    setStudentForm(emptyForm);
    setEditingStudent(null);
    setFormErrors({});
    setShowForm(false);
  };

  const handleAddClick = () => {
    setEditingStudent(null);
    setStudentForm(emptyForm);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditClick = (student: StudentRecord) => {
    setEditingStudent(student);
    setStudentForm({
      regNo: student.reg_no,
      name: student.name,
      department: student.department,
      cgpa: String(student.cgpa),
      arrears: String(student.arrears),
      skills: student.skills.join(', '),
      placementStatus: student.placement_status,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = studentSchema.safeParse(studentForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((issue) => {
        errors[String(issue.path[0])] = issue.message;
      });
      setFormErrors(errors);
      return;
    }

    const payload = {
      reg_no: studentForm.regNo.trim(),
      name: studentForm.name.trim(),
      department: studentForm.department.trim().toUpperCase(),
      cgpa: Number(studentForm.cgpa),
      arrears: Number(studentForm.arrears),
      skills: studentForm.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
      placement_status: studentForm.placementStatus,
    };

    try {
      if (editingStudent?._id || editingStudent?.id) {
        const studentId = editingStudent._id || editingStudent.id;
        await apiClient.put(`/students/${studentId}`, payload);
      } else {
        await apiClient.post('/students', payload);
      }

      await queryClient.invalidateQueries({ queryKey: ['students-management'] });
      resetForm();
    } catch (error: any) {
      setFormErrors({ submit: error?.response?.data?.message || error?.message || 'Failed to save student' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetStudent) return;
    try {
      const studentId = deleteTargetStudent._id || deleteTargetStudent.id;
      await apiClient.delete(`/students/${studentId}`);
      await queryClient.invalidateQueries({ queryKey: ['students-management'] });
      setDeleteTargetStudent(null);
      if (viewStudent && (viewStudent._id || viewStudent.id) === studentId) {
        setViewStudent(null);
      }
    } catch (error: any) {
      setFormErrors({ submit: error?.response?.data?.message || error?.message || 'Failed to delete student' });
      setDeleteTargetStudent(null);
    }
  };

  const visibleFormTitle = editingStudent ? 'Edit Student Profile' : 'Add Student Profile';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">Student Management</h3>
            <p className="text-slate-400 text-[10px]">Manage student profiles, eligibility data, and placement readiness records.</p>
          </div>
          <button
            type="button"
            onClick={handleAddClick}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Student</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student name, register number, department, or skill"
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {['All', 'Applied', 'Pending', 'Rejected', 'Placed'].map((status) => (
              <option key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</option>
            ))}
          </select>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">{visibleFormTitle}</h4>
                <p className="text-[10px] text-slate-400">Register Number, Name, Department, CGPA, Arrears, Skills, and Placement Status are required.</p>
              </div>
              <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Register Number</label>
                <input value={studentForm.regNo} onChange={(e) => setStudentForm({ ...studentForm, regNo: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-xs" />
                {formErrors.regNo && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.regNo}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Name</label>
                <input value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-xs" />
                {formErrors.name && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                <input value={studentForm.department} onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value.toUpperCase() })} className="w-full border border-slate-200 rounded-lg p-2 text-xs" />
                {formErrors.department && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.department}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CGPA</label>
                <input type="number" step="0.01" value={studentForm.cgpa} onChange={(e) => setStudentForm({ ...studentForm, cgpa: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-xs" />
                {formErrors.cgpa && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.cgpa}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Arrears</label>
                <input type="number" min="0" value={studentForm.arrears} onChange={(e) => setStudentForm({ ...studentForm, arrears: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-xs" />
                {formErrors.arrears && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.arrears}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Placement Status</label>
                <select value={studentForm.placementStatus} onChange={(e) => setStudentForm({ ...studentForm, placementStatus: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white">
                  {['Applied', 'Pending', 'Rejected', 'Placed'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                {formErrors.placementStatus && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.placementStatus}</p>}
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Skills</label>
                <input value={studentForm.skills} onChange={(e) => setStudentForm({ ...studentForm, skills: e.target.value })} placeholder="Java, React, Python" className="w-full border border-slate-200 rounded-lg p-2 text-xs" />
                {formErrors.skills && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.skills}</p>}
              </div>
            </div>

            {formErrors.submit && <p className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{formErrors.submit}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/10">
                {editingStudent ? 'Save Changes' : 'Add Student'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs bg-white">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider">
                <th className="px-5 py-3 font-bold">Student</th>
                <th className="px-5 py-3 font-bold">Dept</th>
                <th className="px-5 py-3 font-bold">CGPA</th>
                <th className="px-5 py-3 font-bold">Arrears</th>
                <th className="px-5 py-3 font-bold">Skills</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr><td className="px-5 py-8 text-slate-400" colSpan={7}>Loading students...</td></tr>
              ) : filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <tr key={student._id || student.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-bold text-slate-800">{student.name}</p>
                      <p className="text-[10px] text-slate-400">{student.reg_no}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">{student.department}</td>
                  <td className="px-5 py-4 font-semibold">{student.cgpa.toFixed ? student.cgpa.toFixed(2) : student.cgpa}</td>
                  <td className="px-5 py-4">{student.arrears}</td>
                  <td className="px-5 py-4 text-slate-500 max-w-xs truncate">{student.skills.join(', ')}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                      {student.placement_status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setViewStudent(student)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600"><Eye className="h-4 w-4" /></button>
                      <button type="button" onClick={() => handleEditClick(student)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600"><Edit2 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setDeleteTargetStudent(student)} className="p-1 hover:bg-red-50 rounded text-slate-600 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td className="px-5 py-8 text-center text-slate-400 italic" colSpan={7}>No students match the current search or filter criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Student Profile</h3>
                <p className="text-[10px] text-slate-400">Detailed view of the student record.</p>
              </div>
              <button type="button" onClick={() => setViewStudent(null)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
              <ProfileField label="Register Number" value={viewStudent.reg_no} />
              <ProfileField label="Name" value={viewStudent.name} />
              <ProfileField label="Department" value={viewStudent.department} />
              <ProfileField label="CGPA" value={String(viewStudent.cgpa)} />
              <ProfileField label="Arrears" value={String(viewStudent.arrears)} />
              <ProfileField label="Placement Status" value={viewStudent.placement_status} />
              <ProfileField label="Skills" value={viewStudent.skills.join(', ')} span="sm:col-span-2" />
              <ProfileField label="Aptitude" value={viewStudent.aptitude !== undefined ? String(viewStudent.aptitude) : 'N/A'} />
              <ProfileField label="Coding" value={viewStudent.coding !== undefined ? String(viewStudent.coding) : 'N/A'} />
              <ProfileField label="Communication" value={viewStudent.communication !== undefined ? String(viewStudent.communication) : 'N/A'} />
              <ProfileField label="Mock Interview" value={viewStudent.mockInterview !== undefined ? String(viewStudent.mockInterview) : 'N/A'} />
              <ProfileField label="Attendance" value={viewStudent.attendance !== undefined ? String(viewStudent.attendance) : 'N/A'} />
              <ProfileField label="Readiness" value={viewStudent.readinessLevel || 'N/A'} />
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setViewStudent(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold">Close</button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-800">Delete Student</h3>
            <p className="mt-2 text-xs text-slate-500">
              Delete <span className="font-bold text-slate-700">{deleteTargetStudent.name}</span> ({deleteTargetStudent.reg_no})? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTargetStudent(null)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all cursor-pointer">Cancel</button>
              <button type="button" onClick={confirmDelete} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-500/10">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileField: React.FC<{ label: string; value: string; span?: string }> = ({ label, value, span }) => (
  <div className={span || ''}>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-800 break-words">{value}</p>
  </div>
);