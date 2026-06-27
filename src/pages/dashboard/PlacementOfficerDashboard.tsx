import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useCompaniesQuery, useHRQuery, useDrivesQuery, usePlacementsQuery, useStudentFilterQuery, useAddHRMutation, useUpdateHRMutation, useDeleteHRMutation } from '../../hooks/useOfficerData';
import type { Company } from '../../types';
import { useMetadataQuery } from '../../hooks/useMetadata';
import { useAuthStore } from '../../store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { StudentManagementPanel } from '../../components/StudentManagementPanel';
import { FormatGuideModal } from '../../components/FormatGuideModal';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  UploadCloud, 
  ArrowRight,
  Mail,
  Phone,
  CheckCircle2,
  FileText,
  CheckCircle
} from 'lucide-react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel, 
  flexRender 
} from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import * as XLSX from 'xlsx';

// Zod schema for company validation
const companySchema = z.object({
  name: z.string().trim().min(1, "Company Name is required"),
  role: z.string().trim().min(1, "Role is required"),
  package: z.string().trim().min(1, "Package is required").refine((value) => Number(value) > 0, {
    message: 'Package must be positive'
  }),
  cgpa: z.coerce.number().min(0).max(10, "CGPA must be between 0 and 10"),
  arrears: z.coerce.number().min(0, "Arrears cannot be negative"),
  dept: z.string().min(1, "Department code is required"),
  skills: z.string().min(2, "Required skills must be specified"),
  driveDate: z.string().min(1, "Drive date is required"),
  location: z.string().min(2, "Location is required"),
});

interface OfficerHrContact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  designation: string;
  notes: string;
  batchYear?: string | number;
}

interface OfficerDrive {
  id: string;
  title: string;
  company: string;
  date: string;
  status: string;
}

interface OfficerKanbanStudent {
  id: string;
  name: string;
  regNo: string;
  dept: string;
  company: string;
  role: string;
  package: string;
  packageOffer: string;
  year: string;
  batchYear: string;
  stage: string;
  placementStatus: string;
}

interface OfficerImportedRow {
  regNo: string;
  name: string;
  dept: string;
  batch_year: number;
  cgpa: number;
  arrears: number;
  skills: string[];
  skillsString: string;
  company_name: string;
  role: string;
  packageVal: number;
  placement_status: string;
  drive_date: string;
  hr_name: string;
  hr_email: string;
  hr_phone: string;
  validation: {
    regNo: boolean;
    name: boolean;
    dept: boolean;
    batch_year: boolean;
    cgpa: boolean;
    arrears: boolean;
    company: boolean;
    email: boolean;
  };
  hasError: boolean;
  isDuplicate?: boolean;
}

export const PlacementOfficerDashboard: React.FC = () => {
  const { selectedYear } = useAuthStore();
  const { data: initCompanies, refetch: refetchCompanies } = useCompaniesQuery(selectedYear);
  const { data: initHRs } = useHRQuery(selectedYear);
  const addHRMutation = useAddHRMutation();
  const updateHRMutation = useUpdateHRMutation();
  const deleteHRMutation = useDeleteHRMutation();
  const { data: initDrives } = useDrivesQuery(selectedYear);
  const { data: initPlacements } = usePlacementsQuery(selectedYear);
  const { data: metadata } = useMetadataQuery();

  const departments = useMemo(() => {
    return metadata?.departments || [];
  }, [metadata]);

  // Selected Active Tab
  const [activeTab, setActiveTab] = useState<'students' | 'companies' | 'hr' | 'eligibility' | 'kanban' | 'import'>('companies');

  // Reactive State derived from Queries
  const [hrs, setHRs] = useState<OfficerHrContact[]>([]);
  const [drives, setDrives] = useState<OfficerDrive[]>([]);
  const [kanbanStudents, setKanbanStudents] = useState<OfficerKanbanStudent[]>([]);

  useEffect(() => {
    if (initHRs) setHRs(initHRs);
  }, [initHRs]);

  useEffect(() => {
    if (initDrives) setDrives(initDrives);
  }, [initDrives]);

  useEffect(() => {
    if (initPlacements) {
      setKanbanStudents(initPlacements);
    }
  }, [initPlacements]);

  // Form toggles and states
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteTargetCompany, setDeleteTargetCompany] = useState<Company | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Form values (Add/Edit Company)
  const [companyForm, setCompanyForm] = useState({
    name: '', role: '', package: '', cgpa: '6.0', arrears: '0', dept: 'CSE', skills: '', driveDate: '', location: ''
  });

  // Custom toast notification states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // ESC key modal closure listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddCompany(false);
        setEditingCompany(null);
      }
    };
    if (showAddCompany) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAddCompany]);

  useEffect(() => {
    if (departments.length > 0 && !departments.includes(companyForm.dept)) {
      setCompanyForm(prev => ({ ...prev, dept: departments[0] }));
    }
  }, [departments, companyForm.dept]);

  const handleEditClick = useCallback((comp: Company) => {
    setEditingCompany(comp);
    setCompanyForm({
      name: comp.name,
      role: comp.role || '',
      package: (comp.package || comp.packageOffer || '').replace(' LPA', ''),
      cgpa: '6.0',
      arrears: '0',
      dept: comp.dept || departments[0] || 'CSE',
      skills: 'React, Node',
      driveDate: comp.driveDate,
      location: 'Campus'
    });
    setFormErrors({});
    setShowAddCompany(true);
  }, [departments]);

  const handleDeleteCompany = useCallback((company: Company) => {
    setDeleteTargetCompany(company);
  }, []);

  // A) TanStack Table pagination configuration
  const columns = useMemo<ColumnDef<Company>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Company',
      cell: (info) => <span className="font-bold text-slate-800">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'role',
      header: 'Role Offered',
      cell: (info) => <span className="text-slate-600 font-medium">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'package',
      header: 'Package (LPA)',
      cell: (info) => <span className="font-semibold text-slate-700">{info.getValue() as string} LPA</span>,
    },
    {
      accessorKey: 'driveDate',
      header: 'Drive Date',
      cell: (info) => <span className="text-slate-500">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => {
        const status = info.getValue() as string;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            status === 'Completed'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : status === 'Ongoing'
              ? 'bg-blue-50 text-blue-700 border border-blue-100'
              : 'bg-amber-50 text-amber-700 border border-amber-100'
          }`}>
            {status}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const comp = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEditClick(comp)}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors"
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteCompany(comp)}
              className="p-1 hover:bg-red-50 rounded text-slate-600 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ], [handleEditClick, handleDeleteCompany]);

  const table = useReactTable({
    data: initCompanies || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 14
      }
    }
  });

  // B) Add Company Form Submit Handler (Zod validated)
  const mapFrontendStatusToBackend = (status?: string) => {
    if (status === 'Completed') return 'Completed';
    if (status === 'Ongoing') return 'Active';
    return 'Upcoming';
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = companySchema.safeParse(companyForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        fieldErrors[err.path[0]] = err.message;
      });
      setFormErrors(fieldErrors);
      return;
    }

    setFormErrors({});
    try {
      const payload = {
        company_name: companyForm.name.trim(),
        role: companyForm.role.trim(),
        package: Number(companyForm.package),
        drive_date: companyForm.driveDate,
        status: editingCompany ? mapFrontendStatusToBackend(editingCompany.status) : 'Upcoming'
      };

      if (editingCompany) {
        await apiClient.put(`/companies/${editingCompany.id}`, payload);
      } else {
        await apiClient.post('/companies', payload);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['officer', 'companies'] }),
        queryClient.invalidateQueries({ queryKey: ['officer', 'drives'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
      ]);

      await refetchCompanies();

      setToastMessage(editingCompany ? '✓ Company drive updated successfully!' : '✓ Company drive registered successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);

      setEditingCompany(null);
      setCompanyForm({ name: '', role: '', package: '', cgpa: '6.0', arrears: '0', dept: departments[0] || 'CSE', skills: '', driveDate: '', location: '' });
      setShowAddCompany(false);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Failed to save company';
      setFormErrors({ submit: message });
    }
  };



  const confirmDeleteCompany = async () => {
    if (!deleteTargetCompany) return;

    try {
      await apiClient.delete(`/companies/${deleteTargetCompany.id}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['officer', 'companies'] }),
        queryClient.invalidateQueries({ queryKey: ['officer', 'drives'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
      ]);

      await refetchCompanies();

      setToastMessage('✓ Company drive deleted successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);

      setDeleteTargetCompany(null);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Failed to delete company';
      setFormErrors({ submit: message });
      setDeleteTargetCompany(null);
    }
  };

  // C) HR Management Panel States
  const [hrSearch, setHrSearch] = useState('');
  const [showAddHR, setShowAddHR] = useState(false);
  const [selectedHRForNote, setSelectedHRForNote] = useState<string | null>(null);
  const [newCommunicationNote, setNewCommunicationNote] = useState('');
  const [hrForm, setHrForm] = useState({ name: '', email: '', phone: '', company: '' });

  const filteredHRs = useMemo(() => {
    return hrs.filter(h => 
      h.name.toLowerCase().includes(hrSearch.toLowerCase()) || 
      h.company.toLowerCase().includes(hrSearch.toLowerCase())
    );
  }, [hrs, hrSearch]);

  const handleAddHR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrForm.name || !hrForm.email || !hrForm.company) return;

    let batchYear = Number(selectedYear);
    if (isNaN(batchYear) || selectedYear.toLowerCase() === 'all') {
      batchYear = 2024; // Fallback default
    }

    try {
      await addHRMutation.mutateAsync({
        hr_name: hrForm.name.trim(),
        company_name: hrForm.company.trim(),
        email: hrForm.email.trim(),
        phone: hrForm.phone ? hrForm.phone.trim() : '',
        batch_year: batchYear,
        designation: 'Talent Acquisition Head',
        notes: ''
      });
      setHrForm({ name: '', email: '', phone: '', company: '' });
      setShowAddHR(false);
    } catch (err) {
      console.error('Failed to add HR contact:', err);
      alert('Failed to register HR contact in database.');
    }
  };

  const handleDeleteHR = async (id: string) => {
    try {
      await deleteHRMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete HR contact:', err);
      alert('Failed to delete HR contact from database.');
    }
  };

  const handleAddNote = async (hrId: string) => {
    if (!newCommunicationNote) return;

    const contact = hrs.find(h => h.id === hrId);
    if (!contact) return;

    const formattedNote = contact.notes
      ? `${contact.notes}\n• ${newCommunicationNote}`
      : `• ${newCommunicationNote}`;

    try {
      await updateHRMutation.mutateAsync({
        id: hrId,
        notes: formattedNote
      });
      setNewCommunicationNote('');
      setSelectedHRForNote(null);
    } catch (err) {
      console.error('Failed to append log note:', err);
      alert('Failed to append note to the contact logs.');
    }
  };

  // F) Eligibility Filter System States
  const [filterCGPA, setFilterCGPA] = useState(7.0);
  const [filterArrears, setFilterArrears] = useState(0);
  const [filterDepts, setFilterDepts] = useState<string[]>([]);

  useEffect(() => {
    if (departments.length > 0 && filterDepts.length === 0) {
      setFilterDepts(departments.slice(0, 2));
    }
  }, [departments, filterDepts.length]);
  const [filterSkills, setFilterSkills] = useState('');

  const parsedSkills = useMemo(() => {
    return filterSkills.split(',').map(s => s.trim()).filter(Boolean);
  }, [filterSkills]);

  const { data: filterResult } = useStudentFilterQuery(
    selectedYear,
    filterCGPA,
    filterArrears,
    filterDepts,
    parsedSkills
  );

  const downloadEligibleStudentsExcel = () => {
    if (!filterResult?.students) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      filterResult.students.map((s: { name: string; dept: string; cgpa: number; arrears: number; skills: string[] }) => ({
        "Student Name": s.name,
        "Department": s.dept,
        "CGPA Score": s.cgpa,
        "Active Arrears": s.arrears,
        "Skills List": s.skills.join(', ')
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "Eligible Students");
    XLSX.writeFile(wb, `PlaceAI_Eligible_Students_CGPA_${filterCGPA}.xlsx`);
  };

  // G) Student Selection Kanban States
  const queryClient = useQueryClient();
  const handleMoveStage = (id: string, nextStage: string) => {
    setKanbanStudents(kanbanStudents.map(s => s.id === id ? { ...s, stage: nextStage } : s));
  };

  // H) Drag and Drop Spreadsheet Importer Preview States
  const [importedRows, setImportedRows] = useState<OfficerImportedRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState<string>('');
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'overwrite'>('skip');
  const [previewTab, setPreviewTab] = useState<'all' | 'new' | 'duplicates' | 'errors'>('all');
  const [showFormatGuide, setShowFormatGuide] = useState(false);

  interface ImportHistoryEntry {
    filename: string;
    date: string;
    recordsImported: number;
    duplicatesSkipped: number;
    duplicatesOverwritten: number;
    policy: 'skip' | 'overwrite';
    timestamp: string;
  }

  interface ImportReport {
    filename: string;
    date: string;
    totalRecords: number;
    studentsInserted: number;
    studentsUpdated: number;
    companiesInserted: number;
    companiesUpdated: number;
    placementsInserted: number;
    placementsUpdated: number;
    hrInserted: number;
    hrUpdated: number;
    errorCount: number;
    duplicateCount: number;
    skippedDetails: { regNo: string; name: string; reason: string }[];
    departmentsCreated?: number;
    newDepartments?: string[];
  }

  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([
    { filename: 'ece_students_list.xlsx', date: '2026-05-28', recordsImported: 45, duplicatesSkipped: 2, duplicatesOverwritten: 0, policy: 'skip', timestamp: '14:30:22' },
    { filename: 'cse_final_year.csv', date: '2026-05-25', recordsImported: 112, duplicatesSkipped: 5, duplicatesOverwritten: 0, policy: 'skip', timestamp: '09:15:40' }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFile = (file: File) => {
    setActiveFile(file);
    setUploadedFilename(file.name);
    setImportReport(null);
    setPreviewTab('all');

    const isJson = file.name.endsWith('.json');
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;
      try {
        let rawRows: Record<string, unknown>[] = [];
        if (isJson) {
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
          const parsed = JSON.parse(text);
          rawRows = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
        }

        const parsed = rawRows.map((row: Record<string, unknown>) => {
          const getVal = (possibleKeys: string[]) => {
            const key = Object.keys(row).find(k => 
              possibleKeys.some(pk => k.toLowerCase().replace(/[\s_.-]/g, '') === pk.toLowerCase().replace(/[\s_.-]/g, ''))
            );
            return key ? row[key] : undefined;
          };

          const regNoRaw = getVal(['regno', 'regnumber', 'registerno', 'registernumber', 'rollno', 'rollnumber', 'id']);
          const nameRaw = getVal(['name', 'studentname', 'fullname', 'student_name']);
          const deptRaw = getVal(['dept', 'department', 'branch']);
          const batchYearRaw = getVal(['batchyear', 'year', 'batch_year']);
          const cgpaRaw = getVal(['cgpa', 'gpa', 'grades']);
          const arrearsRaw = getVal(['arrears', 'backlogs', 'activearrears', 'activebacklogs']);
          const skillsRaw = getVal(['skills', 'skillslist', 'skillslistcommaseparated']);
          
          const companyRaw = getVal(['companyname', 'company', 'company_name']);
          const roleRaw = getVal(['role', 'roleoffered', 'designation']);
          const packageRaw = getVal(['package', 'lpa', 'packages', 'packagevalue']);
          const statusRaw = getVal(['placementstatus', 'status', 'placement_status']);
          const driveDateRaw = getVal(['drivedate', 'date', 'drive_date']);
          const hrNameRaw = getVal(['hrname', 'hr_name', 'recruitername']);
          const hrEmailRaw = getVal(['hremail', 'email', 'hremailaddress', 'hr_email']);
          const hrPhoneRaw = getVal(['hrphone', 'phone', 'hrphonenumber', 'hr_phone']);

          const regNo = regNoRaw ? String(regNoRaw).trim() : '';
          const name = nameRaw ? String(nameRaw).trim() : '';
          const dept = deptRaw ? String(deptRaw).trim().toUpperCase() : '';
          const batch_year = batchYearRaw !== undefined ? parseInt(String(batchYearRaw), 10) : NaN;
          const cgpa = cgpaRaw !== undefined ? parseFloat(String(cgpaRaw)) : NaN;
          const arrears = arrearsRaw !== undefined ? parseInt(String(arrearsRaw), 10) : NaN;
          
          const company_name = companyRaw ? String(companyRaw).trim() : '';
          const role = roleRaw ? String(roleRaw).trim() : '';
          const packageVal = packageRaw !== undefined ? parseFloat(String(packageRaw)) : NaN;
          const placement_status = statusRaw ? String(statusRaw).trim() : '';
          const drive_date = driveDateRaw ? String(driveDateRaw).trim() : '';
          const hr_name = hrNameRaw ? String(hrNameRaw).trim() : '';
          const hr_email = hrEmailRaw ? String(hrEmailRaw).trim() : '';
          const hr_phone = hrPhoneRaw ? String(hrPhoneRaw).trim() : '';

          let skillsArray: string[] = [];
          if (skillsRaw) {
            if (Array.isArray(skillsRaw)) {
              skillsArray = skillsRaw.map(s => String(s).trim());
            } else {
              skillsArray = String(skillsRaw).split(',').map(s => s.trim()).filter(Boolean);
            }
          }

          const isRegNoInvalid = !regNo;
          const isNameInvalid = !name;
          const isDeptInvalid = !dept;
          const isBatchYearInvalid = isNaN(batch_year) || batch_year < 2000;
          const isCgpaInvalid = isNaN(cgpa) || cgpa < 0 || cgpa > 10;
          const isArrearsInvalid = isNaN(arrears) || arrears < 0;

          let hasError = isRegNoInvalid || isNameInvalid || isDeptInvalid || isBatchYearInvalid || isCgpaInvalid || isArrearsInvalid;

          let isCompanyInvalid = false;
          let isEmailInvalid = false;
          if (company_name) {
            if (packageRaw !== undefined && (isNaN(packageVal) || packageVal <= 0)) {
              isCompanyInvalid = true;
            }
            if (hr_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hr_email)) {
              isEmailInvalid = true;
            }
          }

          hasError = hasError || isCompanyInvalid || isEmailInvalid;

          return {
            regNo,
            name,
            dept,
            batch_year,
            cgpa,
            arrears,
            skills: skillsArray,
            skillsString: skillsRaw ? String(skillsRaw) : '',
            company_name,
            role,
            packageVal,
            placement_status,
            drive_date,
            hr_name,
            hr_email,
            hr_phone,
            validation: {
              regNo: isRegNoInvalid,
              name: isNameInvalid,
              dept: isDeptInvalid,
              batch_year: isBatchYearInvalid,
              cgpa: isCgpaInvalid,
              arrears: isArrearsInvalid,
              company: isCompanyInvalid,
              email: isEmailInvalid
            },
            hasError
          };
        });

        const seenRegNos = new Set<string>();
        const finalRows = parsed.map((item) => {
          if (item.hasError || !item.regNo) {
            return { ...item, isDuplicate: false };
          }
          let isDup = false;
          if (seenRegNos.has(item.regNo)) {
            isDup = true;
          } else {
            seenRegNos.add(item.regNo);
          }
          return { ...item, isDuplicate: isDup };
        });

        setImportedRows(finalRows);
      } catch (err) {
        console.error(err);
        alert("Failed to parse file. Ensure layout conforms to standard columns or valid JSON structure.");
      }
    };

    if (isJson) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const confirmImport = async () => {
    const newRows = importedRows.filter(r => !r.hasError && !r.isDuplicate);
    const duplicateRows = importedRows.filter(r => r.isDuplicate && !r.hasError);
    const errorRows = importedRows.filter(r => r.hasError);

    const validRowsToImport = duplicatePolicy === 'overwrite'
      ? [...newRows, ...duplicateRows]
      : newRows;

    if (validRowsToImport.length === 0) {
      alert("No valid records found to import under current policy!");
      return;
    }

    try {
      const formData = new FormData();
      if (activeFile) {
        formData.append('file', activeFile);
      } else {
        const normalizedData = validRowsToImport.map(r => ({
          reg_no: r.regNo,
          student_name: r.name,
          department: r.dept,
          batch_year: r.batch_year,
          cgpa: r.cgpa,
          arrears: r.arrears,
          skills: r.skills,
          company_name: r.company_name,
          role: r.role,
          package: r.packageVal,
          placement_status: r.placement_status,
          drive_date: r.drive_date,
          hr_name: r.hr_name,
          hr_email: r.hr_email,
          hr_phone: r.hr_phone
        }));
        const blob = new Blob([JSON.stringify(normalizedData)], { type: 'application/json' });
        formData.append('file', blob, uploadedFilename || 'dummy_data.json');
      }

      let uploadEndpoint = `/upload/json?policy=${duplicatePolicy === 'overwrite' ? 'overwrite' : 'skip'}`;
      if (activeFile) {
        const isExcel = activeFile.name.endsWith('.xlsx') || activeFile.name.endsWith('.xls') || activeFile.name.endsWith('.csv');
        if (isExcel) {
          uploadEndpoint = `/upload/excel?policy=${duplicatePolicy === 'overwrite' ? 'overwrite' : 'skip'}`;
        }
      }

      const response = await apiClient.post(uploadEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Invalidate all related queries to fully re-sync client state
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['officer'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
        queryClient.invalidateQueries({ queryKey: ['metadata'] })
      ]);

      const backendSummary = response.data?.data || {};

      const skippedDetails: { regNo: string; name: string; reason: string }[] = [];
      
      if (duplicatePolicy === 'skip') {
        duplicateRows.forEach(r => {
          skippedDetails.push({
            regNo: r.regNo || 'N/A',
            name: r.name || 'Unknown',
            reason: 'Duplicate Register Number (Skipped)'
          });
        });
      }

      errorRows.forEach(r => {
        const issues: string[] = [];
        if (r.validation.regNo) issues.push('Missing Register Number');
        if (r.validation.name) issues.push('Missing Student Name');
        if (r.validation.dept) issues.push('Invalid/Missing Department');
        if (r.validation.batch_year) issues.push('Invalid/Missing Batch Year');
        if (r.validation.cgpa) issues.push('Invalid/Missing CGPA');
        if (r.validation.arrears) issues.push('Invalid/Missing Arrears');
        if (r.validation.company) issues.push('Invalid Company/Package');
        if (r.validation.email) issues.push('Invalid HR Email');
        
        skippedDetails.push({
          regNo: r.regNo || 'N/A',
          name: r.name || 'Unknown',
          reason: `Invalid fields: ${issues.join(', ')}`
        });
      });

      const totalInserted = (backendSummary.studentsInserted || 0) + 
                            (backendSummary.companiesInserted || 0) + 
                            (backendSummary.placementsInserted || 0) + 
                            (backendSummary.hrInserted || 0);

      const totalUpdated = (backendSummary.studentsUpdated || 0) + 
                          (backendSummary.companiesUpdated || 0) + 
                          (backendSummary.placementsUpdated || 0) + 
                          (backendSummary.hrUpdated || 0);

      const report: ImportReport = {
        filename: uploadedFilename || 'imported_file',
        date: new Date().toLocaleString(),
        totalRecords: importedRows.length,
        studentsInserted: backendSummary.studentsInserted || 0,
        studentsUpdated: backendSummary.studentsUpdated || 0,
        companiesInserted: backendSummary.companiesInserted || 0,
        companiesUpdated: backendSummary.companiesUpdated || 0,
        placementsInserted: backendSummary.placementsInserted || 0,
        placementsUpdated: backendSummary.placementsUpdated || 0,
        hrInserted: backendSummary.hrInserted || 0,
        hrUpdated: backendSummary.hrUpdated || 0,
        errorCount: backendSummary.invalidRecords || 0,
        duplicateCount: backendSummary.duplicateRecords || 0,
        skippedDetails,
        departmentsCreated: backendSummary.newDepartmentsCreated || 0,
        newDepartments: backendSummary.newDepartments || []
      };

      setImportReport(report);

      setImportHistory(prev => [
        {
          filename: uploadedFilename || 'imported_file',
          date: new Date().toLocaleDateString(),
          recordsImported: totalInserted,
          duplicatesSkipped: backendSummary.duplicateRecords || 0,
          duplicatesOverwritten: totalUpdated,
          policy: duplicatePolicy,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ]);

      setImportedRows([]);
      setUploadedFilename('');
      setActiveFile(null);

    } catch (err) {
      console.error(err);
      alert("Failed to confirm import. Server error.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-5 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-800 flex items-center gap-3 z-[200] animate-toast-in">
          <p className="text-xs font-semibold">{toastMessage}</p>
          <button 
            onClick={() => setShowToast(false)} 
            className="text-slate-400 hover:text-white transition-colors ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Placement Officer Workspace</h1>
          <p className="text-slate-500 text-sm">Coordinate campus drives, filter candidates, log HR communications, and track active selection stages.</p>
        </div>
      </div>

      {/* Tab Navigation Controls */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
        {(['students', 'companies', 'hr', 'eligibility', 'kanban', 'import'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold capitalize transition-all border-b-2 outline-none cursor-pointer ${
              activeTab === tab 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'students' ? 'Students' : tab === 'companies' ? 'Recruiters & Calendar' : tab === 'hr' ? 'HR Directory' : tab === 'eligibility' ? 'Student Eligibility' : tab === 'kanban' ? 'Selection Tracker' : 'Spreadsheet Importer'}
          </button>
        ))}
      </div>

      {/* Dynamic Tab Panel Renderings */}
      {activeTab === 'students' && <StudentManagementPanel selectedYear={selectedYear} />}

      {activeTab === 'companies' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Recruiter List Table */}
            <div className="lg:col-span-2 flex flex-col gap-6 h-full">
              
              {/* A) Company Management Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Recruiter List</h3>
                    <p className="text-slate-400 text-[10px]">Add, edit, or delete registered corporate placement partners.</p>
                  </div>
                  <button
                    onClick={() => { 
                      setEditingCompany(null); 
                      setCompanyForm({ name: '', role: '', package: '', cgpa: '6.0', arrears: '0', dept: departments[0] || 'CSE', skills: '', driveDate: '', location: '' });
                      setFormErrors({});
                      setShowAddCompany(true); 
                    }}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Company</span>
                  </button>
                </div>

                {/* TanStack Table rendering */}
                <div className="overflow-x-auto overflow-y-auto flex-1 animate-table-fade">
                  <table className="w-full text-left border-collapse text-xs table-row-hover">
                    <thead>
                      {table.getHeaderGroups().map(hg => (
                        <tr key={hg.id} className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider">
                          {hg.headers.map(h => (
                            <th key={h.id} className="px-6 py-3 font-bold">
                              {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {table.getRowModel().rows.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="px-6 py-3.5">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginate control */}
                <div className="px-6 py-3 border-t border-slate-150 flex items-center justify-between bg-slate-50/10">
                  <span className="text-slate-400 text-[10px]">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="px-2.5 py-1 border border-slate-200 rounded text-[10px] font-semibold bg-white disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="px-2.5 py-1 border border-slate-200 rounded text-[10px] font-semibold bg-white disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Drive Records */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Drive Calendar</h3>
                    <p className="text-slate-400 text-[10px]">Live recruiter drives for the selected batch year.</p>
                  </div>
                </div>

                {drives.length > 0 ? (
                  <div className="space-y-3">
                    {drives.slice(0, 6).map((drive) => (
                      <div key={drive.id} className="flex flex-col p-3 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-slate-800 text-xs truncate">{drive.company}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600">{drive.status}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Drive date: {drive.date || 'TBD'}</p>
                        <span className="text-[9px] text-slate-400 mt-2 block font-medium">{drive.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    No drive records found for the selected batch year.
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-800">Drive Follow-Ups</h3>
                  <p className="text-slate-400 text-[10px]">Live drive reminders derived from the selected batch's recruiter list.</p>
                </div>

                {drives.length > 0 ? (
                  <div className="space-y-3">
                    {drives.slice(0, 3).map((drive, index) => (
                      <div key={drive.id} className="flex flex-col p-3 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs">{drive.company}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${index === 0 ? 'text-rose-600 bg-rose-50' : index === 1 ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50'}`}>
                            {index === 0 ? 'Next' : index === 1 ? 'Soon' : 'Scheduled'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Drive date: {drive.date || 'TBD'}</p>
                        <span className="text-[9px] text-slate-400 mt-2 block font-medium">{drive.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    No follow-up items available for the selected batch year.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Modal Dialog */}
          {showAddCompany && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4 animate-overlay-fade"
              onClick={() => { setShowAddCompany(false); setEditingCompany(null); }}
            >
              <div 
                className="w-full max-w-[800px] rounded-3xl bg-white shadow-2xl border border-slate-200 animate-modal-scale flex flex-col max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">
                      {editingCompany ? 'Edit Company Registration' : 'Register Corporate Recruiter Drive'}
                    </h3>
                    <p className="text-slate-400 text-[10px]">Ensure compliance with batch eligibility cutoffs.</p>
                  </div>
                  <button
                    onClick={() => { setShowAddCompany(false); setEditingCompany(null); }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <span className="text-sm font-bold">✕</span>
                  </button>
                </div>

                <form onSubmit={handleCompanySubmit} className="flex flex-col flex-1 overflow-hidden">
                  <div className="p-6 overflow-y-auto space-y-4 max-h-[calc(90vh-130px)]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company Name</label>
                        <input
                          type="text"
                          value={companyForm.name}
                          onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                          placeholder="e.g. Google"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        {formErrors.name && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.name}</p>}
                      </div>

                      {/* Role */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Role Offered</label>
                        <input
                          type="text"
                          value={companyForm.role}
                          onChange={(e) => setCompanyForm({ ...companyForm, role: e.target.value })}
                          placeholder="e.g. SDE Analyst"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        {formErrors.role && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.role}</p>}
                      </div>

                      {/* Package */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">LPA Package</label>
                        <input
                          type="text"
                          value={companyForm.package}
                          onChange={(e) => setCompanyForm({ ...companyForm, package: e.target.value })}
                          placeholder="e.g. 18.5"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        {formErrors.package && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.package}</p>}
                      </div>

                      {/* CGPA */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Min CGPA</label>
                        <input
                          type="number"
                          step="0.1"
                          value={companyForm.cgpa}
                          onChange={(e) => setCompanyForm({ ...companyForm, cgpa: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        {formErrors.cgpa && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.cgpa}</p>}
                      </div>

                      {/* Arrears */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Max Arrears</label>
                        <input
                          type="number"
                          value={companyForm.arrears}
                          onChange={(e) => setCompanyForm({ ...companyForm, arrears: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        {formErrors.arrears && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.arrears}</p>}
                      </div>

                      {/* Dept */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Department</label>
                        <select
                          value={companyForm.dept}
                          onChange={(e) => setCompanyForm({ ...companyForm, dept: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                          {departments.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>

                      {/* Drive Date */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Drive Date</label>
                        <input
                          type="date"
                          value={companyForm.driveDate}
                          onChange={(e) => setCompanyForm({ ...companyForm, driveDate: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                        />
                        {formErrors.driveDate && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.driveDate}</p>}
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
                        <input
                          type="text"
                          value={companyForm.location}
                          onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                          placeholder="e.g. On-Campus Hall A"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        {formErrors.location && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.location}</p>}
                      </div>

                      {/* Skills */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Required Skills</label>
                        <input
                          type="text"
                          value={companyForm.skills}
                          onChange={(e) => setCompanyForm({ ...companyForm, skills: e.target.value })}
                          placeholder="e.g. Java, Python"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        {formErrors.skills && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{formErrors.skills}</p>}
                      </div>
                    </div>

                    {formErrors.submit && (
                      <p className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                        {formErrors.submit}
                      </p>
                    )}

                    {/* PDF Upload Field */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Job Description (PDF upload)</label>
                      <div className="border border-dashed border-slate-200 rounded-xl p-3 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <span className="text-[10px] text-slate-400 font-medium">Drag or select JD PDF brochure file...</span>
                        <span className="text-[9px] bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded font-bold cursor-pointer transition-all">Upload JD</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 px-6 py-4 flex gap-2 justify-end bg-slate-50">
                    <button
                      type="button"
                      onClick={() => { setShowAddCompany(false); setEditingCompany(null); }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/10"
                    >
                      {editingCompany ? 'Save Changes' : 'Confirm Registration'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {deleteTargetCompany && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 animate-overlay-fade" onClick={() => setDeleteTargetCompany(null)}>
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-modal-scale" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-extrabold text-slate-800">Delete Company</h3>
                <p className="mt-2 text-xs text-slate-500">
                  Delete <span className="font-bold text-slate-700">{deleteTargetCompany.name}</span>? This cannot be undone.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTargetCompany(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteCompany}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* C) HR Management Panel */}
      {activeTab === 'hr' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">HR Directory Panel</h3>
              <p className="text-slate-400 text-[10px]">Log communication notes and contact info for active corporate partners.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  value={hrSearch}
                  onChange={(e) => setHrSearch(e.target.value)}
                  placeholder="Search HR name or company..."
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                onClick={() => setShowAddHR(!showAddHR)}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add HR</span>
              </button>
            </div>
          </div>

          {/* Add HR form card */}
          {showAddHR && (
            <form onSubmit={handleAddHR} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">HR Name</label>
                <input
                  type="text"
                  value={hrForm.name}
                  onChange={(e) => setHrForm({ ...hrForm, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full border border-slate-200 rounded p-1.5 text-xs bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={hrForm.email}
                  onChange={(e) => setHrForm({ ...hrForm, email: e.target.value })}
                  placeholder="e.g. john@google.com"
                  className="w-full border border-slate-200 rounded p-1.5 text-xs bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone</label>
                <input
                  type="text"
                  value={hrForm.phone}
                  onChange={(e) => setHrForm({ ...hrForm, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full border border-slate-200 rounded p-1.5 text-xs bg-white focus:outline-none"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company</label>
                  <input
                    type="text"
                    value={hrForm.company}
                    onChange={(e) => setHrForm({ ...hrForm, company: e.target.value })}
                    placeholder="e.g. Google"
                    className="w-full border border-slate-200 rounded p-1.5 text-xs bg-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all cursor-pointer h-[34px]"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {/* HR Cards Directory List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHRs.map(hr => (
              <div key={hr.id} className="border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800">{hr.name}</h4>
                      <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{hr.company} HR</span>
                    </div>
                    <button
                      onClick={() => handleDeleteHR(hr.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                      title="Delete HR"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-slate-500 text-xs">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span>{hr.email}</span>
                    </div>
                    {hr.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span>{hr.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes Timeline logs */}
                  {hr.notes && (
                    <div className="bg-slate-50/50 border border-slate-250/30 rounded-lg p-3 text-[10px] text-slate-600 whitespace-pre-line leading-relaxed">
                      <span className="font-bold text-slate-500 block mb-1">Communications Log:</span>
                      {hr.notes}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  {selectedHRForNote === hr.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={newCommunicationNote}
                        onChange={(e) => setNewCommunicationNote(e.target.value)}
                        placeholder="Log contact call or scheduling details..."
                        className="w-full border border-slate-200 rounded p-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        rows={2}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setSelectedHRForNote(null)}
                          className="px-2 py-1 text-[9px] font-bold border border-slate-200 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAddNote(hr.id)}
                          className="px-2.5 py-1 text-[9px] font-bold bg-blue-600 text-white rounded shadow-sm"
                        >
                          Save Log
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedHRForNote(hr.id)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Append Communication Log Note</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* F) Eligibility Filter System */}
      {activeTab === 'eligibility' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 h-fit">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800">Student Eligibility Filters</h3>
              <p className="text-slate-400 text-[10px]">Filter candidates by grades, departments, and active backlogs.</p>
            </div>

            <div className="space-y-4">
              {/* CGPA Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <span>Minimum CGPA</span>
                  <span className="text-blue-600 font-extrabold text-sm">{filterCGPA.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="5.0"
                  max="10.0"
                  step="0.1"
                  value={filterCGPA}
                  onChange={(e) => setFilterCGPA(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Max Arrears */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Max Active Arrears</label>
                <select
                  value={filterArrears}
                  onChange={(e) => setFilterArrears(parseInt(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="0">0 (Strictly No History)</option>
                  <option value="1">Max 1 Arrear</option>
                  <option value="2">Max 2 Arrears</option>
                  <option value="5">All Candidates</option>
                </select>
              </div>

              {/* Departments checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Branches</label>
                <div className="flex flex-wrap gap-3">
                  {departments.map(dept => {
                    const checked = filterDepts.includes(dept);
                    return (
                      <button
                        key={dept}
                        onClick={() => {
                          if (checked) {
                            setFilterDepts(filterDepts.filter(d => d !== dept));
                          } else {
                            setFilterDepts([...filterDepts, dept]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          checked 
                            ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {dept}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Skills text filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Required Skills</label>
                <input
                  type="text"
                  value={filterSkills}
                  onChange={(e) => setFilterSkills(e.target.value)}
                  placeholder="e.g. React, Python (comma separated)"
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Results list Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Matched Candidates</h3>
                <p className="text-slate-400 text-[10px]">
                  Found <span className="font-extrabold text-blue-600">{filterResult?.students?.length || 0}</span> students matching filter criteria.
                </p>
              </div>

              {filterResult && (filterResult.students?.length || 0) > 0 && (
                <button
                  onClick={downloadEligibleStudentsExcel}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:shadow-md cursor-pointer transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Excel List</span>
                </button>
              )}
            </div>

            {/* Students matched list table */}
            <div className="overflow-x-auto animate-table-fade">
              <table className="w-full text-left border-collapse text-xs table-row-hover">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider">
                    <th className="px-6 py-2.5 font-semibold">Student Name</th>
                    <th className="px-6 py-2.5 font-semibold">Branch</th>
                    <th className="px-6 py-2.5 font-semibold">CGPA</th>
                    <th className="px-6 py-2.5 font-semibold">Backlogs</th>
                    <th className="px-6 py-2.5 font-semibold">Skills</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filterResult?.students && filterResult.students.length > 0 ? (
                    filterResult.students.map((student: { name: string; dept: string; cgpa: number; arrears: number; skills: string[] }, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3 font-bold text-slate-850">{student.name}</td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold text-[10px]">
                            {student.dept}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-semibold text-slate-800">{student.cgpa}</td>
                        <td className="px-6 py-3 text-slate-500 font-semibold">{student.arrears} arrears</td>
                        <td className="px-6 py-3 text-slate-400 font-medium truncate max-w-xs">{student.skills.join(', ')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No candidates match current eligibility criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* G) Student Selection Tracking Kanban Board */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {['Applied', 'Shortlisted', 'Interviewed', 'Selected', 'Rejected'].map(stage => {
            const stageStudents = kanbanStudents.filter(s => s.stage === stage);
            
            // Set header tag colors
            let headerColor = 'bg-slate-100 text-slate-700 border-slate-200';
            if (stage === 'Selected') headerColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            if (stage === 'Rejected') headerColor = 'bg-rose-50 text-rose-700 border-rose-200';

            return (
              <div key={stage} className="bg-slate-100/50 border border-slate-200 rounded-2xl p-4 flex flex-col h-[500px]">
                <div className={`px-3 py-2 rounded-xl border flex items-center justify-between mb-4 font-bold text-xs uppercase tracking-wider ${headerColor}`}>
                  <span>{stage}</span>
                  <span className="bg-white/80 px-2 py-0.5 rounded text-[10px]">{stageStudents.length}</span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {stageStudents.map(student => (
                    <div key={student.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 hover:border-slate-350 transition-colors">
                      <h4 className="font-extrabold text-xs text-slate-800">{student.name}</h4>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-slate-500 uppercase">{student.company}</span>
                      </div>
                      
                      {/* Action buttons to trigger stage movements */}
                      {stage !== 'Selected' && stage !== 'Rejected' && (
                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <button
                            onClick={() => {
                              const stages = ['Applied', 'Shortlisted', 'Interviewed', 'Selected'];
                              const nextIdx = stages.indexOf(stage) + 1;
                              if (nextIdx < stages.length) {
                                handleMoveStage(student.id, stages[nextIdx]);
                              }
                            }}
                            className="text-[9px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Advance</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* H) Data Import Module */}
      {activeTab === 'import' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-extrabold text-slate-800">Batch Student Data Importer</h3>
            <p className="text-slate-400 text-[10px]">Upload Excel/CSV candidate spreadsheets to populate placement registration directory pools.</p>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx,.xls,.csv,.json" 
            className="hidden" 
          />

          {/* Drag & Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            className={`border-2 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
              isDragging 
                ? 'border-blue-500 bg-blue-50/20' 
                : 'border-slate-200 hover:border-slate-350 bg-slate-50/30'
            }`}
          >
            <UploadCloud className="h-10 w-10 text-blue-500 animate-bounce" />
            <div>
              <p className="text-xs font-bold text-slate-700">Drag and drop your Excel, CSV, or JSON file here to import students</p>
              <p className="text-[10px] text-slate-400 mt-1">Accepts .xlsx, .xls, .csv, .json templates</p>
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleBrowseClick(); }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                Browse Files
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowFormatGuide(true); }}
                className="flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
              >
                <span>📘</span>
                <span>Format Guide</span>
              </button>
              <p className="text-[10px] text-slate-400 ml-1">Use a real spreadsheet export to preview imported records.</p>
            </div>
          </div>

          {/* Import Previews */}
          {importedRows.length > 0 && (
            <div className="space-y-4">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Records Found</span>
                  <h4 className="text-lg font-black text-slate-800 mt-1">{importedRows.length}</h4>
                </div>
                <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 shadow-sm">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Valid Rows</span>
                  <h4 className="text-lg font-black text-emerald-700 mt-1">
                    {importedRows.filter(r => !r.hasError && !r.isDuplicate).length}
                  </h4>
                </div>
                <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100 shadow-sm">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Row Duplicates</span>
                  <h4 className="text-lg font-black text-rose-700 mt-1">
                    {importedRows.filter(r => r.isDuplicate).length}
                  </h4>
                </div>
                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 shadow-sm">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Row Errors</span>
                  <h4 className="text-lg font-black text-amber-700 mt-1">
                    {importedRows.filter(r => r.hasError).length}
                  </h4>
                </div>
              </div>

              {/* Conflict Policy Selector */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Duplicate Resolution Policy</h4>
                  <p className="text-slate-400 text-[10px] mt-0.5">Determine how to handle matching records across distributed collections.</p>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-650">
                    <input
                      type="radio"
                      name="duplicatePolicy"
                      checked={duplicatePolicy === 'skip'}
                      onChange={() => setDuplicatePolicy('skip')}
                      className="text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                    />
                    <span>Skip Duplicates (Keep Existing)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-650">
                    <input
                      type="radio"
                      name="duplicatePolicy"
                      checked={duplicatePolicy === 'overwrite'}
                      onChange={() => setDuplicatePolicy('overwrite')}
                      className="text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                    />
                    <span>Update Existing Database Records</span>
                  </label>
                </div>
              </div>

              {/* Preview Filter Tabs */}
              <div className="flex border-b border-slate-200 text-xs">
                {(['all', 'new', 'duplicates', 'errors'] as const).map((tab) => {
                  let count = 0;
                  if (tab === 'all') count = importedRows.length;
                  else if (tab === 'new') count = importedRows.filter(r => !r.hasError && !r.isDuplicate).length;
                  else if (tab === 'duplicates') count = importedRows.filter(r => r.isDuplicate).length;
                  else if (tab === 'errors') count = importedRows.filter(r => r.hasError).length;

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPreviewTab(tab)}
                      className={`px-4 py-2 border-b-2 font-bold capitalize transition-all cursor-pointer ${
                        previewTab === tab
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {tab === 'new' ? 'New Records' : tab === 'duplicates' ? 'Duplicates' : tab === 'errors' ? 'Errors' : 'All Records'} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
                  <span>Master Placement File Preview: {uploadedFilename}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Verify structural maps before database submission</span>
                </div>
                <div className="overflow-x-auto animate-table-fade">
                  <table className="w-full text-left text-xs border-collapse min-w-[1200px] table-row-hover">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-200 uppercase text-[10px]">
                        <th className="px-4 py-2 font-semibold">Register No</th>
                        <th className="px-4 py-2 font-semibold">Student Name</th>
                        <th className="px-4 py-2 font-semibold">Batch</th>
                        <th className="px-4 py-2 font-semibold">Dept</th>
                        <th className="px-4 py-2 font-semibold">CGPA</th>
                        <th className="px-4 py-2 font-semibold">Arrears</th>
                        <th className="px-4 py-2 font-semibold">Recruiter / Offer</th>
                        <th className="px-4 py-2 font-semibold">Package</th>
                        <th className="px-4 py-2 font-semibold">Status</th>
                        <th className="px-4 py-2 font-semibold">HR Contact</th>
                        <th className="px-4 py-2 font-semibold">Affected DB Collections</th>
                        <th className="px-4 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {importedRows
                        .filter(r => {
                          if (previewTab === 'new') return !r.hasError && !r.isDuplicate;
                          if (previewTab === 'duplicates') return r.isDuplicate;
                          if (previewTab === 'errors') return r.hasError;
                          return true;
                        })
                        .map((r, i) => {
                          let statusText = "Valid Row";
                          let statusColor = "text-emerald-700 bg-emerald-50 border-emerald-100";
                          if (r.isDuplicate) {
                            if (duplicatePolicy === 'overwrite') {
                              statusText = "Duplicate (UPDATE)";
                              statusColor = "text-blue-700 bg-blue-50 border-blue-100 animate-pulse";
                            } else {
                              statusText = "Duplicate (SKIP)";
                              statusColor = "text-rose-700 bg-rose-50 border-rose-100";
                            }
                          } else if (r.hasError) {
                            statusText = "Invalid (SKIP)";
                            statusColor = "text-amber-700 bg-amber-50 border-amber-100";
                          }

                          return (
                            <tr key={i} className="hover:bg-slate-50/30">
                              <td className={`px-4 py-3 font-semibold ${r.validation.regNo ? 'bg-amber-50 text-amber-800' : ''}`}>
                                {r.regNo || <span className="italic text-slate-400">Missing</span>}
                              </td>
                              <td className={`px-4 py-3 font-bold ${r.validation.name ? 'bg-amber-50 text-amber-800' : ''}`}>
                                {r.name || <span className="italic text-slate-400">Missing</span>}
                              </td>
                              <td className={`px-4 py-3 font-semibold ${r.validation.batch_year ? 'bg-amber-50 text-amber-800' : ''}`}>
                                {isNaN(r.batch_year) ? 'N/A' : r.batch_year}
                              </td>
                              <td className={`px-4 py-3 ${r.validation.dept ? 'bg-amber-50 text-amber-800' : ''}`}>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-650 rounded font-semibold text-[10px]">
                                  {r.dept || 'N/A'}
                                </span>
                              </td>
                              <td className={`px-4 py-3 font-semibold ${r.validation.cgpa ? 'bg-amber-50 text-amber-800' : ''}`}>
                                {isNaN(r.cgpa) ? 'N/A' : r.cgpa}
                              </td>
                              <td className={`px-4 py-3 text-slate-500 font-semibold ${r.validation.arrears ? 'bg-amber-50 text-amber-800' : ''}`}>
                                {isNaN(r.arrears) ? 'N/A' : `${r.arrears} arrears`}
                              </td>
                              <td className="px-4 py-3 font-semibold">
                                {r.company_name ? (
                                  <div>
                                    <p className="text-slate-800">{r.company_name}</p>
                                    {r.role && <p className="text-[10px] text-slate-400">{r.role}</p>}
                                  </div>
                                ) : (
                                  <span className="italic text-slate-350">None</span>
                                )}
                              </td>
                              <td className={`px-4 py-3 font-semibold ${r.validation.company ? 'bg-amber-50 text-amber-800' : ''}`}>
                                {isNaN(r.packageVal) ? 'N/A' : `${r.packageVal} LPA`}
                              </td>
                              <td className="px-4 py-3">
                                {r.placement_status ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    r.placement_status === 'Placed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {r.placement_status}
                                  </span>
                                ) : 'N/A'}
                              </td>
                              <td className={`px-4 py-3 ${r.validation.email ? 'bg-amber-50 text-amber-800' : ''}`}>
                                {r.hr_name ? (
                                  <div>
                                    <p className="text-slate-700 font-bold">{r.hr_name}</p>
                                    <p className="text-[9px] text-slate-400">{r.hr_email}</p>
                                  </div>
                                ) : 'N/A'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-bold">Students</span>
                                  {r.company_name && (
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-bold">Companies</span>
                                  )}
                                  {r.company_name && r.placement_status && (
                                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[9px] font-bold">Placements</span>
                                  )}
                                  {r.company_name && r.hr_name && r.hr_email && (
                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[9px] font-bold">HR Contacts</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold border ${statusColor}`}>
                                  {statusText}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Confirm submit buttons */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setImportedRows([]); setUploadedFilename(''); setActiveFile(null); }}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Import
                </button>
                <button
                  onClick={confirmImport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  Confirm Master Import
                </button>
              </div>
            </div>
          )}

          {/* Import Feedback Report */}
          {importReport && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700 border-b border-slate-200 pb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h4 className="font-extrabold text-sm text-slate-800">Master Placement Data Import Success Report</h4>
              </div>

              {/* Collection stats summary grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Students Pool</span>
                  <p className="font-extrabold text-slate-800 mt-1">Inserted: <span className="text-emerald-600">{importReport.studentsInserted}</span></p>
                  <p className="font-extrabold text-slate-800">Updated: <span className="text-blue-600">{importReport.studentsUpdated}</span></p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Recruiters Drives</span>
                  <p className="font-extrabold text-slate-800 mt-1">Inserted: <span className="text-emerald-600">{importReport.companiesInserted}</span></p>
                  <p className="font-extrabold text-slate-800">Updated: <span className="text-blue-600">{importReport.companiesUpdated}</span></p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Placements Logs</span>
                  <p className="font-extrabold text-slate-800 mt-1">Inserted: <span className="text-emerald-600">{importReport.placementsInserted}</span></p>
                  <p className="font-extrabold text-slate-800">Updated: <span className="text-blue-600">{importReport.placementsUpdated}</span></p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">HR Contacts Directory</span>
                  <p className="font-extrabold text-slate-800 mt-1">Inserted: <span className="text-emerald-600">{importReport.hrInserted}</span></p>
                  <p className="font-extrabold text-slate-800">Updated: <span className="text-blue-600">{importReport.hrUpdated}</span></p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs col-span-2 md:col-span-1">
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">New Departments Created: {importReport.departmentsCreated || 0}</span>
                  {importReport.newDepartments && importReport.newDepartments.length > 0 ? (
                    <div className="mt-1 space-y-0.5 max-h-12 overflow-y-auto text-slate-800 font-bold">
                      {importReport.newDepartments.map((dept, idx) => (
                        <div key={idx} className="truncate">{dept}</div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 mt-1 font-semibold">None</p>
                  )}
                </div>
              </div>

              {/* General Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs pt-3 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block">Filename:</span>
                  <span className="font-bold text-slate-700 truncate max-w-[150px] block">{importReport.filename}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Ingestion Conflict Policy:</span>
                  <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block capitalize">{duplicatePolicy}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Ignored / Duplicate Rows:</span>
                  <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 inline-block">{importReport.duplicateCount} Rows</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Invalid Rows Skipped:</span>
                  <span className="font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 inline-block">{importReport.errorCount} Rows</span>
                </div>
              </div>

              {importReport.skippedDetails.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-3">
                  <div className="px-4 py-2.5 bg-slate-100/50 border-b border-slate-200 font-bold text-xs text-slate-700">
                    Importer Rejection Reason Logs
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                    {importReport.skippedDetails.map((item, idx) => (
                      <div key={idx} className="px-4 py-2 flex items-center justify-between hover:bg-slate-50/50">
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-slate-700">{item.regNo}</span>
                          <span className="text-slate-500 font-medium">{item.name}</span>
                        </div>
                        <span className="text-rose-600 font-semibold bg-rose-50/50 px-2 py-0.5 rounded">
                          {item.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import History Table */}
          <div className="space-y-3 mt-6 border-t border-slate-100 pt-6">
            <h4 className="font-extrabold text-xs text-slate-750 uppercase tracking-wider">Spreadsheet Import History Logs</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm animate-table-fade">
              <table className="w-full text-left text-xs border-collapse table-row-hover">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px]">
                    <th className="px-5 py-3 font-semibold">Filename</th>
                    <th className="px-5 py-3 font-semibold">Upload Date</th>
                    <th className="px-5 py-3 font-semibold">Records Imported</th>
                    <th className="px-5 py-3 font-semibold">Conflict Policy</th>
                    <th className="px-5 py-3 font-semibold">Skipped / Overwritten</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {importHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30">
                      <td className="px-5 py-3.5 font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span>{item.filename}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{item.date} <span className="text-[10px] text-slate-400">{item.timestamp}</span></td>
                      <td className="px-5 py-3.5 font-semibold text-emerald-600">{item.recordsImported} records</td>
                      <td className="px-5 py-3.5 font-semibold text-indigo-600 capitalize">{item.policy}</td>
                      <td className="px-5 py-3.5 font-semibold">
                        {item.policy === 'overwrite' ? (
                          <span className="text-blue-500">{item.duplicatesOverwritten} overwritten</span>
                        ) : (
                          <span className="text-rose-500">{item.duplicatesSkipped} skipped</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                          <CheckCircle className="h-3 w-3" />
                          <span>Synced</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Format Guide Modal */}
      {showFormatGuide && <FormatGuideModal onClose={() => setShowFormatGuide(false)} />}
    </div>
  );
};
