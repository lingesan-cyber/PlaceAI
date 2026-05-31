import React, { useState, useMemo, useEffect } from 'react';
import { useTrainingStudentsQuery, useTrainingAnalysisQuery } from '../../hooks/useTrainingData';
import { useMetadataQuery } from '../../hooks/useMetadata';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  Search, 
  Award, 
  BookOpen, 
  AlertTriangle, 
  TrendingUp, 
  User, 
  Activity, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Code,
  MessagesSquare,
  FileBarChart2
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

export const TrainingStaffDashboard: React.FC = () => {
  const { selectedYear } = useAuthStore();
  const { data: initStudents, isLoading: loadingStudents } = useTrainingStudentsQuery(selectedYear);
  const { data: initAnalysis, isLoading: loadingAnalysis } = useTrainingAnalysisQuery(selectedYear);
  const { data: metadata } = useMetadataQuery();

  // Dashboard Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [analysisData, setAnalysisData] = useState<any>(null);

  useEffect(() => {
    if (initStudents) setStudents(initStudents);
  }, [initStudents]);

  useEffect(() => {
    if (initAnalysis) setAnalysisData(initAnalysis);
  }, [initAnalysis]);

  const departments = useMemo(() => {
    return metadata?.departments || ['CSE', 'IT', 'ECE', 'ME', 'CE'];
  }, [metadata]);

  const radarKeys = useMemo(() => {
    if (!analysisData?.radarData || analysisData.radarData.length === 0) return [];
    return Object.keys(analysisData.radarData[0]).filter(key => key !== 'subject');
  }, [analysisData]);

  const colors = [
    '#3B82F6', // CSE / Blue
    '#8B5CF6', // IT / Purple
    '#10B981', // ECE / Emerald
    '#EF4444', // ME / Red
    '#F59E0B', // CE / Amber
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#64748B', // Slate
  ];

  // Selected Student for detailed drills
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [readinessFilter, setReadinessFilter] = useState('All');

  // Table Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Selected student object
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find(s => s.id === selectedStudentId) || null;
  }, [selectedStudentId, students]);

  // Overall Cohort Averages
  const cohortAverages = useMemo(() => {
    if (students.length === 0) return { aptitude: 0, coding: 0, communication: 0, mockInterview: 0, attendance: 0, avgScore: 0 };
    const sums = students.reduce((acc, curr) => {
      acc.aptitude += curr.aptitude;
      acc.coding += curr.coding;
      acc.communication += curr.communication;
      acc.mockInterview += curr.mockInterview;
      acc.attendance += curr.attendance;
      acc.avgScore += curr.avgScore;
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

  // Categories Color Map
  const readinessColorMap = {
    'Highly Placeable': { text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500' },
    'Placement Ready': { text: 'text-blue-700', bg: 'bg-blue-50 border-blue-100', dot: 'bg-blue-500' },
    'Needs Improvement': { text: 'text-amber-700', bg: 'bg-amber-50 border-amber-100', dot: 'bg-amber-500' },
    'High Risk': { text: 'text-rose-700', bg: 'bg-rose-50 border-rose-100', dot: 'bg-rose-500' }
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.regNo.toLowerCase().includes(searchTerm.toLowerCase());
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
      if (counts[s.readinessLevel] !== undefined) {
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
    const coding = students.filter(s => s.coding < 70).map(s => ({ id: s.id, name: s.name, score: s.coding }));
    const aptitude = students.filter(s => s.aptitude < 70).map(s => ({ id: s.id, name: s.name, score: s.aptitude }));
    const communication = students.filter(s => s.communication < 70).map(s => ({ id: s.id, name: s.name, score: s.communication }));
    const mock = students.filter(s => s.mockInterview < 70).map(s => ({ id: s.id, name: s.name, score: s.mockInterview }));

    return { coding, aptitude, communication, mock };
  }, [students]);

  // Dynamic recommendations generator
  const dynamicRecommendations = useMemo(() => {
    if (!selectedStudent) return [];
    const recs = [];
    
    if (selectedStudent.coding < 70) {
      recs.push({
        type: 'coding',
        title: 'Targeted Coding Drill Required',
        description: `Score is ${selectedStudent.coding}/100. Assign 15 foundational DSA exercises (Arrays, Strings, Recursion) on the practice platform and mandate Saturday mentoring.`,
        priority: 'High'
      });
    }
    if (selectedStudent.aptitude < 70) {
      recs.push({
        type: 'aptitude',
        title: 'Quantitative & Logical Bootcamps',
        description: `Score is ${selectedStudent.aptitude}/100. Require daily speed training tests and assign analytical mocks (Profit & Loss, Ratios, Speed Math).`,
        priority: 'High'
      });
    }
    if (selectedStudent.communication < 70) {
      recs.push({
        type: 'communication',
        title: 'Soft Skills Training Enrollment',
        description: `Score is ${selectedStudent.communication}/100. Mandate the 2-week active speaking Bootcamp and add to the verbal assessment registry.`,
        priority: 'Medium'
      });
    }
    if (selectedStudent.mockInterview < 70) {
      recs.push({
        type: 'mock',
        title: 'Resume & Simulated Interview Drills',
        description: `Mock rating is ${selectedStudent.mockInterview}/100. Schedule a secondary interview slot focusing on core resume project explanations.`,
        priority: 'High'
      });
    }
    if (selectedStudent.attendance < 75) {
      recs.push({
        type: 'attendance',
        title: 'Critical Attendance Alert',
        description: `Attendance is at ${selectedStudent.attendance}%. Send official review request letter and mandate makeup hours for skipped sessions.`,
        priority: 'Critical'
      });
    }
    if (recs.length === 0) {
      recs.push({
        type: 'placement',
        title: 'Elite Student Placement Tracking',
        description: `Overall rating is excellent (${selectedStudent.avgScore}%). Highlight profile for Tier-1 high-package drives (12+ LPA core companies).`,
        priority: 'Low'
      });
    }
    return recs;
  }, [selectedStudent]);

  // Radar highlighted departments state
  const [highlightedDept, setHighlightedDept] = useState<string | null>(null);

  // SVG Circular Ring Helpers
  const circleSize = 130;
  const strokeWidth = 10;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const activePercent = selectedStudent ? selectedStudent.avgScore : cohortAverages.avgScore;
  const strokeDashoffset = circumference - (activePercent / 100) * circumference;

  if (loadingStudents || loadingAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-3">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
        <span className="text-slate-500 font-medium">Loading Training Workspace data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-indigo-600" />
            Training Staff Dashboard
          </h1>
          <p className="text-slate-500 text-sm">
            Monitor mock evaluation benchmarks, analyze department strengths, target weak cohorts, and review student placement readiness.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-100 rounded-xl px-4 py-2 text-indigo-700 text-xs font-semibold">
          <Activity className="h-4 w-4 text-indigo-500 animate-pulse" />
          <span>Active evaluator workspace</span>
        </div>
      </div>

      {/* Calculator, Donut Chart, and Recommendation Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* B) Readiness Score Calculator */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Readiness Calculator</h3>
              {selectedStudent ? (
                <button 
                  onClick={() => setSelectedStudentId(null)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
                >
                  Clear Selection
                </button>
              ) : (
                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded uppercase">
                  Cohort Avg
                </span>
              )}
            </div>

            {selectedStudent && (
              <div className="mb-4 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/60 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shadow">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{selectedStudent.name}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">{selectedStudent.regNo} | {selectedStudent.dept}</p>
                </div>
              </div>
            )}

            {/* Circular Indicator */}
            <div className="flex justify-center my-4 relative">
              <svg width={circleSize} height={circleSize} className="transform -rotate-90">
                {/* Background Ring */}
                <circle 
                  cx={circleSize / 2} 
                  cy={circleSize / 2} 
                  r={radius} 
                  fill="transparent" 
                  stroke="#E2E8F0" 
                  strokeWidth={strokeWidth} 
                />
                {/* Progress Ring */}
                <circle 
                  cx={circleSize / 2} 
                  cy={circleSize / 2} 
                  r={radius} 
                  fill="transparent" 
                  stroke={selectedStudent ? '#7C3AED' : '#1E40AF'} 
                  strokeWidth={strokeWidth} 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              {/* Inner Stats */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800 tracking-tighter">
                  {activePercent}%
                </span>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
                  Readiness
                </span>
              </div>
            </div>

            {/* Breakdown progress bars */}
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
                    className="bg-violet-600 h-2 rounded-full transition-all duration-500" 
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

              {/* Mock Interviews */}
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
            Click on any student row in the performance table below to load individual scores, details, and recommendations.
          </div>
        </div>

        {/* F) Student Categorization Chart (Donut) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Category Distribution</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Readiness status ratios of the current cohort.</p>
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
                      if (readinessFilter === data.name) {
                        setReadinessFilter('All');
                      } else {
                        setReadinessFilter(data.name);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Students`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Categorization Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {donutData.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setReadinessFilter(readinessFilter === d.name ? 'All' : d.name)}
                  className={`flex items-center gap-2 p-1.5 rounded-lg border text-left text-[10px] font-bold transition-all duration-200 ${
                    readinessFilter === d.name 
                      ? 'bg-slate-100 border-slate-300 shadow-sm' 
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-600 truncate">{d.name === 'Highly Placeable' ? 'Placement Ready' : d.name === 'High Risk' ? 'Critical Attention' : d.name}</span>
                  <span className="text-slate-400 ml-auto font-black">{d.value}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 pt-2 text-[9px] text-slate-400 font-semibold text-center border-t border-slate-100">
            💡 Click on a legend box or donut slice to filter the students table.
          </div>
        </div>

        {/* E) Recommendation System Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Performance Insights</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Auto-generated performance insights and warnings.</p>
              </div>
              <span className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileBarChart2 className="h-4 w-4" />
              </span>
            </div>

            {selectedStudent ? (
              <div className="space-y-3 overflow-y-auto max-h-[250px] pr-1">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${readinessColorMap[selectedStudent.readinessLevel]?.dot}`} />
                  <span className="text-xs font-bold text-slate-700">{selectedStudent.name}</span>
                  <span className={`ml-auto text-[9px] font-black uppercase px-2 py-0.5 rounded border ${readinessColorMap[selectedStudent.readinessLevel]?.bg} ${readinessColorMap[selectedStudent.readinessLevel]?.text}`}>
                    {selectedStudent.readinessLevel === 'Highly Placeable' ? 'Placement Ready' : selectedStudent.readinessLevel === 'High Risk' ? 'Critical Attention' : selectedStudent.readinessLevel}
                  </span>
                </div>
                
                {dynamicRecommendations.map((rec, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1 hover:border-slate-300 transition-colors">
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
                          : rec.priority === 'Medium' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
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
                    General Cohort Benchmarks
                  </h4>
                  <ul className="text-[10px] text-slate-500 space-y-2 list-disc pl-4 font-medium">
                    <li>Current Aptitude averages stand at {cohortAverages.aptitude}%. Reach for 80% benchmark.</li>
                    <li>Coding tests indicate core strength in CSE, but ME/CE cohorts need fundamental DSA classes.</li>
                    <li>Verify communication rating checklist before ongoing Microsoft recruitment dates.</li>
                  </ul>
                </div>
                <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 p-4 rounded-xl text-center">
                  <User className="h-7 w-7 text-slate-300 mb-1" />
                  <p className="text-[10px] font-bold text-slate-500">No Student Selected</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">Select a student from the tracker table to load customized recommendations.</p>
                </div>
              </div>
            )}
          </div>
          <div className="text-[9px] text-slate-400 border-t border-slate-100 pt-2 font-semibold flex items-center justify-between">
            <span>Evaluations active: 25</span>
            <span>Target deadline: June 30</span>
          </div>
        </div>

      </div>

      {/* A) Student Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        
        {/* Controls Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">Student Performance & Placement Readiness</h3>
            <p className="text-slate-400 text-xs mt-0.5">List of students enrolled in pre-placement mock eval campaigns.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search Name or Reg No..."
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>

            {/* Department Filter */}
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

            {/* Readiness Filter */}
            <select
              value={readinessFilter}
              onChange={e => setReadinessFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="All">All Categories</option>
              <option value="Highly Placeable">Placement Ready</option>
              <option value="Placement Ready">Placement Ready</option>
              <option value="Needs Improvement">Needs Improvement</option>
              <option value="High Risk">Critical Attention</option>
            </select>

            {/* Reset Button */}
            {(searchTerm || deptFilter !== 'All' || readinessFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDeptFilter('All');
                  setReadinessFilter('All');
                }}
                className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-100 font-black">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Reg No</th>
                <th className="px-6 py-4 text-center">Aptitude</th>
                <th className="px-6 py-4 text-center">Coding</th>
                <th className="px-6 py-4 text-center">Communication</th>
                <th className="px-6 py-4 text-center">Mock Interview</th>
                <th className="px-6 py-4 text-center">Attendance</th>
                <th className="px-6 py-4 text-center">Readiness Level</th>
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
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{student.name}</p>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">{student.dept} Branch</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-semibold">{student.regNo}</td>
                    
                    {/* Aptitude */}
                    <td className="px-6 py-3.5 text-center font-bold">
                      <span className={student.aptitude < 70 ? 'text-rose-600' : 'text-slate-800'}>
                        {student.aptitude}
                      </span>
                    </td>
                    
                    {/* Coding */}
                    <td className="px-6 py-3.5 text-center font-bold">
                      <span className={student.coding < 70 ? 'text-rose-600' : 'text-slate-800'}>
                        {student.coding}
                      </span>
                    </td>

                    {/* Communication */}
                    <td className="px-6 py-3.5 text-center font-bold">
                      <span className={student.communication < 70 ? 'text-rose-600' : 'text-slate-800'}>
                        {student.communication}
                      </span>
                    </td>

                    {/* Mock Interview */}
                    <td className="px-6 py-3.5 text-center font-bold">
                      <span className={student.mockInterview < 70 ? 'text-rose-600' : 'text-slate-800'}>
                        {student.mockInterview}
                      </span>
                    </td>

                    {/* Attendance */}
                    <td className="px-6 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        student.attendance < 75 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {student.attendance}%
                      </span>
                    </td>

                    {/* Readiness badge */}
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${readinessColorMap[student.readinessLevel]?.bg} ${readinessColorMap[student.readinessLevel]?.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${readinessColorMap[student.readinessLevel]?.dot}`} />
                        <span>{student.readinessLevel === 'Highly Placeable' ? 'Placement Ready' : student.readinessLevel === 'High Risk' ? 'Critical Attention' : student.readinessLevel}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold">
                    No student records match the active search and filter options.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-400 font-semibold text-[10px]">
              Showing {Math.min(filteredStudents.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredStudents.length, currentPage * itemsPerPage)} of {filteredStudents.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-7 w-7 text-xs font-bold rounded-lg border transition-all ${
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
                className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* C) Weak Area Detection Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="border-b border-slate-100 pb-3 mb-5">
          <h3 className="font-extrabold text-slate-800 text-base">Weak Area Detection</h3>
          <p className="text-slate-400 text-xs mt-0.5">Instant alerts highlighting students scoring below 70% in individual modules.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Coding Weakness */}
          <div className="bg-rose-50/20 border border-rose-100/60 p-4 rounded-xl flex flex-col justify-between h-[220px]">
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
                        selectedStudentId === ws.id ? 'bg-rose-100/60 border border-rose-200' : 'hover:bg-rose-50'
                      }`}
                    >
                      <span className="text-slate-700 truncate">{ws.name}</span>
                      <span className="text-rose-600 shrink-0">{ws.score}/100</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center pt-8">No alerts detected.</p>
                )}
              </div>
            </div>
          </div>

          {/* Aptitude Weakness */}
          <div className="bg-amber-50/20 border border-amber-100/60 p-4 rounded-xl flex flex-col justify-between h-[220px]">
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
                        selectedStudentId === ws.id ? 'bg-amber-100/60 border border-amber-200' : 'hover:bg-amber-50'
                      }`}
                    >
                      <span className="text-slate-700 truncate">{ws.name}</span>
                      <span className="text-amber-600 shrink-0">{ws.score}/100</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center pt-8">No alerts detected.</p>
                )}
              </div>
            </div>
          </div>

          {/* Communication Weakness */}
          <div className="bg-orange-50/20 border border-orange-100/60 p-4 rounded-xl flex flex-col justify-between h-[220px]">
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
                        selectedStudentId === ws.id ? 'bg-orange-100/60 border border-orange-200' : 'hover:bg-orange-50'
                      }`}
                    >
                      <span className="text-slate-700 truncate">{ws.name}</span>
                      <span className="text-orange-600 shrink-0">{ws.score}/100</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center pt-8">No alerts detected.</p>
                )}
              </div>
            </div>
          </div>

          {/* Mock Interview Weakness */}
          <div className="bg-violet-50/20 border border-violet-100/60 p-4 rounded-xl flex flex-col justify-between h-[220px]">
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
                        selectedStudentId === ws.id ? 'bg-violet-100/60 border border-violet-200' : 'hover:bg-violet-50'
                      }`}
                    >
                      <span className="text-slate-700 truncate">{ws.name}</span>
                      <span className="text-violet-600 shrink-0">{ws.score}/100</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center pt-8">No alerts detected.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* D) Department Training Analysis (Radar Chart) */}
      {analysisData && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="border-b border-slate-100 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Department Placement Analysis</h3>
              <p className="text-slate-400 text-xs mt-0.5">Comparing department performance averages across all evaluation metrics.</p>
            </div>
                      {/* Highlights controls */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase mr-1">Highlight:</span>
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setHighlightedDept(highlightedDept === dept ? null : dept)}
                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                    highlightedDept === dept 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-900/10'
                      : 'bg-slate-50 border-slate-200 text-slate-505 hover:bg-slate-100'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Chart Area */}
            <div className="h-[360px] w-full lg:col-span-8">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analysisData.radarData}>
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
            </div>

            {/* Analysis Side Notes */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  Evaluation Inferences
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  The comparative analysis highlights strong algorithmic proficiency in <span className="font-bold text-slate-700">Computer Science (CSE)</span>, averaging <span className="font-extrabold text-blue-600">93%</span>. 
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  However, <span className="font-bold text-slate-700">Mechanical (ME)</span> and <span className="font-bold text-slate-700">Civil (CE)</span> cohorts require targeted attention, specifically in <span className="font-bold text-slate-700">Coding</span> (avg 45-50%) and <span className="font-bold text-slate-700">Aptitude Math</span>.
                </p>
                <div className="pt-2 border-t border-slate-200">
                  <h5 className="text-[10px] font-bold text-slate-700">Recommended Action Plan:</h5>
                  <ul className="list-disc pl-4 text-[10px] text-slate-500 mt-1 space-y-1">
                    <li>Launch daily coding sprints for ME & CE.</li>
                    <li>Mandate active speaking group rounds for ECE.</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
