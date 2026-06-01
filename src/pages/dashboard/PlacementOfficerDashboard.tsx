import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCompaniesQuery, useHRQuery, useDrivesQuery, usePlacementsQuery, useStudentFilterQuery, useAddHRMutation, useUpdateHRMutation, useDeleteHRMutation } from '../../hooks/useOfficerData';
import type { Company } from '../../types';
import { useMetadataQuery } from '../../hooks/useMetadata';
import { useAuthStore } from '../../store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { StudentManagementPanel } from '../../components/StudentManagementPanel';
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

export const PlacementOfficerDashboard: React.FC = () => {
  const { selectedYear } = useAuthStore();
  console.log('selectedYear', selectedYear);
  const { data: initCompanies, refetch: refetchCompanies } = useCompaniesQuery(selectedYear);
  const { data: initHRs } = useHRQuery(selectedYear);
  const addHRMutation = useAddHRMutation();
  const updateHRMutation = useUpdateHRMutation();
  const deleteHRMutation = useDeleteHRMutation();
  const { data: initDrives } = useDrivesQuery(selectedYear);
  const { data: initPlacements } = usePlacementsQuery(selectedYear);
  const { data: metadata } = useMetadataQuery();

  const departments = useMemo(() => {
    return metadata?.departments || ['CSE', 'IT', 'ECE', 'ME', 'CE'];
  }, [metadata]);

  // Selected Active Tab
  const [activeTab, setActiveTab] = useState<'students' | 'companies' | 'hr' | 'eligibility' | 'kanban' | 'import'>('companies');

  // Reactive State derived from Queries
  const [hrs, setHRs] = useState<any[]>([]);
  const [drives, setDrives] = useState<any[]>([]);
  const [kanbanStudents, setKanbanStudents] = useState<any[]>([]);

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
  const [formErrors, setFormErrors] = useState<any>({});
  
  // Form values (Add/Edit Company)
  const [companyForm, setCompanyForm] = useState({
    name: '', role: '', package: '', cgpa: '6.0', arrears: '0', dept: 'CSE', skills: '', driveDate: '', location: ''
  });

  useEffect(() => {
    if (departments.length > 0 && !departments.includes(companyForm.dept)) {
      setCompanyForm(prev => ({ ...prev, dept: departments[0] }));
    }
  }, [departments]);

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
  ], []);

  const table = useReactTable({
    data: initCompanies || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 4
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
      const fieldErrors: any = {};
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
        queryClient.invalidateQueries({ queryKey: ['officer', 'companies', selectedYear], exact: true }),
        queryClient.invalidateQueries({ queryKey: ['search', 'companies'] }),
      ]);

      await refetchCompanies();

      setEditingCompany(null);
      setCompanyForm({ name: '', role: '', package: '', cgpa: '6.0', arrears: '0', dept: departments[0] || 'CSE', skills: '', driveDate: '', location: '' });
      setShowAddCompany(false);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to save company';
      setFormErrors({ submit: message });
    }
  };

  const handleEditClick = (comp: Company) => {
    setEditingCompany(comp);
    setCompanyForm({
      name: comp.name,
      role: comp.role || '',
      package: (comp.package || comp.packageOffer || '').replace(' LPA', ''),
      cgpa: '6.0',
      arrears: '0',
      dept: (comp as any).dept || departments[0] || 'CSE',
      skills: 'React, Node',
      driveDate: comp.driveDate,
      location: 'Campus'
    });
    setShowAddCompany(true);
  };

  const handleDeleteCompany = (company: Company) => {
    setDeleteTargetCompany(company);
  };

  const confirmDeleteCompany = async () => {
    if (!deleteTargetCompany) return;

    try {
      await apiClient.delete(`/companies/${deleteTargetCompany.id}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['officer', 'companies', selectedYear], exact: true }),
        queryClient.invalidateQueries({ queryKey: ['search', 'companies'] }),
      ]);

      await refetchCompanies();

      setDeleteTargetCompany(null);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to delete company';
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
    if (isNaN(batchYear) || selectedYear === 'All') {
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
  }, [departments]);
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
      filterResult.students.map((s: any) => ({
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
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState<string>('');
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'overwrite'>('skip');
  const [previewTab, setPreviewTab] = useState<'all' | 'new' | 'duplicates' | 'errors'>('all');

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
    importedCount: number;
    duplicateCount: number;
    overwrittenCount: number;
    errorCount: number;
    skippedDetails: { regNo: string; name: string; reason: string }[];
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
        let rawRows: any[] = [];
        if (isJson) {
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
          const parsed = JSON.parse(text);
          rawRows = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          rawRows = XLSX.utils.sheet_to_json<any>(worksheet);
        }

        const parsed = rawRows.map((row: any) => {
          const getVal = (possibleKeys: string[]) => {
            const key = Object.keys(row).find(k => 
              possibleKeys.some(pk => k.toLowerCase().replace(/[\s_.-]/g, '') === pk)
            );
            return key ? row[key] : undefined;
          };

          const regNoRaw = getVal(['regno', 'regnumber', 'registerno', 'registernumber', 'rollno', 'rollnumber', 'id']);
          const nameRaw = getVal(['name', 'studentname', 'fullname']);
          const deptRaw = getVal(['dept', 'department', 'branch']);
          const cgpaRaw = getVal(['cgpa', 'gpa', 'grades']);
          const arrearsRaw = getVal(['arrears', 'backlogs', 'activearrears', 'activebacklogs']);
          const skillsRaw = getVal(['skills', 'skillslist', 'skillslistcommaseparated']);

          const regNo = regNoRaw ? String(regNoRaw).trim() : '';
          const name = nameRaw ? String(nameRaw).trim() : '';
          const dept = deptRaw ? String(deptRaw).trim().toUpperCase() : '';
          const cgpa = cgpaRaw !== undefined ? parseFloat(cgpaRaw) : NaN;
          const arrears = arrearsRaw !== undefined ? parseInt(arrearsRaw, 10) : NaN;
          
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
          const isDeptInvalid = !dept || !departments.includes(dept);
          const isCgpaInvalid = isNaN(cgpa) || cgpa < 0 || cgpa > 10;
          const isArrearsInvalid = isNaN(arrears) || arrears < 0;

          return {
            regNo,
            name,
            dept,
            cgpa: isNaN(cgpa) ? cgpaRaw : cgpa,
            arrears: isNaN(arrears) ? arrearsRaw : arrears,
            skills: skillsArray,
            skillsString: skillsRaw ? String(skillsRaw) : '',
            validation: {
              regNo: isRegNoInvalid,
              name: isNameInvalid,
              dept: isDeptInvalid,
              cgpa: isCgpaInvalid,
              arrears: isArrearsInvalid,
            },
            hasError: isRegNoInvalid || isNameInvalid || isDeptInvalid || isCgpaInvalid || isArrearsInvalid,
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
          const isExisting = kanbanStudents.some(s => s.regNo === item.regNo);
          if (isExisting) {
            isDup = true;
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
      if (duplicatePolicy === 'overwrite') {
        setKanbanStudents(prev => {
          const updated = prev.map(s => {
            const match = duplicateRows.find(dr => dr.regNo === s.regNo);
            if (match) {
              return { ...s, name: match.name, dept: match.dept };
            }
            return s;
          });

          const onlyNew = newRows.map((r, i) => ({
            id: `imported-${Date.now()}-${i}`,
            regNo: r.regNo,
            name: r.name,
            stage: 'Applied',
            company: 'General Pool'
          }));

          return [...updated, ...onlyNew];
        });
      } else {
        const onlyNew = newRows.map((r, i) => ({
          id: `imported-${Date.now()}-${i}`,
          regNo: r.regNo,
          name: r.name,
          stage: 'Applied',
          company: 'General Pool'
        }));
        setKanbanStudents(prev => [...prev, ...onlyNew]);
      }

      const formData = new FormData();
      if (activeFile) {
        formData.append('file', activeFile);
      } else {
        const blob = new Blob([JSON.stringify(validRowsToImport)], { type: 'application/json' });
        formData.append('file', blob, uploadedFilename || 'dummy_data.json');
      }
      formData.append('year', selectedYear);
      formData.append('validCount', String(validRowsToImport.length));
      formData.append('students', JSON.stringify(validRowsToImport.map(r => ({
        name: r.name,
        dept: r.dept,
        cgpa: r.cgpa,
        arrears: r.arrears,
        skills: r.skills
      }))));

      let uploadEndpoint = '/upload/json';
      if (activeFile) {
        const isExcel = activeFile.name.endsWith('.xlsx') || activeFile.name.endsWith('.xls') || activeFile.name.endsWith('.csv');
        if (isExcel) {
          uploadEndpoint = '/upload/excel';
        }
      }

      await apiClient.post(uploadEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['officer', 'students'] });

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
        if (r.validation.cgpa) issues.push('Invalid/Missing CGPA');
        if (r.validation.arrears) issues.push('Invalid/Missing Arrears');
        
        skippedDetails.push({
          regNo: r.regNo || 'N/A',
          name: r.name || 'Unknown',
          reason: `Invalid fields: ${issues.join(', ')}`
        });
      });

      const report: ImportReport = {
        filename: uploadedFilename || 'imported_file',
        date: new Date().toLocaleString(),
        totalRecords: importedRows.length,
        importedCount: validRowsToImport.length,
        duplicateCount: duplicatePolicy === 'skip' ? duplicateRows.length : 0,
        overwrittenCount: duplicatePolicy === 'overwrite' ? duplicateRows.length : 0,
        errorCount: errorRows.length,
        skippedDetails
      };

      setImportReport(report);

      setImportHistory(prev => [
        {
          filename: uploadedFilename || 'imported_file',
          date: new Date().toLocaleDateString(),
          recordsImported: validRowsToImport.length,
          duplicatesSkipped: duplicatePolicy === 'skip' ? duplicateRows.length + errorRows.length : errorRows.length,
          duplicatesOverwritten: duplicatePolicy === 'overwrite' ? duplicateRows.length : 0,
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
    <div className="space-y-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Table & Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* A) Company Management Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Recruiter List</h3>
                  <p className="text-slate-400 text-[10px]">Add, edit, or delete registered corporate placement partners.</p>
                </div>
                <button
                  onClick={() => { setEditingCompany(null); setShowAddCompany(!showAddCompany); }}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Company</span>
                </button>
              </div>

              {/* TanStack Table rendering */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
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
                      <tr key={row.id} className="hover:bg-slate-550/20 transition-colors">
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

            {/* B) Add / Edit Company Validation Form */}
            {showAddCompany && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-800">
                    {editingCompany ? 'Edit Company Registration' : 'Register Corporate Recruiter Drive'}
                  </h3>
                  <p className="text-slate-400 text-[10px]">Ensure compliance with batch eligibility cutoffs.</p>
                </div>

                <form onSubmit={handleCompanySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      <span className="text-[9px] bg-slate-200 hover:bg-slate-350 px-2 py-1 rounded font-bold cursor-pointer transition-all">Upload JD</span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAddCompany(false)}
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
            )}

            {deleteTargetCompany && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
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
            <form onSubmit={handleAddHR} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-4 gap-4">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
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
                    filterResult.students.map((student: any, idx: number) => (
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
              
                  <p className="text-[10px] text-slate-400">Use a real spreadsheet export to preview imported records.</p>
            </div>
          </div>

          {/* Import Previews */}
          {importedRows.length > 0 && (
            <div className="space-y-4">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Records Found</span>
                  <h4 className="text-lg font-black text-slate-800 mt-1">{importedRows.length}</h4>
                </div>
                <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 shadow-sm">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Valid Records</span>
                  <h4 className="text-lg font-black text-emerald-700 mt-1">
                    {importedRows.filter(r => !r.hasError && !r.isDuplicate).length}
                  </h4>
                </div>
                <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100 shadow-sm">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Duplicates Found</span>
                  <h4 className="text-lg font-black text-rose-700 mt-1">
                    {importedRows.filter(r => r.isDuplicate).length}
                  </h4>
                </div>
                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 shadow-sm">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Errors Found</span>
                  <h4 className="text-lg font-black text-amber-700 mt-1">
                    {importedRows.filter(r => r.hasError).length}
                  </h4>
                </div>
              </div>

              {/* Conflict Policy Selector */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Duplicate Resolution Policy</h4>
                  <p className="text-slate-400 text-[10px] mt-0.5">Determine how to handle matching register numbers.</p>
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
                    <span>Skip Duplicates (Filter Out)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-650">
                    <input
                      type="radio"
                      name="duplicatePolicy"
                      checked={duplicatePolicy === 'overwrite'}
                      onChange={() => setDuplicatePolicy('overwrite')}
                      className="text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                    />
                    <span>Overwrite Existing Roster</span>
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
                  <span>File Preview: {uploadedFilename}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Verify data highlights before confirming</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-200 uppercase text-[10px]">
                        <th className="px-4 py-2 font-semibold">Register Number</th>
                        <th className="px-4 py-2 font-semibold">Student Name</th>
                        <th className="px-4 py-2 font-semibold">Department</th>
                        <th className="px-4 py-2 font-semibold">CGPA</th>
                        <th className="px-4 py-2 font-semibold">Arrears</th>
                        <th className="px-4 py-2 font-semibold">Skills</th>
                        <th className="px-4 py-2 font-semibold">Status / Action</th>
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
                          let statusText = "Valid (New)";
                          let statusColor = "text-emerald-700 bg-emerald-50 border-emerald-100";
                          if (r.isDuplicate) {
                            if (duplicatePolicy === 'overwrite') {
                              statusText = "Duplicate (OVERWRITE)";
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
                              <td className={`px-4 py-3 font-semibold ${r.isDuplicate ? (duplicatePolicy === 'overwrite' ? 'bg-blue-50/30 text-blue-900 border-l-4 border-blue-500' : 'bg-rose-50 text-rose-850 font-bold border-l-4 border-rose-500') : r.validation.regNo ? 'bg-amber-50 text-amber-800 border-l-4 border-amber-500' : ''}`}>
                                {r.regNo || <span className="italic text-slate-400">Missing</span>}
                              </td>
                              <td className={`px-4 py-3 font-semibold ${r.validation.name ? 'bg-amber-50 text-amber-800 border-l-4 border-amber-500' : ''}`}>
                                {r.name || <span className="italic text-slate-400">Missing</span>}
                              </td>
                              <td className={`px-4 py-3 ${r.validation.dept ? 'bg-amber-50 text-amber-800 border-l-4 border-amber-500' : ''}`}>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-650 rounded font-semibold text-[10px]">
                                  {r.dept || 'N/A'}
                                </span>
                              </td>
                              <td className={`px-4 py-3 font-semibold ${r.validation.cgpa ? 'bg-amber-50 text-amber-800 border-l-4 border-amber-500' : ''}`}>
                                {r.cgpa}
                              </td>
                              <td className={`px-4 py-3 text-slate-500 font-semibold ${r.validation.arrears ? 'bg-amber-50 text-amber-800 border-l-4 border-amber-500' : ''}`}>
                                {r.arrears} arrears
                              </td>
                              <td className="px-4 py-3 text-slate-400 truncate max-w-xs" title={r.skillsString}>
                                {r.skills.join(', ') || <span className="italic text-slate-350">None</span>}
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
                  Confirm Import
                </button>
              </div>
            </div>
          )}

          {/* Import Feedback Report */}
          {importReport && (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 border-b border-slate-200 pb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h4 className="font-extrabold text-sm text-slate-800">Batch Import Feedback Report</h4>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Filename:</span>
                  <span className="font-bold text-slate-700 truncate max-w-[120px] block">{importReport.filename}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Date of Import:</span>
                  <span className="font-bold text-slate-700">{importReport.date.split(',')[0]}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Successfully Added:</span>
                  <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block">{importReport.importedCount} Students</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Conflict Policy:</span>
                  <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block capitalize">{duplicatePolicy}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Skipped/Overwritten:</span>
                  {duplicatePolicy === 'overwrite' ? (
                    <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block">{importReport.overwrittenCount} Overwritten</span>
                  ) : (
                    <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 inline-block">{importReport.duplicateCount + importReport.errorCount} Skipped</span>
                  )}
                </div>
              </div>

              {importReport.skippedDetails.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-3">
                  <div className="px-4 py-2.5 bg-slate-100/50 border-b border-slate-200 font-bold text-xs text-slate-700">
                    Skipped Records & Reason Logs
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
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
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
    </div>
  );
};
