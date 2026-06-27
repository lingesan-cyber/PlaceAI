import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  useTrainingStudentsQuery, 
  useTrainingAnalysisQuery,
  useAddTrainingMutation,
  useUpdateTrainingMutation,
  useDeleteTrainingMutation,
  useImportTrainingMutation
} from '../../hooks/useTrainingData';
import { useMetadataQuery } from '../../hooks/useMetadata';
import { 
  Search, 
  Award, 
  BookOpen, 
  AlertTriangle, 
  TrendingUp, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  AlertCircle,
  Code,
  MessagesSquare,
  FileBarChart2,
  Plus,
  Trash2,
  Edit2,
  UploadCloud,
  FileText,
  CheckCircle2,
  X
} from 'lucide-react';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import * as XLSX from 'xlsx';
import { TrainingFormatGuideModal } from '../../components/TrainingFormatGuideModal';

interface Student {
  id: string;
  name: string;
  regNo: string;
  dept: string;
  aptitude: number;
  coding: number;
  communication: number;
  mockInterview: number;
  attendance: number;
  avgScore: number;
  readinessLevel: 'Highly Placeable' | 'Placement Ready' | 'Needs Improvement' | 'High Risk';
}

interface ImportedTrainingRow {
  regNo: string;
  name: string;
  dept: string;
  aptitude: number;
  coding: number;
  communication: number;
  mockInterview: number;
  attendance: number;
  validation: {
    regNo: boolean;
    name: boolean;
    dept: boolean;
    aptitude: boolean;
    coding: boolean;
    communication: boolean;
    mockInterview: boolean;
    attendance: boolean;
  };
  hasError: boolean;
  isDuplicate?: boolean;
}

interface TrainingImportSummary {
  inserted?: number;
  updated?: number;
  duplicates?: number;
  invalid?: number;
}

export const TrainingStaffDashboard: React.FC = () => {
  // Queries
  const { data: students = [], isLoading: loadingStudents, refetch: refetchStudents } = useTrainingStudentsQuery();
  const { data: initAnalysis, isLoading: loadingAnalysis, refetch: refetchAnalysis } = useTrainingAnalysisQuery();
  const { data: metadata } = useMetadataQuery();

  // Mutations
  const addMutation = useAddTrainingMutation();
  const updateMutation = useUpdateTrainingMutation();
  const deleteMutation = useDeleteTrainingMutation();
  const importMutation = useImportTrainingMutation();

  // Dashboard Tab Mode
  const [activeTab, setActiveTab] = useState<'analytics' | 'import'>('analytics');

  // Interactive Drill Down State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Modals & Forms State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [studentForm, setStudentForm] = useState({
    name: '',
    regNo: '',
    dept: 'CSE',
    aptitude: 70,
    coding: 70,
    communication: 70,
    mockInterview: 70,
    attendance: 80
  });

  const departments = useMemo(() => {
    return metadata?.departments || [];
  }, [metadata]);

  useEffect(() => {
    if (departments.length > 0 && !departments.includes(studentForm.dept)) {
      setStudentForm(prev => ({ ...prev, dept: departments[0] }));
    }
  }, [departments, studentForm.dept]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [readinessFilter, setReadinessFilter] = useState('All');

  // Table Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Student
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find(s => s.id === selectedStudentId) || null;
  }, [selectedStudentId, students]);

  // Overall Cohort Averages
  const cohortAverages = useMemo(() => {
    if (students.length === 0) return { aptitude: 0, coding: 0, communication: 0, mockInterview: 0, attendance: 0, avgScore: 0 };
    const sums = students.reduce((acc, curr) => {
      acc.aptitude += curr.aptitude ?? 0;
      acc.coding += curr.coding ?? 0;
      acc.communication += curr.communication ?? 0;
      acc.mockInterview += curr.mockInterview ?? 0;
      acc.attendance += curr.attendance ?? 0;
      acc.avgScore += curr.avgScore ?? 0;
      return acc;
    }, { aptitude: 0, coding: 0, communication: 0, mockInterview: 0, attendance: 0, avgScore: 0 });

    const count = students.length;
    return {
      aptitude: Math.round(sums.aptitude / count),
      coding: Math.round(sums.coding / count),
      communication: Math.round(sums.communication / count),
      mockInterview: Math.round(sums.mockInterview / count),
      attendance: Math.round(sums.attendance / count),
      avgScore: Math.round(sums.avgScore / count)
    };
  }, [students]);

  // Color mappings
  const readinessColorMap = {
    'Highly Placeable': { text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500' },
    'Placement Ready': { text: 'text-blue-700', bg: 'bg-blue-50 border-blue-100', dot: 'bg-blue-500' },
    'Needs Improvement': { text: 'text-amber-700', bg: 'bg-amber-50 border-amber-100', dot: 'bg-amber-500' },
    'High Risk': { text: 'text-rose-700', bg: 'bg-rose-50 border-rose-100', dot: 'bg-rose-500' }
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.regNo || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = deptFilter === 'All' || s.dept === deptFilter;
      const matchReadiness = readinessFilter === 'All' || s.readinessLevel === readinessFilter;
      return matchSearch && matchDept && matchReadiness;
    });
  }, [students, searchTerm, deptFilter, readinessFilter]);

  // Paginated students
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter, readinessFilter]);

  // Donut chart category distribution
  const donutData = useMemo(() => {
    const counts = {
      'Highly Placeable': 0,
      'Placement Ready': 0,
      'Needs Improvement': 0,
      'High Risk': 0,
    };
    students.forEach(s => {
      if (s.readinessLevel && counts[s.readinessLevel] !== undefined) {
        counts[s.readinessLevel]++;
      }
    });
    return [
      { name: 'Highly Placeable', value: counts['Highly Placeable'], color: '#10B981' },
      { name: 'Placement Ready', value: counts['Placement Ready'], color: '#3B82F6' },
      { name: 'Needs Improvement', value: counts['Needs Improvement'], color: '#F59E0B' },
      { name: 'High Risk', value: counts['High Risk'], color: '#EF4444' },
    ];
  }, [students]);

  // Weak Area Detection Panel (Scores < 70)
  const weakStudents = useMemo(() => {
    const coding = students.filter(s => (s.coding ?? 0) < 70).map(s => ({ id: s.id, name: s.name, score: s.coding ?? 0 }));
    const aptitude = students.filter(s => (s.aptitude ?? 0) < 70).map(s => ({ id: s.id, name: s.name, score: s.aptitude ?? 0 }));
    const communication = students.filter(s => (s.communication ?? 0) < 70).map(s => ({ id: s.id, name: s.name, score: s.communication ?? 0 }));
    const mock = students.filter(s => (s.mockInterview ?? 0) < 70).map(s => ({ id: s.id, name: s.name, score: s.mockInterview ?? 0 }));

    return { coding, aptitude, communication, mock };
  }, [students]);

  // Dynamic recommendations
  const dynamicRecommendations = useMemo(() => {
    if (!selectedStudent) return [];
    const recs = [];
    
    if ((selectedStudent.coding ?? 0) < 70) {
      recs.push({
        type: 'coding',
        title: 'Targeted Coding Drill Required',
        description: `Score is ${selectedStudent.coding ?? 0}/100. Assign 15 foundational DSA exercises (Arrays, Strings, Recursion) on the practice platform and mandate Saturday mentoring.`,
        priority: 'High'
      });
    }
    if ((selectedStudent.aptitude ?? 0) < 70) {
      recs.push({
        type: 'aptitude',
        title: 'Quantitative & Logical Bootcamps',
        description: `Score is ${selectedStudent.aptitude ?? 0}/100. Require daily speed training tests and assign analytical mocks (Profit & Loss, Ratios, Speed Math).`,
        priority: 'High'
      });
    }
    if ((selectedStudent.communication ?? 0) < 70) {
      recs.push({
        type: 'communication',
        title: 'Soft Skills Training Enrollment',
        description: `Score is ${selectedStudent.communication ?? 0}/100. Mandate the 2-week active speaking Bootcamp and add to the verbal assessment registry.`,
        priority: 'Medium'
      });
    }
    if ((selectedStudent.mockInterview ?? 0) < 70) {
      recs.push({
        type: 'mock',
        title: 'Resume & Simulated Interview Drills',
        description: `Mock rating is ${selectedStudent.mockInterview ?? 0}/100. Schedule a secondary interview slot focusing on core resume project explanations.`,
        priority: 'High'
      });
    }
    if ((selectedStudent.attendance ?? 0) < 75) {
      recs.push({
        type: 'attendance',
        title: 'Critical Attendance Alert',
        description: `Attendance is at ${selectedStudent.attendance ?? 0}%. Send official review request letter and mandate makeup hours for skipped sessions.`,
        priority: 'Critical'
      });
    }
    if (recs.length === 0) {
      recs.push({
        type: 'placement',
        title: 'Elite Student Performance',
        description: `Overall rating is excellent (${selectedStudent.avgScore ?? 0}%). Highlight profile for Tier-1 high-package drives (12+ LPA core companies).`,
        priority: 'Low'
      });
    }
    return recs;
  }, [selectedStudent]);

  // Form submit handler for Create / Update Student
  const handleStudentFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.regNo) {
      alert("Name and register number are required");
      return;
    }

    try {
      const payload = {
        reg_no: studentForm.regNo.trim(),
        name: studentForm.name.trim(),
        department: studentForm.dept,
        aptitude_score: Number(studentForm.aptitude),
        coding_score: Number(studentForm.coding),
        communication_score: Number(studentForm.communication),
        mock_interview_score: Number(studentForm.mockInterview),
        attendance: Number(studentForm.attendance)
      };

      if (editingStudent) {
        await updateMutation.mutateAsync({
          id: editingStudent.id,
          ...payload
        });
      } else {
        await addMutation.mutateAsync(payload);
      }

      // Close and Reset
      setShowAddForm(false);
      setEditingStudent(null);
      setStudentForm({
        name: '',
        regNo: '',
        dept: departments[0] || 'CSE',
        aptitude: 70,
        coding: 70,
        communication: 70,
        mockInterview: 70,
        attendance: 80
      });

      refetchStudents();
      refetchAnalysis();
    } catch (error) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      alert(err.response?.data?.message || "Failed to save record");
    }
  };

  const handleEditClick = (s: Student) => {
    setEditingStudent(s);
    setStudentForm({
      name: s.name,
      regNo: s.regNo,
      dept: s.dept,
      aptitude: s.aptitude,
      coding: s.coding,
      communication: s.communication,
      mockInterview: s.mockInterview,
      attendance: s.attendance
    });
    setShowAddForm(true);
  };

  const handleDeleteConfirmClick = async () => {
    if (!showDeleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(showDeleteConfirm);
      setShowDeleteConfirm(null);
      refetchStudents();
      refetchAnalysis();
    } catch (err) {
      console.error(err);
      alert("Failed to delete record");
    }
  };

  // Radar Keys
  const radarKeys = useMemo(() => {
    if (!initAnalysis?.radarData || initAnalysis.radarData.length === 0) return [];
    return Object.keys(initAnalysis.radarData[0]).filter(key => key !== 'subject');
  }, [initAnalysis]);

  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#F59E0B', '#EC4899', '#06B6D4', '#64748B'];

  const [highlightedDept, setHighlightedDept] = useState<string | null>(null);

  // Circular indicators
  const circleSize = 130;
  const strokeWidth = 10;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const activePercent = selectedStudent ? selectedStudent.avgScore : cohortAverages.avgScore;
  const strokeDashoffset = circumference - (activePercent / 100) * circumference;

  // Importer state
  const [importedRows, setImportedRows] = useState<ImportedTrainingRow[]>([]);
  const [uploadedFilename, setUploadedFilename] = useState<string>('');
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'overwrite'>('skip');
  const [importSummary, setImportSummary] = useState<TrainingImportSummary | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTrainingFormatGuide, setShowTrainingFormatGuide] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileParse = (file: File) => {
    setUploadedFilename(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    const isJson = file.name.endsWith('.json');

    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      try {
        let rawRows: Record<string, unknown>[] = [];
        if (isJson) {
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
          rawRows = JSON.parse(text);
          if (!Array.isArray(rawRows)) rawRows = [rawRows];
        } else {
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
        }

        // Parse & validate row structure
        const parsed = rawRows.map((row: Record<string, unknown>) => {
          const getVal = (possibleKeys: string[]) => {
            const key = Object.keys(row).find(k => 
              possibleKeys.some(pk => k.toLowerCase().replace(/[\s_.-]/g, '') === pk.toLowerCase().replace(/[\s_.-]/g, ''))
            );
            return key ? row[key] : undefined;
          };

          const regNoRaw = getVal(['regno', 'reg_no', 'registerno', 'rollno', 'student_id']);
          const nameRaw = getVal(['name', 'studentname', 'student_name', 'fullname']);
          const deptRaw = getVal(['dept', 'department', 'branch']);
          const aptRaw = getVal(['aptitude', 'aptitude_score', 'aptitudescore', 'apt']);
          const codRaw = getVal(['coding', 'coding_score', 'codingscore', 'code']);
          const commRaw = getVal(['communication', 'communicationscore', 'communication_score', 'comm']);
          const mockRaw = getVal(['mock', 'mockinterview', 'mockinterview_score', 'mock_interview', 'interview']);
          const attRaw = getVal(['attendance', 'attendancescore', 'attend']);

          const regNo = regNoRaw ? String(regNoRaw).trim() : '';
          const name = nameRaw ? String(nameRaw).trim() : '';
          const dept = deptRaw ? String(deptRaw).trim().toUpperCase() : '';
          const aptitude = aptRaw !== undefined ? Number(aptRaw) : NaN;
          const coding = codRaw !== undefined ? Number(codRaw) : NaN;
          const communication = commRaw !== undefined ? Number(commRaw) : NaN;
          const mockInterview = mockRaw !== undefined ? Number(mockRaw) : NaN;
          const attendance = attRaw !== undefined ? Number(attRaw) : NaN;

          const isRegNoInvalid = !regNo;
          const isNameInvalid = !name;
          const isDeptInvalid = !dept;
          const isAptInvalid = isNaN(aptitude) || aptitude < 0 || aptitude > 100;
          const isCodInvalid = isNaN(coding) || coding < 0 || coding > 100;
          const isCommInvalid = isNaN(communication) || communication < 0 || communication > 100;
          const isMockInvalid = isNaN(mockInterview) || mockInterview < 0 || mockInterview > 100;
          const isAttInvalid = isNaN(attendance) || attendance < 0 || attendance > 100;

          const hasError = isRegNoInvalid || isNameInvalid || isDeptInvalid || isAptInvalid || isCodInvalid || isCommInvalid || isMockInvalid || isAttInvalid;

          return {
            regNo,
            name,
            dept,
            aptitude,
            coding,
            communication,
            mockInterview,
            attendance,
            validation: {
              regNo: isRegNoInvalid,
              name: isNameInvalid,
              dept: isDeptInvalid,
              aptitude: isAptInvalid,
              coding: isCodInvalid,
              communication: isCommInvalid,
              mockInterview: isMockInvalid,
              attendance: isAttInvalid
            },
            hasError
          };
        });

        // Detect duplicates locally in the file or in existing students list
        const seenRegNos = new Set<string>();
        const finalRows = parsed.map((item) => {
          if (item.hasError || !item.regNo) {
            return { ...item, isDuplicate: false };
          }
          
          let isDuplicate = false;
          if (seenRegNos.has(item.regNo) || students.some(s => s.regNo === item.regNo)) {
            isDuplicate = true;
          } else {
            seenRegNos.add(item.regNo);
          }

          return { ...item, isDuplicate };
        });

        setImportedRows(finalRows);
      } catch (err) {
        console.error(err);
        alert("Failed to parse file. Make sure columns match or structure is correct.");
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
      handleFileParse(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileParse(file);
    }
  };

  const executeBulkImport = async () => {
    const validRows = importedRows.filter(r => !r.hasError);
    if (validRows.length === 0) {
      alert("No valid training records found to import!");
      return;
    }

    const payload = validRows.map(r => ({
      reg_no: r.regNo,
      name: r.name,
      department: r.dept,
      aptitude_score: r.aptitude,
      coding_score: r.coding,
      communication_score: r.communication,
      mock_interview_score: r.mockInterview,
      attendance: r.attendance
    }));

    try {
      const response = await importMutation.mutateAsync({
        records: payload,
        policy: duplicatePolicy
      });
      setImportSummary(response.data);
      setImportedRows([]);
      setUploadedFilename('');
      refetchStudents();
      refetchAnalysis();
    } catch (err) {
      console.error(err);
      alert("Import failed!");
    }
  };

  if (loadingStudents || loadingAnalysis) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
            <div className="h-4 w-full max-w-2xl bg-slate-200 rounded-md"></div>
          </div>
          <div className="h-10 w-36 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-[280px] bg-slate-200 rounded-2xl"></div>
          <div className="h-[280px] bg-slate-200 rounded-2xl"></div>
          <div className="h-[280px] bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-[400px] bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-indigo-600 animate-pulse" />
            Training Staff Hub
          </h1>
          <p className="text-slate-500 text-sm">
            Completely independent evaluator registry. Tracks sub-score benchmarks, attendance metrics, and custom import spreadsheets.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'analytics' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Dashboard & Analytics
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'import' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Evaluations Importer
          </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <>
          {/* Visual Widgets Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 1. Readiness calculator */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col justify-between hover:shadow-md transition-shadow relative">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Readiness Calculator</h3>
                  {selectedStudent ? (
                    <button 
                      onClick={() => setSelectedStudentId(null)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  ) : (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded uppercase">
                      Cohort Average
                    </span>
                  )}
                </div>

                {selectedStudent && (
                  <div className="mb-4 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/60 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shadow">
                      {(selectedStudent.name || '?').charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{selectedStudent.name || 'Unknown Student'}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">{selectedStudent.regNo} | {selectedStudent.dept}</p>
                    </div>
                  </div>
                )}

                {/* Circular indicator diagram */}
                <div className="flex justify-center my-4 relative">
                  <svg width={circleSize} height={circleSize} className="transform -rotate-90">
                    <circle 
                      cx={circleSize / 2} 
                      cy={circleSize / 2} 
                      r={radius} 
                      fill="transparent" 
                      stroke="#F1F5F9" 
                      strokeWidth={strokeWidth} 
                    />
                    <circle 
                      cx={circleSize / 2} 
                      cy={circleSize / 2} 
                      r={radius} 
                      fill="transparent" 
                      stroke={selectedStudent ? '#4F46E5' : '#4338CA'} 
                      strokeWidth={strokeWidth} 
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">
                      {activePercent}%
                    </span>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
                      Readiness
                    </span>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="space-y-3 mt-4">
                  {/* Aptitude */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-500">Aptitude Score</span>
                      <span className="text-slate-800">
                        {selectedStudent ? selectedStudent.aptitude : cohortAverages.aptitude}/100
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${selectedStudent ? selectedStudent.aptitude : cohortAverages.aptitude}%` }}
                      />
                    </div>
                  </div>

                  {/* Coding */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-500">Coding Score</span>
                      <span className="text-slate-800">
                        {selectedStudent ? selectedStudent.coding : cohortAverages.coding}/100
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${selectedStudent ? selectedStudent.coding : cohortAverages.coding}%` }}
                      />
                    </div>
                  </div>

                  {/* Communication */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-500">Communication Score</span>
                      <span className="text-slate-800">
                        {selectedStudent ? selectedStudent.communication : cohortAverages.communication}/100
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${selectedStudent ? selectedStudent.communication : cohortAverages.communication}%` }}
                      />
                    </div>
                  </div>

                  {/* Mock Interview */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-500">Mock Interview Score</span>
                      <span className="text-slate-800">
                        {selectedStudent ? selectedStudent.mockInterview : cohortAverages.mockInterview}/100
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${selectedStudent ? selectedStudent.mockInterview : cohortAverages.mockInterview}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-semibold leading-relaxed">
                Click any row in the Student Table to view individual readiness ratings and metrics.
              </div>
            </div>

            {/* 2. Category distribution donut chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Category Distribution</h3>
                    <p className="text-slate-400 text-[10px] mt-0.5">Categorized by overall weighted training scores.</p>
                  </div>
                </div>

                <div className="h-[180px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        onClick={(data) => {
                          setReadinessFilter(readinessFilter === data.name ? 'All' : data.name);
                        }}
                        className="cursor-pointer font-bold"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Students`, 'Total']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  {donutData.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setReadinessFilter(readinessFilter === d.name ? 'All' : d.name)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg border text-left text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                        readinessFilter === d.name 
                          ? 'bg-slate-100 border-slate-300 shadow-sm font-black' 
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600 truncate">{d.name === 'Highly Placeable' ? 'Highly Skilled' : d.name}</span>
                      <span className="text-slate-400 ml-auto font-black">{d.value}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 pt-2 text-[9px] text-slate-400 font-semibold text-center border-t border-slate-100">
                💡 Click a legend box or donut slice to filter students.
              </div>
            </div>

            {/* 3. Performance Insights Panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Performance Insights</h3>
                    <p className="text-slate-400 text-[10px] mt-0.5">Automated recommendations engine.</p>
                  </div>
                  <span className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                    <FileBarChart2 className="h-4 w-4" />
                  </span>
                </div>

                {selectedStudent ? (
                  <div className="space-y-3 overflow-y-auto max-h-[250px] pr-1">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <span className={`h-2 w-2 rounded-full ${readinessColorMap[selectedStudent.readinessLevel]?.dot}`} />
                      <span className="text-xs font-black text-slate-700">{selectedStudent.name}</span>
                      <span className={`ml-auto text-[8px] font-black uppercase px-2 py-0.5 rounded border ${readinessColorMap[selectedStudent.readinessLevel]?.bg} ${readinessColorMap[selectedStudent.readinessLevel]?.text}`}>
                        {selectedStudent.readinessLevel}
                      </span>
                    </div>
                    
                    {dynamicRecommendations.map((rec, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1 hover:border-slate-300 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            {rec.type === 'attendance' ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            ) : rec.type === 'placement' ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            )}
                            <span className="truncate">{rec.title}</span>
                          </h4>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            rec.priority === 'Critical' 
                              ? 'bg-rose-100 text-rose-800' 
                              : rec.priority === 'High' 
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 my-2">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
                        Averages & Indicators
                      </h4>
                      <ul className="text-[10px] text-slate-500 space-y-2 list-disc pl-4 font-semibold">
                        <li>Overall cohort weighted readiness score averages at **{cohortAverages.avgScore}%**.</li>
                        <li>Soft skill profiles highlight robust mock rankings, while coding averages require reinforcement.</li>
                        <li>Identify risk items below to initiate Saturday coaching registers.</li>
                      </ul>
                    </div>
                    <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 p-4 rounded-xl text-center">
                      <User className="h-7 w-7 text-slate-300 mb-1" />
                      <p className="text-[10px] font-bold text-slate-500">No Student Active</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">Select a row in the table below to load individualized recommendations.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-[9px] text-slate-400 border-t border-slate-100 pt-2 font-bold flex items-center justify-between">
                <span>Active evaluators: Live Database</span>
                <span>Active rows: {students.length}</span>
              </div>
            </div>

          </div>

          {/* Student Table CRUD */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Placement-Readiness Evaluator Matrix</h3>
                <p className="text-slate-400 text-xs mt-0.5">Add, edit, or search manual evaluator grades stored permanently in Mongoose.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by Name or Reg..."
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                {/* Dept filter */}
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="All">All Branches</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                {/* Category filter */}
                <select
                  value={readinessFilter}
                  onChange={e => setReadinessFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="All">All Categories</option>
                  <option value="Highly Placeable">Highly Skilled</option>
                  <option value="Placement Ready">Placement Ready</option>
                  <option value="Needs Improvement">Needs Improvement</option>
                  <option value="High Risk">High Risk</option>
                </select>

                {/* Add new student training button */}
                <button
                  onClick={() => {
                    setEditingStudent(null);
                    setStudentForm({
                      name: '',
                      regNo: '',
                      dept: departments[0] || 'CSE',
                      aptitude: 75,
                      coding: 75,
                      communication: 75,
                      mockInterview: 75,
                      attendance: 80
                    });
                    setShowAddForm(true);
                  }}
                  className="px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1 shadow-sm shadow-indigo-900/10 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Student Record
                </button>
              </div>
            </div>

            <div className="overflow-x-auto animate-table-fade">
              <table className="w-full text-left border-collapse text-xs table-row-hover">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-100 font-black">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Register No</th>
                    <th className="px-6 py-4 text-center">Aptitude</th>
                    <th className="px-6 py-4 text-center">Coding</th>
                    <th className="px-6 py-4 text-center">Communication</th>
                    <th className="px-6 py-4 text-center">Mock Interview</th>
                    <th className="px-6 py-4 text-center">Attendance</th>
                    <th className="px-6 py-4 text-center">Readiness Level</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredStudents.length > 0 ? (
                    paginatedStudents.map((student) => (
                      <tr 
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.id === selectedStudentId ? null : student.id)}
                        className={`cursor-pointer transition-colors duration-200 ${
                          selectedStudentId === student.id 
                            ? 'bg-indigo-50/50 hover:bg-indigo-50' 
                            : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-7 w-7 rounded-full text-white font-bold flex items-center justify-center text-[10px] ${
                              student.readinessLevel === 'Highly Placeable' ? 'bg-emerald-500' :
                              student.readinessLevel === 'Placement Ready' ? 'bg-blue-500' :
                              student.readinessLevel === 'Needs Improvement' ? 'bg-amber-500' : 'bg-rose-500'
                            }`}>
                                {(student.name || '?').charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-xs">{student.name}</p>
                                <span className="text-[9px] text-slate-400 font-semibold uppercase">{student.dept} Branch</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 font-semibold">{student.regNo}</td>
                        <td className="px-6 py-3.5 text-center font-bold">
                          <span className={student.aptitude < 70 ? 'text-rose-600' : 'text-slate-800'}>{student.aptitude}%</span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold">
                          <span className={student.coding < 70 ? 'text-rose-600' : 'text-slate-800'}>{student.coding}%</span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold">
                          <span className={student.communication < 70 ? 'text-rose-600' : 'text-slate-800'}>{student.communication}%</span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold">
                          <span className={student.mockInterview < 70 ? 'text-rose-600' : 'text-slate-800'}>{student.mockInterview}%</span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            student.attendance < 75 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}>{student.attendance}%</span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${readinessColorMap[student.readinessLevel]?.bg} ${readinessColorMap[student.readinessLevel]?.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${readinessColorMap[student.readinessLevel]?.dot}`} />
                            <span>{student.readinessLevel}</span>
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditClick(student)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
                              title="Edit training details"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(student.id)}
                              className="p-1 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-all cursor-pointer"
                              title="Delete training record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-bold">
                        No student training records match criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-400 font-semibold text-[10px]">
                  Showing {Math.min(filteredStudents.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredStudents.length, currentPage * itemsPerPage)} of {filteredStudents.length} entries
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`h-7 w-7 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        currentPage === i + 1
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-900/10'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Weak area alerts list widgets */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="border-b border-slate-100 pb-3 mb-5">
              <h3 className="font-extrabold text-slate-800 text-base">Critical Area Tracking</h3>
              <p className="text-slate-400 text-xs mt-0.5">List of students scoring strictly below 70% inside individual mock evaluators.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Coding DSA */}
              <div className="bg-rose-50/25 border border-rose-100/60 p-4 rounded-xl flex flex-col justify-between h-[210px]">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-rose-100/30 pb-2">
                    <span className="text-xs font-black text-rose-800 flex items-center gap-1">
                      <Code className="h-3.5 w-3.5 text-rose-500" />
                      Coding DSA
                    </span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full">
                      {weakStudents.coding.length} Alerts
                    </span>
                  </div>
                  <div className="space-y-1.5 overflow-y-auto h-[120px] pr-1">
                    {weakStudents.coding.length > 0 ? (
                      weakStudents.coding.map((ws) => (
                        <div 
                          key={ws.id}
                          onClick={() => setSelectedStudentId(ws.id === selectedStudentId ? null : ws.id)}
                          className={`flex items-center justify-between text-[11px] font-bold p-1.5 rounded transition-all cursor-pointer ${
                            selectedStudentId === ws.id ? 'bg-rose-100/60 border border-rose-200 font-extrabold' : 'hover:bg-rose-50'
                          }`}
                        >
                          <span className="text-slate-700 truncate">{ws.name}</span>
                          <span className="text-rose-600 shrink-0 font-extrabold">{ws.score}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 italic text-center pt-8">No alerts active</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Aptitude Math */}
              <div className="bg-amber-50/25 border border-amber-100/60 p-4 rounded-xl flex flex-col justify-between h-[210px]">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-amber-100/30 pb-2">
                    <span className="text-xs font-black text-amber-800 flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                      Aptitude Math
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full">
                      {weakStudents.aptitude.length} Alerts
                    </span>
                  </div>
                  <div className="space-y-1.5 overflow-y-auto h-[120px] pr-1">
                    {weakStudents.aptitude.length > 0 ? (
                      weakStudents.aptitude.map((ws) => (
                        <div 
                          key={ws.id}
                          onClick={() => setSelectedStudentId(ws.id === selectedStudentId ? null : ws.id)}
                          className={`flex items-center justify-between text-[11px] font-bold p-1.5 rounded transition-all cursor-pointer ${
                            selectedStudentId === ws.id ? 'bg-amber-100/60 border border-amber-200 font-extrabold' : 'hover:bg-amber-50'
                          }`}
                        >
                          <span className="text-slate-700 truncate">{ws.name}</span>
                          <span className="text-amber-600 shrink-0 font-extrabold">{ws.score}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 italic text-center pt-8">No alerts active</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Communication */}
              <div className="bg-orange-50/25 border border-orange-100/60 p-4 rounded-xl flex flex-col justify-between h-[210px]">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-orange-100/30 pb-2">
                    <span className="text-xs font-black text-orange-800 flex items-center gap-1">
                      <MessagesSquare className="h-3.5 w-3.5 text-orange-500" />
                      Communication
                    </span>
                    <span className="text-[10px] bg-orange-100 text-orange-800 font-extrabold px-2 py-0.5 rounded-full">
                      {weakStudents.communication.length} Alerts
                    </span>
                  </div>
                  <div className="space-y-1.5 overflow-y-auto h-[120px] pr-1">
                    {weakStudents.communication.length > 0 ? (
                      weakStudents.communication.map((ws) => (
                        <div 
                          key={ws.id}
                          onClick={() => setSelectedStudentId(ws.id === selectedStudentId ? null : ws.id)}
                          className={`flex items-center justify-between text-[11px] font-bold p-1.5 rounded transition-all cursor-pointer ${
                            selectedStudentId === ws.id ? 'bg-orange-100/60 border border-orange-200 font-extrabold' : 'hover:bg-orange-50'
                          }`}
                        >
                          <span className="text-slate-700 truncate">{ws.name}</span>
                          <span className="text-orange-600 shrink-0 font-extrabold">{ws.score}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 italic text-center pt-8">No alerts active</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Mock Interview */}
              <div className="bg-violet-50/25 border border-violet-100/60 p-4 rounded-xl flex flex-col justify-between h-[210px]">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-violet-100/30 pb-2">
                    <span className="text-xs font-black text-violet-800 flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-violet-500" />
                      Mock Interview
                    </span>
                    <span className="text-[10px] bg-violet-100 text-violet-800 font-extrabold px-2 py-0.5 rounded-full">
                      {weakStudents.mock.length} Alerts
                    </span>
                  </div>
                  <div className="space-y-1.5 overflow-y-auto h-[120px] pr-1">
                    {weakStudents.mock.length > 0 ? (
                      weakStudents.mock.map((ws) => (
                        <div 
                          key={ws.id}
                          onClick={() => setSelectedStudentId(ws.id === selectedStudentId ? null : ws.id)}
                          className={`flex items-center justify-between text-[11px] font-bold p-1.5 rounded transition-all cursor-pointer ${
                            selectedStudentId === ws.id ? 'bg-violet-100/60 border border-violet-200 font-extrabold' : 'hover:bg-violet-50'
                          }`}
                        >
                          <span className="text-slate-700 truncate">{ws.name}</span>
                          <span className="text-violet-600 shrink-0 font-extrabold">{ws.score}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 italic text-center pt-8">No alerts active</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Department Radar Chart */}
          {initAnalysis && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="border-b border-slate-100 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Comparative Department Training Radar</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Calculates live sub-averages dynamically across departments from Mongoose.</p>
                </div>
                
                {/* Branch highlight switcher */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase mr-1">Highlight:</span>
                  {departments.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setHighlightedDept(highlightedDept === dept ? null : dept)}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        highlightedDept === dept 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-900/10'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Radar component container */}
                <div className="h-[360px] w-full lg:col-span-8">
                  {radarKeys.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={initAnalysis.radarData}>
                        <PolarGrid stroke="#E2E8F0" />
                        <PolarAngleAxis dataKey="subject" stroke="#64748B" fontSize={11} fontWeight="bold" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94A3B8" fontSize={9} />
                        
                        {radarKeys.map((key, index) => (
                          <Radar
                            key={key}
                            name={key}
                            dataKey={key}
                            stroke={colors[index % colors.length]}
                            fill={colors[index % colors.length]}
                            fillOpacity={highlightedDept === null || highlightedDept === key ? 0.05 : 0}
                            strokeWidth={highlightedDept === key ? 3.5 : highlightedDept === null ? 2 : 0.8}
                          />
                        ))}
                        
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">
                      No department data available. Please add training records or seed the DB.
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-indigo-500" />
                      Dynamic Radar Analysis
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      This radar chart calculates live department averages natively. Switch department highlights at the top right to analyze specific branch strengths!
                    </p>
                    <div className="pt-2 border-t border-slate-200">
                      <h5 className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Branches registered:</h5>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {radarKeys.map((k, i) => (
                          <span 
                            key={k} 
                            onClick={() => setHighlightedDept(highlightedDept === k ? null : k)}
                            className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md border bg-white text-slate-600 cursor-pointer hover:border-slate-300"
                            style={{ borderLeft: `3px solid ${colors[i % colors.length]}` }}
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Importer Tab Panel */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="border-b border-slate-100 pb-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Independent Excel & JSON Importer</h3>
                <p className="text-slate-400 text-xs mt-0.5">Upload a clean training evaluation roster. All modifications write directly to Mongoose.</p>
              </div>

              {/* Conflict policy buttons */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase px-2">Conflict Policy:</span>
                <button
                  onClick={() => setDuplicatePolicy('skip')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    duplicatePolicy === 'skip' 
                      ? 'bg-indigo-600 text-white shadow' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Skip Duplicates
                </button>
                <button
                  onClick={() => setDuplicatePolicy('overwrite')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    duplicatePolicy === 'overwrite' 
                      ? 'bg-indigo-600 text-white shadow' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Update Existing
                </button>
              </div>
            </div>

            {/* Importer drag zone */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center transition-all ${
                isDragging 
                  ? 'border-indigo-600 bg-indigo-50/30' 
                  : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400'
              }`}
            >
              <UploadCloud className="h-12 w-12 text-slate-400 mb-3 animate-bounce" />
              <h4 className="text-sm font-extrabold text-slate-800">Drag and Drop Spreadsheet Here</h4>
              <p className="text-xs text-slate-400 mt-1 mb-4 font-semibold">Supports JSON, CSV, or Microsoft Excel (.xlsx)</p>
              
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button 
                  onClick={handleBrowseClick}
                  className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-sm cursor-pointer"
                >
                  Browse Local Files
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowTrainingFormatGuide(true); }}
                  className="flex items-center gap-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <span>📘</span>
                  <span>Training Format Guide</span>
                </button>
              </div>

              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv,.json"
                className="hidden"
              />

              {uploadedFilename && (
                <div className="mt-4 flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 text-indigo-700 text-xs font-bold">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <span>Parsed: {uploadedFilename}</span>
                  <button 
                    onClick={() => {
                      setUploadedFilename('');
                      setImportedRows([]);
                    }}
                    className="p-0.5 hover:bg-indigo-100 rounded-full cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 text-indigo-600" />
                  </button>
                </div>
              )}
            </div>

            {/* Import summary notification */}
            {importSummary && (
              <div className="mt-6 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-emerald-800 text-sm">Spreadsheet Import Ingested!</h4>
                  <p className="text-xs text-emerald-600 font-semibold mt-0.5">Bulk import logs successfully completed with policies applied.</p>
                  <div className="flex flex-wrap gap-4 mt-3">
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-black px-2.5 py-1 rounded-lg">
                      Inserted: {importSummary.inserted}
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-200 font-black px-2.5 py-1 rounded-lg">
                      Updated: {importSummary.updated}
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 font-black px-2.5 py-1 rounded-lg">
                      Bypassed Duplicates: {importSummary.duplicates}
                    </span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 font-black px-2.5 py-1 rounded-lg">
                      Errors Skipped: {importSummary.invalid}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Import Preview Grid */}
            {importedRows.length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm"> Roster Ingestion Previews ({importedRows.length} rows)</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Verify rows below before confirming database write.</p>
                  </div>

                  <button
                    onClick={executeBulkImport}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow shadow-indigo-900/10 cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Confirm Training Import
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl animate-table-fade">
                  <table className="w-full text-left border-collapse text-xs table-row-hover">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-100 font-black">
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Register No</th>
                        <th className="px-4 py-3 text-center">Aptitude</th>
                        <th className="px-4 py-3 text-center">Coding</th>
                        <th className="px-4 py-3 text-center">Communication</th>
                        <th className="px-4 py-3 text-center">Mock Interview</th>
                        <th className="px-4 py-3 text-center">Attendance</th>
                        <th className="px-4 py-3 text-center">Verification Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {importedRows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-slate-400" />
                              <span className="font-bold text-slate-800">{r.name || 'N/A'}</span>
                              <span className="text-[9px] text-slate-400 font-black uppercase">({r.dept || 'N/A'})</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 font-bold">{r.regNo || 'N/A'}</td>
                          <td className="px-4 py-2.5 text-center font-bold">{isNaN(r.aptitude) ? 'N/A' : `${r.aptitude}%`}</td>
                          <td className="px-4 py-2.5 text-center font-bold">{isNaN(r.coding) ? 'N/A' : `${r.coding}%`}</td>
                          <td className="px-4 py-2.5 text-center font-bold">{isNaN(r.communication) ? 'N/A' : `${r.communication}%`}</td>
                          <td className="px-4 py-2.5 text-center font-bold">{isNaN(r.mockInterview) ? 'N/A' : `${r.mockInterview}%`}</td>
                          <td className="px-4 py-2.5 text-center font-bold">{isNaN(r.attendance) ? 'N/A' : `${r.attendance}%`}</td>
                          <td className="px-4 py-2.5 text-center">
                            {r.hasError ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                                Formatting Error
                              </span>
                            ) : r.isDuplicate ? (
                              <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                duplicatePolicy === 'overwrite'
                                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>
                                Duplicate ({duplicatePolicy === 'overwrite' ? 'Overwrite' : 'Skip'})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                                Fresh Record
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* dialog / forms modal for CRUD */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-overlay-fade">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-modal-scale">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                {editingStudent ? 'Edit Evaluator Record' : 'Add Roster Evaluation'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingStudent(null);
                }} 
                className="p-1 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleStudentFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Student Name</label>
                  <input 
                    type="text"
                    value={studentForm.name}
                    onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                    required
                    placeholder="E.g., Harsh Raj"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Register Number</label>
                  <input 
                    type="text"
                    value={studentForm.regNo}
                    onChange={e => setStudentForm({ ...studentForm, regNo: e.target.value })}
                    required
                    disabled={!!editingStudent}
                    placeholder="E.g., 1920100001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-400 font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Department</label>
                  <select
                    value={studentForm.dept}
                    onChange={e => setStudentForm({ ...studentForm, dept: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 bg-white"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Attendance Percentage (0-100)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={studentForm.attendance}
                    onChange={e => setStudentForm({ ...studentForm, attendance: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Evaluation Grades (0-100)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Aptitude Score</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={studentForm.aptitude}
                      onChange={e => setStudentForm({ ...studentForm, aptitude: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Coding Score</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={studentForm.coding}
                      onChange={e => setStudentForm({ ...studentForm, coding: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Communication Score</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={studentForm.communication}
                      onChange={e => setStudentForm({ ...studentForm, communication: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Mock Interview Rating</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={studentForm.mockInterview}
                      onChange={e => setStudentForm({ ...studentForm, mockInterview: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-overlay-fade">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center animate-modal-scale">
            <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-3 animate-bounce" />
            <h3 className="font-extrabold text-slate-800 text-lg">Remove Evaluator Record?</h3>
            <p className="text-xs text-slate-400 mt-1 mb-6 font-semibold">
              This action is permanent and will delete the student's training grades from MongoDB.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                No, Keep It
              </button>
              <button
                onClick={handleDeleteConfirmClick}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Training Format Guide Modal */}
      {showTrainingFormatGuide && <TrainingFormatGuideModal onClose={() => setShowTrainingFormatGuide(false)} />}

    </div>
  );
};
