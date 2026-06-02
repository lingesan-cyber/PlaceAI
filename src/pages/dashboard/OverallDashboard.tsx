import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDashboardData } from '../../hooks/useDashboardData';
import type { Company } from '../../types';
import { useYearsQuery, getYearColor } from '../../hooks/useMetadata';
import { useYearsStore } from '../../store/useYearsStore';
import {
  Users,
  UserCheck,
  UserMinus,
  Building,
  Percent,
  TrendingUp,
  Award,
  Download,
  Search,
  Filter
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  FunnelChart,
  Funnel,
  LabelList,
  Cell
} from 'recharts';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { apiClient } from '../../lib/apiClient';

export const OverallDashboard: React.FC = () => {
  const { selectedYear, setSelectedYear, compareYears, isCompareMode } = useAuthStore();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // In compare mode, fetch data for 'All' years (which includes all year series);
  // filtering to compareYears happens below in derived memos.
  const effectiveYear = isCompareMode ? 'all' : selectedYear;
  const { data, isLoading, error } = useDashboardData(effectiveYear);

  // Seed store from API (runs once); then read from store for instant updates.
  useYearsQuery();
  const years = useYearsStore((s) => s.years);
  const yearsLoading = years.length === 0;

  // ── Compare mode helpers ────────────────────────────────────────────────────

  // rateKeys: e.g. ['rate2024','rate2026'] filtered to compareYears in compare mode.
  const rateKeys = useMemo(() => {
    if (!data?.comparison || data.comparison.length === 0) return [];
    const allKeys = Object.keys(data.comparison[0])
      .filter((key) => key.startsWith('rate'))
      .sort();
    if (!isCompareMode || compareYears.length < 2) return allKeys;
    // Only show bars for selected compare years
    return allKeys.filter((k) => compareYears.some((y) => k === `rate${y}`));
  }, [data?.comparison, isCompareMode, compareYears]);

  // deptKeys: one Line per department.
  const deptKeys = useMemo(() => {
    if (!data?.growth || data.growth.length === 0) return [];
    return Object.keys(data.growth[0]).filter((key) => key !== 'year').sort();
  }, [data?.growth]);

  // In compare mode: filter growth rows to only the selected years.
  const growthData = useMemo(() => {
    if (!data?.growth) return [];
    if (!isCompareMode || compareYears.length < 2) return data.growth;
    return data.growth.filter((row: any) => compareYears.includes(row.year));
  }, [data?.growth, isCompareMode, compareYears]);

  // Table filtering and search states
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Convert raw status to styled badge
  const columns = useMemo<ColumnDef<Company>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Company Name',
      cell: (info) => <span className="font-bold text-slate-800">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => {
        const status = info.getValue() as string;
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${status === 'Completed'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : status === 'Ongoing'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'driveDate',
      header: 'Drive Date',
      cell: (info) => <span className="text-slate-500 font-medium">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'selections',
      header: 'Selections',
      cell: (info) => <span className="font-black text-slate-900">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'packageOffer',
      header: 'Package Offer',
      cell: (info) => <span className="font-semibold text-slate-700">{info.getValue() as string}</span>,
    },
  ], []);

  // Filter companies based on active status selection before loading into TanStack Table
  const filteredCompanies = useMemo(() => {
    if (!data?.companies) return [];
    if (statusFilter === 'All') return data.companies;
    return data.companies.filter((c: Company) => c.status === statusFilter);
  }, [data?.companies, statusFilter]);

  const table = useReactTable({
    data: filteredCompanies,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5
      }
    }
  });

  // Export complete academic and recruitment logs to a professional XLSX report
  const handleExportToExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const yearStr = selectedYear;
      const numericYear = (yearStr && yearStr.toLowerCase() !== 'all') ? Number(yearStr) : null;

      // 1. Fetch all datasets from the backend in parallel for comprehensive reporting
      const [studentsRes, placementsRes, companiesRes, hrRes, trainingRes] = await Promise.all([
        apiClient.get('/students?limit=10000'),
        apiClient.get('/placements?limit=10000'),
        apiClient.get('/companies'),
        apiClient.get('/hr-contacts?year=all'),
        apiClient.get('/training-details')
      ]);

      const rawStudents = studentsRes.data?.data?.students || [];
      const rawPlacements = placementsRes.data?.data?.placements || [];
      const rawCompanies = companiesRes.data?.data || [];
      const rawHrContacts = hrRes.data?.data || [];
      const rawTrainingDetails = trainingRes.data?.data || [];

      // 2. Filter datasets by selected batch year (or all years if 'All')
      const filteredStudents = numericYear
        ? rawStudents.filter((s: any) => s.batch_year === numericYear)
        : rawStudents;

      const filteredPlacements = numericYear
        ? rawPlacements.filter((p: any) => (p.batch_year === numericYear || p.year === numericYear))
        : rawPlacements;

      const filteredCompanies = numericYear
        ? rawCompanies.filter((c: any) => c.drive_date && new Date(c.drive_date).getFullYear() === numericYear)
        : rawCompanies;

      const filteredHrContacts = numericYear
        ? rawHrContacts.filter((h: any) => h.batch_year === numericYear)
        : rawHrContacts;

      // Map training records strictly against the current active batch's register numbers
      const studentRegs = new Set(filteredStudents.map((s: any) => s.reg_no));
      const filteredTraining = rawTrainingDetails.filter((t: any) => studentRegs.has(t.reg_no));

      // Calculate statistics for Sheet 1
      const totalStudentsCount = filteredStudents.length;
      const placedCount = filteredStudents.filter((s: any) => s.placement_status === 'Placed').length;
      const unplacedCount = totalStudentsCount - placedCount;
      const rateStr = totalStudentsCount > 0 ? ((placedCount / totalStudentsCount) * 100).toFixed(2) + '%' : '0.00%';

      const packages = filteredPlacements.map((p: any) => Number(p.package) || 0).filter(p => p > 0);
      const avgPackageStr = packages.length > 0 ? (packages.reduce((sum, p) => sum + p, 0) / packages.length).toFixed(2) + ' LPA' : '0.00 LPA';
      const highestPackageStr = packages.length > 0 ? Math.max(...packages).toFixed(2) + ' LPA' : '0.00 LPA';

      const wb = XLSX.utils.book_new();

      const autoWidths = (dataRows: any[]) => {
        if (dataRows.length === 0) return [{ wch: 25 }];
        const keys = Object.keys(dataRows[0]);
        return keys.map(key => {
          let maxLen = key.length;
          dataRows.forEach(row => {
            const val = row[key];
            if (val !== undefined && val !== null) {
              maxLen = Math.max(maxLen, String(val).length);
            }
          });
          return { wch: maxLen + 4 }; // Add padding for header readability
        });
      };

      const createSheetWithRecords = (sheetName: string, dataArray: any[], mapper: (item: any) => any) => {
        let ws;
        if (dataArray.length === 0) {
          const emptyRows = [{ "Status": "No Records Available" }];
          ws = XLSX.utils.json_to_sheet(emptyRows);
          ws['!cols'] = [{ wch: 25 }];
        } else {
          const rows = dataArray.map(mapper);
          ws = XLSX.utils.json_to_sheet(rows);
          ws['!cols'] = autoWidths(rows);
          ws['!views'] = [{
            state: 'frozen',
            xSplit: 0,
            ySplit: 1,
            topLeftCell: 'A2',
            activePane: 'bottomLeft'
          }];
        }
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      };

      // Sheet 1: Summary Statistics (always populated)
      const summaryRows = [{
        "Batch Year": (yearStr && yearStr.toLowerCase() !== 'all') ? `${yearStr} Batch` : 'All Years',
        "Total Students": totalStudentsCount,
        "Placed Students": placedCount,
        "Unplaced Students": unplacedCount,
        "Placement Rate": rateStr,
        "Average Package": avgPackageStr,
        "Highest Package": highestPackageStr,
        "Companies Visited": filteredCompanies.length
      }];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      wsSummary['!cols'] = autoWidths(summaryRows);
      wsSummary['!views'] = [{
        state: 'frozen',
        xSplit: 0,
        ySplit: 1,
        topLeftCell: 'A2',
        activePane: 'bottomLeft'
      }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // Sheet 2: Students
      createSheetWithRecords("Students", filteredStudents, (s: any) => ({
        "Reg No": s.reg_no,
        "Name": s.name,
        "Department": s.department,
        "CGPA": s.cgpa,
        "Arrears": s.arrears,
        "Skills": s.skills?.join(', ') || '',
        "Placement Status": s.placement_status
      }));

      // Sheet 3: Placements
      createSheetWithRecords("Placements", filteredPlacements, (p: any) => ({
        "Reg No": p.reg_no,
        "Student Name": p.name,
        "Company": p.company,
        "Role": p.role || 'Associate Software Engineer',
        "Package": `${p.package} LPA`,
        "Placement Status": p.placement_status || 'Placed'
      }));

      // Sheet 4: Companies
      createSheetWithRecords("Companies", filteredCompanies, (c: any) => ({
        "Company Name": c.company_name,
        "Role Offered": c.role || 'N/A',
        "Package": `${c.package} LPA`,
        "Drive Date": c.drive_date ? new Date(c.drive_date).toISOString().split('T')[0] : 'N/A',
        "Status": c.status
      }));

      // Sheet 5: HR Contacts
      createSheetWithRecords("HR Contacts", filteredHrContacts, (h: any) => ({
        "HR Name": h.hr_name,
        "Company": h.company_name,
        "Email": h.email,
        "Phone": h.phone || 'N/A',
        "Notes": h.notes || ''
      }));

      // Sheet 6: Training Records
      createSheetWithRecords("Training Records", filteredTraining, (t: any) => {
        const readiness = (t.aptitude_score * 0.25) + (t.coding_score * 0.35) + (t.communication_score * 0.20) + (t.mock_interview_score * 0.20);
        return {
          "Reg No": t.reg_no,
          "Name": t.name,
          "Aptitude Score": t.aptitude_score,
          "Coding Score": t.coding_score,
          "Communication Score": t.communication_score,
          "Mock Interview Score": t.mock_interview_score,
          "Attendance": t.attendance,
          "Readiness Score": `${readiness.toFixed(1)}%`
        };
      });

      // Save workbook with exact name structure
      XLSX.writeFile(wb, `Placement_Report_${yearStr}.xlsx`);

      // Trigger custom toast notification
      setToastMessage(`✓ Placement_Report_${yearStr}.xlsx downloaded successfully!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch (err: any) {
      console.error("Failed to generate excel export:", err);
      setToastMessage("✕ Failed to export placement report. Please check connections.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  // Funnel color palette
  const funnelColors = ['#1E40AF', '#3B82F6', '#7C3AED', '#A78BFA', '#10B981'];

  // Loading skeleton block
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/4 bg-slate-200 rounded-lg"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl border border-slate-100"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-[380px] bg-slate-200 rounded-2xl lg:col-span-2"></div>
          <div className="h-[380px] bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Error boundary card
  if (error || !data) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl max-w-xl mx-auto mt-20">
        <h2 className="text-rose-800 font-extrabold text-lg">Error Loading Dashboard</h2>
        <p className="text-rose-600 text-sm mt-2">Could not retrieve statistics. Please try reloading or check backend connection.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Control Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Institutional Placement Portal</h1>
          <p className="text-slate-500 text-sm">Aggregated statistics, departmental benchmarks, and funnel analyses.</p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Year Filter Select Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Year:</span>
            {yearsLoading ? (
              <div className="h-8 w-28 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
              >
                {/* Dynamic — no hardcoded years. 2027 appears when backend adds it. */}
                {years.map((y) => (
                  <option key={y} value={y}>{y} Batch</option>
                ))}
                <option value="all">All Years</option>
              </select>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* A) Top Stats Row — 7 metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Card 1: Total Students */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Students</span>
            <Users className="h-5 w-5 opacity-80" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mt-3">{data.stats.totalStudents}</h3>
          <span className="text-[9px] text-slate-400 mt-1 block">Registered candidates</span>
        </div>

        {/* Card 2: Placed Students */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Placed Candidates</span>
            <UserCheck className="h-5 w-5 opacity-80" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mt-3">{data.stats.placedStudents}</h3>
          <span className="text-[9px] text-emerald-600 font-bold mt-1 block">Offers accepted</span>
        </div>

        {/* Card 3: Pending Students */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Students</span>
            <UserMinus className="h-5 w-5 opacity-80" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mt-3">{data.stats.pendingStudents}</h3>
          <span className="text-[9px] text-slate-400 mt-1 block">Actively in interview stages</span>
        </div>

        {/* Card 4: Companies Visited */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Companies Visited</span>
            <Building className="h-5 w-5 opacity-80" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mt-3">{data.stats.companiesVisited}</h3>
          <span className="text-[9px] text-slate-400 mt-1 block">Visits & drives logged</span>
        </div>

        {/* Card 5: Placement Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-violet-600">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Placement Rate</span>
            <Percent className="h-5 w-5 opacity-80" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mt-3">{data.stats.placementRate}%</h3>
          <span className="text-[9px] text-violet-600 font-semibold mt-1 block">Success index</span>
        </div>

        {/* Card 6: Average Package */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Package</span>
            <TrendingUp className="h-5 w-5 opacity-80" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mt-3">{data.stats.avgPackage}</h3>
          <span className="text-[9px] text-slate-400 mt-1 block">Annual wage baseline</span>
        </div>

        {/* Card 7: Highest Package */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-rose-500">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Highest Package</span>
            <Award className="h-5 w-5 opacity-80" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mt-3">{data.stats.highestPackage}</h3>
          <span className="text-[9px] text-indigo-600 font-bold mt-1 block">Top offer logged</span>
        </div>
      </div>

      {/* Main Charts & Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* C) Multi-Year Comparison Chart — Grouped Bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-slate-800">Multi-Year Department Placement Comparison</h3>
            <p className="text-slate-400 text-xs">Comparisons of placement rate success percentages across CSE, ECE, IT, ME, and CE.</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.comparison} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {/* Each rateKey gets a unique color via getYearColor — extending to 2027+ is automatic */}
                {rateKeys.map((key, idx) => {
                  const year = key.replace('rate', '');
                  return (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={getYearColor(idx)}
                      name={`${year} (%)`}
                      radius={[4, 4, 0, 0]}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* E) Placement Funnel — Vertical Funnel Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Placement Pipeline Funnel</h3>
            <p className="text-slate-400 text-xs">Student filtering conversion across selection steps.</p>
          </div>
          <div className="h-[280px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip formatter={(value) => `${value} Students`} />
                <Funnel
                  dataKey="value"
                  data={data.funnel}
                  isAnimationActive
                >
                  <LabelList position="right" fill="#475569" stroke="none" dataKey="name" fontSize={10} />
                  {data.funnel.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={funnelColors[index % funnelColors.length]} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* D) Department Growth Trend — Line Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-3">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-slate-800">Year-on-Year Departmental Growth</h3>
            <p className="text-slate-400 text-xs">Line progress showcasing graduation placement growth trend metrics.</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 5, right: 20, left: -25, bottom: 5 }}>
                <defs>
                  {deptKeys.map((key, idx) => (
                    <linearGradient key={`grad-${key}`} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={getYearColor(idx)} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={getYearColor(idx)} stopOpacity={0.0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis domain={[50, 100]} stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {deptKeys.map((key, idx) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={getYearColor(idx)}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill={`url(#color-${key})`}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name={key}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* F) Company Monitoring Table — TanStack Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Recruiter Partnerships Tracker</h3>
            <p className="text-slate-400 text-xs">Monitor recruiter visits, drive timings, and selection workloads.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search filter input */}
            <div className="relative w-full sm:w-60">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search recruiter name..."
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Status Dropdown Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-400 text-xs flex items-center gap-1 flex-shrink-0">
                <Filter className="h-3.5 w-3.5" />
                <span>Status:</span>
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-auto"
              >
                <option value="All">All Statuses</option>
                <option value="Visiting">Visiting</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider">
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-3.5 font-bold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-400 italic">
                    No matching companies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        {table.getRowModel().rows.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/10">
            <span className="text-slate-400 text-xs font-medium">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-800 flex items-center gap-3 z-[200]">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-xs font-semibold">{toastMessage}</p>
          <button 
            onClick={() => setShowToast(false)} 
            className="text-slate-400 hover:text-white ml-2 transition-colors cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
