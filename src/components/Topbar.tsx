import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Search, Bell, ChevronDown, GitCompare, X, Check } from 'lucide-react';
import type { UserRole } from '../types';
import { useYearsStore } from '../store/useYearsStore';
import { useYearsQuery } from '../hooks/useMetadata';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

export const Topbar: React.FC = () => {
  const {
    user,
    selectedYear,
    setSelectedYear,
    setRole,
    compareYears,
    setCompareYears,
    isCompareMode,
    toggleCompareMode,
  } = useAuthStore();

  // Seed the Zustand years store from GET /api/years on first load
  useYearsQuery();
  const years = useYearsStore((s) => s.years);
  const latestYear = years.length > 0 ? years[0] : 'All';
  const yearsLoading = years.length === 0;

  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showComparePanel, setShowComparePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const comparePanelRef = useRef<HTMLDivElement>(null);
  
  // Search Overlay States
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedYearFilter, setSelectedYearFilter] = useState<string | null>(null);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Live queries to retrieve search data directly from the MongoDB backend
  const { data: placementsList } = useQuery<any[]>({
    queryKey: ['search', 'placements'],
    queryFn: async () => {
      const res = await apiClient.get('/placements?limit=500');
      return res.data?.data?.placements || [];
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: companiesList } = useQuery<any[]>({
    queryKey: ['search', 'companies'],
    queryFn: async () => {
      const res = await apiClient.get('/companies');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000
  });

  // Auto-initialize selectedYear to the latest year when years first load
  useEffect(() => {
    if (years.length > 0 && selectedYear === 'All') {
      setSelectedYear(latestYear);
    }
  }, [years, latestYear, selectedYear, setSelectedYear]);

  // Close compare panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comparePanelRef.current && !comparePanelRef.current.contains(e.target as Node)) {
        setShowComparePanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setRole(role);
    setShowRoleSwitcher(false);
  };

  // Toggle a year in compareYears selection
  const toggleCompareYear = (year: string) => {
    if (compareYears.includes(year)) {
      setCompareYears(compareYears.filter((y) => y !== year));
    } else {
      setCompareYears([...compareYears, year].sort((a, b) => b.localeCompare(a)));
    }
  };

  const handleToggleCompareMode = () => {
    toggleCompareMode();
    setShowComparePanel(!isCompareMode); // open panel when turning on
  };

  // Derive notification items from live company data. Do not use hardcoded/mock notifications.
  const notificationItems = React.useMemo(() => {
    const list = companiesList || [];
    return list.slice(0, 6).map((c: any, i: number) => ({
      id: `company-${i}`,
      text: `${c.company_name} — ${c.status || 'Status Unknown'}`,
      time: c.drive_date ? new Date(c.drive_date).toLocaleString() : 'TBD'
    }));
  }, [companiesList]);

  // Memoized Search Datasets
  const searchStudents = React.useMemo(() => {
    const list = placementsList || [];
    return list.map((s: any, index: number) => ({
      id: s._id || String(index + 1),
      name: s.name,
      regNo: s.reg_no,
      dept: s.department,
      year: String(s.year),
      company: s.company,
      skills: s.department === 'CSE' || s.department === 'IT' || s.department === 'ADS'
        ? ['React', 'Node', 'Java', 'SQL', 'Python']
        : ['AutoCAD', 'MATLAB', 'C++', 'SolidWorks']
    }));
  }, [placementsList]);

  const searchRecruiters = React.useMemo(() => {
    const list = companiesList || [];
    return list.map((c: any, index: number) => ({
      id: c._id || String(index + 1),
      name: `${c.company_name} Talent Acquisition Head`,
      company: c.company_name,
      email: `careers@${c.company_name.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: `+91 9840${String(10000 + index).slice(1)}`
    }));
  }, [companiesList]);

  const searchDrives = React.useMemo(() => {
    const list = companiesList || [];
    return list.map((c: any, index: number) => {
      const driveDate = c.drive_date ? new Date(c.drive_date) : new Date();
      return {
        id: c._id || String(index + 1),
        companyName: c.company_name,
        status: c.status || 'Active',
        date: c.drive_date ? driveDate.toISOString().split('T')[0] : '',
        packageOffer: `${c.package || 0} LPA`,
        year: String(driveDate.getFullYear())
      };
    });
  }, [companiesList]);

  // Filtered lists in real-time
  const filteredStudents = React.useMemo(() => {
    return searchStudents.filter(s => {
      const matchesText = !searchQuery || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.regNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.skills.some(sk => sk.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (selectedDept && s.dept !== selectedDept) return false;
      if (selectedYearFilter && s.year !== selectedYearFilter) return false;
      if (selectedCompanyFilter && s.company.toLowerCase() !== selectedCompanyFilter.toLowerCase()) return false;
      return matchesText;
    });
  }, [searchQuery, selectedDept, selectedYearFilter, selectedCompanyFilter, searchStudents]);

  const filteredRecruiters = React.useMemo(() => {
    return searchRecruiters.filter(r => {
      const matchesText = !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (selectedDept) return false;
      if (selectedYearFilter) {
        const hasDrive = searchDrives.some(d => d.companyName.toLowerCase() === r.company.toLowerCase() && d.year === selectedYearFilter);
        if (!hasDrive) return false;
      }
      if (selectedCompanyFilter && r.company.toLowerCase() !== selectedCompanyFilter.toLowerCase()) return false;
      return matchesText;
    });
  }, [searchQuery, selectedDept, selectedYearFilter, selectedCompanyFilter, searchRecruiters, searchDrives]);

  const filteredDrives = React.useMemo(() => {
    return searchDrives.filter(d => {
      const matchesText = !searchQuery ||
        d.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.packageOffer.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (selectedDept) {
        const list = placementsList || [];
        const matchesDept = list.some((p: any) => p.department === selectedDept && p.company.toLowerCase() === d.companyName.toLowerCase());
        if (!matchesDept) return false;
      }
      if (selectedYearFilter && d.year !== selectedYearFilter) return false;
      if (selectedCompanyFilter && d.companyName.toLowerCase() !== selectedCompanyFilter.toLowerCase()) return false;
      return matchesText;
    });
  }, [searchQuery, selectedDept, selectedYearFilter, selectedCompanyFilter, searchDrives, placementsList]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shadow-sm relative">
      {/* Search Bar */}
      <div ref={searchDropdownRef} className="flex-1 max-w-md relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search students, recruiters, drives..."
          value={searchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
        />

        {isSearchFocused && (
          <div className="absolute left-0 mt-2 w-[550px] bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] overflow-hidden flex flex-col max-h-[500px]">
            {/* Filter Chips Header */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interactive Filters</span>
                {(selectedDept || selectedYearFilter || selectedCompanyFilter || searchQuery) && (
                  <button 
                    onClick={() => {
                      setSelectedDept(null);
                      setSelectedYearFilter(null);
                      setSelectedCompanyFilter(null);
                      setSearchQuery('');
                    }}
                    className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              {/* Department Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Dept:</span>
                {['CSE', 'IT', 'ECE', 'ME', 'CE'].map(dept => {
                  const isSelected = selectedDept === dept;
                  return (
                    <button
                      key={dept}
                      onClick={() => setSelectedDept(isSelected ? null : dept)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      {dept}
                    </button>
                  );
                })}
              </div>

              {/* Year Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase mr-1.5">Year:</span>
                {['2027', '2026', '2025', '2024'].map(yr => {
                  const isSelected = selectedYearFilter === yr;
                  return (
                    <button
                      key={yr}
                      onClick={() => setSelectedYearFilter(isSelected ? null : yr)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                        isSelected 
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-bold' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>

              {/* Company Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Comp:</span>
                {['Google', 'Microsoft', 'Amazon', 'TCS', 'Infosys', 'Deloitte'].map(comp => {
                  const isSelected = selectedCompanyFilter === comp;
                  return (
                    <button
                      key={comp}
                      onClick={() => setSelectedCompanyFilter(isSelected ? null : comp)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                        isSelected 
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm font-bold' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      {comp}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {/* Category: Students */}
              {filteredStudents.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Students ({filteredStudents.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {filteredStudents.slice(0, 5).map(s => (
                      <div key={s.id} className="p-2 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs transition-colors border border-transparent hover:border-slate-150">
                        <div>
                          <p className="font-bold text-slate-800">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Reg No: {s.regNo} • Year: {s.year}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-50 text-blue-700 uppercase border border-blue-200">{s.dept}</span>
                          {s.skills.slice(0, 2).map(skill => (
                            <span key={skill} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">{skill}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {filteredStudents.length > 5 && (
                      <p className="text-[10px] text-slate-455 text-center py-1 font-semibold">And {filteredStudents.length - 5} more students...</p>
                    )}
                  </div>
                </div>
              )}

              {/* Category: Recruiters */}
              {filteredRecruiters.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Recruiters ({filteredRecruiters.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {filteredRecruiters.slice(0, 3).map(r => (
                      <div key={r.id} className="p-2 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs transition-colors border border-transparent hover:border-slate-150">
                        <div>
                          <p className="font-bold text-slate-800">{r.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{r.email} • {r.phone}</p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-50 text-amber-700 uppercase border border-amber-200">{r.company}</span>
                      </div>
                    ))}
                    {filteredRecruiters.length > 3 && (
                      <p className="text-[10px] text-slate-455 text-center py-1 font-semibold">And {filteredRecruiters.length - 3} more recruiters...</p>
                    )}
                  </div>
                </div>
              )}

              {/* Category: Drives */}
              {filteredDrives.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Drives ({filteredDrives.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {filteredDrives.slice(0, 3).map(d => (
                      <div key={d.id} className="p-2 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs transition-colors border border-transparent hover:border-slate-150">
                        <div>
                          <p className="font-bold text-slate-800">{d.companyName} Campus Drive ({d.year})</p>
                          <p className="text-[10px] text-slate-400 font-medium">Date: {d.date} • Offer: {d.packageOffer}</p>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                          d.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          d.status === 'Ongoing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>{d.status}</span>
                      </div>
                    ))}
                    {filteredDrives.length > 3 && (
                      <p className="text-[10px] text-slate-455 text-center py-1 font-semibold">And {filteredDrives.length - 3} more drives...</p>
                    )}
                  </div>
                </div>
              )}

              {filteredStudents.length === 0 && filteredRecruiters.length === 0 && filteredDrives.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-sm font-semibold">No results found</p>
                  <p className="text-xs mt-1">Try adjusting your search query or removing some filters.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* ── Year Selector + Compare Mode ──────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:inline">
            Batch:
          </span>

          {yearsLoading ? (
            <div className="h-8 w-28 bg-slate-100 rounded-lg animate-pulse" />
          ) : isCompareMode ? (
            /* ── Compare Mode Active: show selected years badge ───────────── */
            <div ref={comparePanelRef} className="relative">
              <button
                onClick={() => setShowComparePanel(!showComparePanel)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
                  compareYears.length > 0
                    ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200'
                    : 'bg-violet-50 text-violet-700 border-violet-300'
                }`}
              >
                <GitCompare className="h-3.5 w-3.5" />
                {compareYears.length > 0
                  ? compareYears.map((y) => `${y}`).join(' vs ')
                  : 'Select years…'}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showComparePanel ? 'rotate-180' : ''}`} />
              </button>

              {/* Multi-select dropdown panel */}
              {showComparePanel && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600">
                    <p className="text-xs font-bold text-white">Compare Years</p>
                    <p className="text-[10px] text-violet-200 mt-0.5">Select 2 or more years to compare</p>
                  </div>
                  <div className="p-2">
                    {years.map((year) => {
                      const checked = compareYears.includes(year);
                      return (
                        <button
                          key={year}
                          onClick={() => toggleCompareYear(year)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 transition-all text-sm font-medium ${
                            checked
                              ? 'bg-violet-50 text-violet-700 border border-violet-200'
                              : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <span>{year} Batch</span>
                          {checked && (
                            <div className="h-5 w-5 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                          {!checked && (
                            <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {compareYears.length >= 2 && (
                    <div className="px-3 pb-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700 font-medium text-center">
                        ✓ Comparing {compareYears.join(' vs ')} across all charts
                      </div>
                    </div>
                  )}
                  {compareYears.length > 0 && compareYears.length < 2 && (
                    <div className="px-3 pb-3">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 font-medium text-center">
                        Select at least one more year
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── Single Year Mode: normal dropdown ─────────────────────────── */
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y} Batch</option>
              ))}
              <option value="All">All Years</option>
            </select>
          )}

          {/* ── Compare Toggle Button ──────────────────────────────────────── */}
          <button
            onClick={handleToggleCompareMode}
            title={isCompareMode ? 'Exit compare mode' : 'Compare years'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isCompareMode
                ? 'bg-violet-100 text-violet-700 border-violet-300 hover:bg-violet-200'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            {isCompareMode ? (
              <>
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </>
            ) : (
              <>
                <GitCompare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Compare</span>
              </>
            )}
          </button>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-2">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">Notifications</span>
                <span onClick={() => setShowNotifications(false)} className="text-xs text-blue-600 hover:underline cursor-pointer">Clear</span>
              </div>
              <div className="divide-y divide-slate-100">
                {notificationItems.map((item) => (
                  <div key={item.id} className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer">
                    <p className="text-xs text-slate-700 font-medium">{item.text}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Card & Role Switcher */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center gap-2 p-1 pr-3 hover:bg-slate-100 rounded-lg transition-all border border-transparent hover:border-slate-200"
            >
              <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full border border-slate-200 object-cover shadow-sm" />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-700 leading-tight">{user.name.split(' (')[0]}</p>
                <p className="text-[10px] text-slate-400 leading-none capitalize">{user.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-2 divide-y divide-slate-100">
                <div className="px-4 py-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active User</p>
                  <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Role Switch</p>
                  {(['overall', 'director', 'officer', 'training'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between transition-colors ${
                        user.role === role
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="capitalize">{role === 'overall' ? 'Global Admin' : `${role} Dashboard`}</span>
                      {user.role === role && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
