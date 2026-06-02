import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Search, Bell, ChevronDown, GitCompare, X, Check } from 'lucide-react';
import type { UserRole } from '../types';
import { useYearsStore } from '../store/useYearsStore';
import { useYearsQuery } from '../hooks/useMetadata';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useNavigate } from 'react-router-dom';

const dashboardNames: Record<UserRole, string> = {
  overall: 'Overall Analytics',
  director: 'Director View',
  officer: 'Placement Officer View',
  training: 'Training Staff View',
};

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

  const navigate = useNavigate();

  // Seed the Zustand years store from GET /api/years on first load
  useYearsQuery();
  const years = useYearsStore((s) => s.years);
  const latestYear = years.length > 0 ? years[0] : 'all';
  const yearsLoading = years.length === 0;

  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showComparePanel, setShowComparePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const comparePanelRef = useRef<HTMLDivElement>(null);
  
  // Search Overlay States
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search term (300ms delay)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Student Profile Drawer/Modal States
  const [selectedStudentRegNo, setSelectedStudentRegNo] = useState<string | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Live query for global search
  const { data: globalSearchResults, isLoading: isSearchLoading } = useQuery<any>({
    queryKey: ['globalSearch', debouncedSearchQuery],
    queryFn: async () => {
      if (debouncedSearchQuery.trim().length < 2) {
        return {
          students: [],
          companies: [],
          placements: [],
          hr_contacts: [],
          training_details: []
        };
      }
      const res = await apiClient.get(`/search?q=${encodeURIComponent(debouncedSearchQuery.trim())}`);
      return res.data?.data || {
        students: [],
        companies: [],
        placements: [],
        hr_contacts: [],
        training_details: []
      };
    },
    enabled: debouncedSearchQuery.trim().length >= 2,
    staleTime: 30000 // Cache for 30 seconds
  });

  // Query for fetching a detailed student profile when selected from search
  const { data: studentProfile, isLoading: isProfileLoading, error: profileError } = useQuery<any>({
    queryKey: ['studentProfile', selectedStudentRegNo],
    queryFn: async () => {
      if (!selectedStudentRegNo) return null;
      
      // 1. Fetch basic student info
      const studentRes = await apiClient.get(`/students/${encodeURIComponent(selectedStudentRegNo)}`);
      const student = studentRes.data?.data;
      
      // 2. Fetch placements matching student register number
      let placements: any[] = [];
      try {
        const placementsRes = await apiClient.get(`/placements?search=${encodeURIComponent(selectedStudentRegNo)}`);
        placements = placementsRes.data?.data?.placements?.filter((p: any) => p.reg_no === selectedStudentRegNo) || [];
      } catch (err) {
        console.log("No placement record found or failed to fetch:", err);
      }
      
      // 3. Fetch training details by register number (gracefully handle 404 not found)
      let training: any = null;
      try {
        const trainingRes = await apiClient.get(`/training-details/reg/${encodeURIComponent(selectedStudentRegNo)}`);
        training = trainingRes.data?.data || null;
      } catch (err) {
        console.log("Gracefully handled training detail lookup failure (e.g. no record exists):", err);
      }
      
      return {
        student,
        placement: placements.length > 0 ? placements[0] : null,
        training
      };
    },
    enabled: !!selectedStudentRegNo && showStudentModal,
    staleTime: 30000 // Cache for 30 seconds
  });

  // Live queries to retrieve search data directly from the MongoDB backend (for notifications and other pages)
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
    if (years.length > 0 && !selectedYear) {
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
    navigate(`/dashboard/${role}`);
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

  // Handle result click navigation with role updating when permitted (for non-student results)
  const handleResultClick = (category: string) => {
    setIsSearchFocused(false);
    if (category === 'Companies' || category === 'HR Contacts') {
      if (user && user.role !== 'overall' && user.role !== 'officer') {
        setRole('officer');
      }
      navigate('/dashboard/officer');
    } else if (category === 'Training Records') {
      if (user && user.role !== 'overall' && user.role !== 'training') {
        setRole('training');
      }
      navigate('/dashboard/training');
    } else if (category === 'Placements') {
      navigate('/dashboard/overall');
    }
  };

  // Handle clicking a student profile search result (opens modal, no navigation)
  const handleStudentResultClick = (regNo: string) => {
    setIsSearchFocused(false);
    setSelectedStudentRegNo(regNo);
    setShowStudentModal(true);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shadow-sm relative">
      {/* Search Bar */}
      <div ref={searchDropdownRef} className="flex-1 max-w-md relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Global search across all years..."
          value={searchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
        />

        {isSearchFocused && (
          <div className="absolute left-0 mt-2 w-[550px] bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] overflow-hidden flex flex-col">
            {/* Search Results */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 max-h-[400px]">
              {isSearchLoading ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2" />
                  <span className="text-sm font-medium">Searching records...</span>
                </div>
              ) : searchQuery.trim().length < 2 ? (
                <div className="p-4 text-center text-slate-400">
                  <p className="text-xs font-medium">Type at least 2 characters to search across all data...</p>
                </div>
              ) : (
                <>
                  {/* Category: Students */}
                  {globalSearchResults?.students && globalSearchResults.students.length > 0 && (
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Students</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {globalSearchResults.students.map((s: any) => (
                          <div
                            key={s._id}
                            onClick={() => handleStudentResultClick(s.reg_no)}
                            className="p-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs transition-colors border border-transparent hover:border-slate-150 cursor-pointer"
                          >
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Student • Batch {s.batch_year || 'N/A'}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Reg No: {s.reg_no} • {s.department}</p>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-50 text-blue-700 uppercase border border-blue-200">
                              {s.department}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Companies */}
                  {globalSearchResults?.companies && globalSearchResults.companies.length > 0 && (
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Companies</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {globalSearchResults.companies.map((c: any) => (
                          <div
                            key={c._id}
                            onClick={() => handleResultClick('Companies')}
                            className="p-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs transition-colors border border-transparent hover:border-slate-150 cursor-pointer"
                          >
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{c.company_name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Company • Batch {c.batch_year || 'N/A'}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Status: {c.status} • Package: {c.package} LPA</p>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-700 uppercase border border-emerald-200">
                              {c.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Placements */}
                  {globalSearchResults?.placements && globalSearchResults.placements.length > 0 && (
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Placements</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {globalSearchResults.placements.map((p: any) => (
                          <div
                            key={p._id}
                            onClick={() => handleResultClick('Placements')}
                            className="p-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs transition-colors border border-transparent hover:border-slate-150 cursor-pointer"
                          >
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Placement • Batch {p.batch_year || p.year || 'N/A'}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Reg No: {p.reg_no} • {p.company} • {p.department}</p>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-50 text-purple-700 uppercase border border-purple-200">
                              Placed
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: HR Contacts */}
                  {globalSearchResults?.hr_contacts && globalSearchResults.hr_contacts.length > 0 && (
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">HR Contacts</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {globalSearchResults.hr_contacts.map((h: any) => (
                          <div
                            key={h._id}
                            onClick={() => handleResultClick('HR Contacts')}
                            className="p-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs transition-colors border border-transparent hover:border-slate-150 cursor-pointer"
                          >
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{h.hr_name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                HR Contact • Batch {h.batch_year || 'N/A'}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{h.company_name} • {h.email}</p>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-50 text-amber-700 uppercase border border-amber-200">
                              Contact
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Training Records */}
                  {globalSearchResults?.training_details && globalSearchResults.training_details.length > 0 && (
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest">Training Records</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {globalSearchResults.training_details.map((t: any) => (
                          <div
                            key={t._id}
                            onClick={() => handleResultClick('Training Records')}
                            className="p-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs transition-colors border border-transparent hover:border-slate-150 cursor-pointer"
                          >
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Training Record • Batch {t.batch_year || 'N/A'}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Reg No: {t.reg_no} • {t.department}</p>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-pink-50 text-pink-700 uppercase border border-pink-200">
                              Training
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!globalSearchResults ||
                    ((globalSearchResults.students?.length || 0) === 0 &&
                      (globalSearchResults.companies?.length || 0) === 0 &&
                      (globalSearchResults.placements?.length || 0) === 0 &&
                      (globalSearchResults.hr_contacts?.length || 0) === 0 &&
                      (globalSearchResults.training_details?.length || 0) === 0)) && (
                    <div className="p-8 text-center text-slate-400">
                      <p className="text-sm font-semibold">No results found</p>
                      <p className="text-xs mt-1">Try adjusting your search query.</p>
                    </div>
                  )}
                </>
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
              <option value="all">All Years</option>
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

        {/* User Card & Workspace Switcher */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center gap-2 p-1 pr-3 hover:bg-slate-100 rounded-lg transition-all border border-transparent hover:border-slate-200"
            >
              <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full border border-slate-200 object-cover shadow-sm" />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-700 leading-tight">{user.name.split(' (')[0]}</p>
                <p className="text-[10px] text-slate-400 leading-none">{dashboardNames[user.role]}</p>
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
                  <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">DASHBOARD NAVIGATION</p>
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
                      <span>{dashboardNames[role]}</span>
                      {user.role === role && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Student Profile Modal */}
      {showStudentModal && selectedStudentRegNo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-blue-200">
                  Student Profile Explorer
                </span>
                <h3 className="text-xl font-bold mt-1">
                  {isProfileLoading ? 'Loading Profile...' : studentProfile?.student?.name || 'Student Details'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowStudentModal(false);
                  setSelectedStudentRegNo(null);
                }}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {isProfileLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
                  <p className="text-sm font-semibold">Retrieving full academic & placement logs...</p>
                </div>
              ) : profileError || !studentProfile?.student ? (
                <div className="py-16 text-center text-rose-500">
                  <p className="text-sm font-semibold">Failed to retrieve student profile details.</p>
                  <p className="text-xs mt-1 text-slate-450">Please try again later or check connections.</p>
                </div>
              ) : (
                <>
                  {/* 1. Basic Information */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                      Basic Information
                    </h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Student Name</p>
                        <p className="font-bold text-slate-800 mt-0.5">{studentProfile.student.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Register Number</p>
                        <p className="font-bold text-slate-800 mt-0.5">{studentProfile.student.reg_no}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Department</p>
                        <p className="font-bold text-slate-800 mt-0.5">{studentProfile.student.department}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Batch Year</p>
                        <p className="font-bold text-slate-800 mt-0.5">{studentProfile.student.batch_year}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">CGPA</p>
                        <p className="font-bold text-slate-800 mt-0.5 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md inline-block">
                          {studentProfile.student.cgpa.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Arrears</p>
                        <p className={`font-bold mt-0.5 px-2 py-0.5 rounded-md inline-block ${
                          studentProfile.student.arrears > 0 
                            ? 'bg-rose-50 text-rose-700 font-extrabold' 
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {studentProfile.student.arrears} Arrears
                        </p>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400 font-medium mb-2">Technical Skills & Expertise</p>
                      <div className="flex flex-wrap gap-1.5">
                        {studentProfile.student.skills && studentProfile.student.skills.length > 0 ? (
                          studentProfile.student.skills.map((skill: string) => (
                            <span
                              key={skill}
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200/50"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">No Skills Registry Available</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Placement Information */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-600" />
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                      Placement Information
                    </h4>
                    {studentProfile.placement ? (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Placement Status</p>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 mt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {studentProfile.placement.placement_status || 'Placed'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Recruiting Company</p>
                          <p className="font-bold text-slate-800 mt-0.5">{studentProfile.placement.company}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Designation / Role</p>
                          <p className="font-bold text-slate-800 mt-0.5">{studentProfile.placement.role || 'Associate Software Engineer'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Offered Package</p>
                          <p className="font-bold text-violet-750 mt-0.5 text-base">
                            {studentProfile.placement.package} LPA
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <p className="text-slate-400 text-sm font-semibold">No Placement Record Available</p>
                        <p className="text-xs text-slate-400 mt-0.5">The student has not completed placement reporting for this company drive.</p>
                      </div>
                    )}
                  </div>

                  {/* 3. Training Information */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-pink-600" />
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                      Training Information
                    </h4>
                    {studentProfile.training ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Aptitude Score</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden max-w-[100px]">
                                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${studentProfile.training.aptitude_score}%` }} />
                              </div>
                              <span className="font-bold text-slate-700">{studentProfile.training.aptitude_score}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Coding Score</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden max-w-[100px]">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${studentProfile.training.coding_score}%` }} />
                              </div>
                              <span className="font-bold text-slate-700">{studentProfile.training.coding_score}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Communication Score</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden max-w-[100px]">
                                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${studentProfile.training.communication_score}%` }} />
                              </div>
                              <span className="font-bold text-slate-700">{studentProfile.training.communication_score}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Mock Interview Score</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden max-w-[100px]">
                                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${studentProfile.training.mock_interview_score}%` }} />
                              </div>
                              <span className="font-bold text-slate-700">{studentProfile.training.mock_interview_score}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Attendance</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden max-w-[100px]">
                                <div className="bg-pink-500 h-full rounded-full" style={{ width: `${studentProfile.training.attendance}%` }} />
                              </div>
                              <span className="font-bold text-slate-700">{studentProfile.training.attendance}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Readiness Score</p>
                            <p className="font-black mt-0.5 text-base text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md inline-block">
                              {((studentProfile.training.aptitude_score * 0.25) +
                                (studentProfile.training.coding_score * 0.35) +
                                (studentProfile.training.communication_score * 0.20) +
                                (studentProfile.training.mock_interview_score * 0.20)).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Training Details
                        </span>
                        <p className="text-emerald-600 text-xs font-black flex items-center gap-1">
                          ✓ No Training Record Available
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                          Historical databases or specific batches may not carry active training metrics. This is a normal catalog state.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

