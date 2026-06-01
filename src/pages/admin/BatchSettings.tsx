import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useYearsStore } from '../../store/useYearsStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
  PlusCircle,
  Archive,
  CalendarDays,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  GraduationCap,
  TrendingUp,
  Database,
  RefreshCw,
} from 'lucide-react';

export const BatchSettings: React.FC = () => {
  const { years, archivedYears, addYear, archiveYear, restoreYear } = useYearsStore();
  const { selectedYear, setSelectedYear, compareYears, setCompareYears } = useAuthStore();
  const queryClient = useQueryClient();

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [archivingYear, setArchivingYear] = useState<string | null>(null);

  // Validate and add a batch year
  const handleAdd = async () => {
    const trimmed = input.trim();
    setError('');
    setSuccess('');

    if (!trimmed) {
      setError('Please enter a year.');
      return;
    }
    if (!/^\d{4}$/.test(trimmed)) {
      setError('Year must be exactly 4 digits (e.g. 2027).');
      return;
    }
    const num = parseInt(trimmed, 10);
    if (num < 2000 || num > 2100) {
      setError('Year must be between 2000 and 2100.');
      return;
    }
    if (years.includes(trimmed)) {
      setError(`${trimmed} batch already exists and is active.`);
      return;
    }
    if (archivedYears.includes(trimmed)) {
      // If archived, restore it
      await handleRestore(trimmed);
      setInput('');
      return;
    }

    setIsAdding(true);
    // Simulate API call delay
    await new Promise((r) => setTimeout(r, 600));
    await addYear(trimmed);
    setSelectedYear(trimmed); // auto-switch to the new batch
    setInput('');
    setSuccess(`${trimmed} batch added successfully! The dropdown, charts, and stat cards will now include ${trimmed}.`);
    setIsAdding(false);
    
    // Refresh only the shared years cache; year-scoped dashboards refetch via their own query keys.
    await queryClient.invalidateQueries({ queryKey: ['years'], exact: true });
  };

  const handleArchiveClick = (year: string) => {
    setError('');
    setSuccess('');

    if (selectedYear === year) {
      setError('Please select a different year in topbar before archiving this batch.');
      return;
    }

    setArchivingYear(year);
  };

  const confirmArchive = async () => {
    if (!archivingYear) return;
    const year = archivingYear;

    await archiveYear(year);

    // Remove from compareYears if it's there
    if (compareYears.includes(year)) {
      setCompareYears(compareYears.filter((y) => y !== year));
    }

    // Refresh only the shared years cache; current dashboards will react to the store update.
    await queryClient.invalidateQueries({ queryKey: ['years'], exact: true });

    setArchivingYear(null);
    setSuccess(`${year} batch archived successfully. Historical records remain fully available for future restoration.`);
  };

  const handleRestore = async (year: string) => {
    setError('');
    setSuccess('');

    await restoreYear(year);

    // Refresh only the shared years cache; current dashboards will react to the store update.
    await queryClient.invalidateQueries({ queryKey: ['years'], exact: true });

    setSuccess(`${year} batch restored successfully! It has returned to active dropdowns and charts.`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd();
  };

  const currentYear = new Date().getFullYear();
  const suggestedYear = String(Math.max(...years.map(Number), currentYear) + 1);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Batch Year Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage active academic batch years and archive historical records
            </p>
          </div>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Add New Batch Year & Archived Batches ─────────────────────────── */}
        <div className="space-y-6">
          
          {/* Add Year Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <PlusCircle className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-800">Add New Batch Year</h2>
            </div>

            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Academic Year
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(''); setSuccess(''); }}
                onKeyDown={handleKeyDown}
                placeholder={`e.g. ${suggestedYear}`}
                maxLength={4}
                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-800 tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
              />
              <button
                onClick={handleAdd}
                disabled={isAdding}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4" />
                )}
                {isAdding ? 'Adding…' : 'Add Batch'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {success}
              </div>
            )}

            {/* Quick Fill Suggestions */}
            <div className="mt-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Add</p>
              <div className="flex flex-wrap gap-2">
                {[currentYear + 1, currentYear + 2, currentYear + 3].map((yr) => {
                  const y = String(yr);
                  const exists = years.includes(y);
                  return (
                    <button
                      key={y}
                      disabled={exists}
                      onClick={() => { setInput(y); setError(''); setSuccess(''); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        exists
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      {y} {exists ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Archived Batches Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Archive className="h-5 w-5 text-slate-500" />
              <h2 className="text-base font-bold text-slate-800">Archived Batch Years</h2>
            </div>

            {!archivedYears || archivedYears.length === 0 ? (
              <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Archive className="h-7 w-7 mx-auto mb-2 opacity-30 text-slate-500" />
                <p className="text-xs font-semibold">No archived batches found.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Active years can be archived in the right panel.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {archivedYears.map((year) => (
                  <div
                    key={year}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold bg-slate-200 text-slate-600">
                        {year.slice(2)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{year} Batch</p>
                        <span className="text-[9px] font-extrabold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full uppercase">
                          Archived
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestore(year)}
                      className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50/20 hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Active Batch Years ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-800">Active Batch Years</h2>
            </div>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {years.length} active
            </span>
          </div>

          {years.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No batch years configured yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {years.map((year) => {
                const isSelected = selectedYear === year;
                const isLatest = year === years[0];

                return (
                  <div
                    key={year}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {year.slice(2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{year} Batch</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isLatest && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                              Latest
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                              Active View
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isSelected && (
                        <button
                          onClick={() => setSelectedYear(year)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-100 transition-all cursor-pointer"
                        >
                          View
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleArchiveClick(year)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                        title={`Archive ${year} batch`}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── What Changes When a Year is Added ──────────────────────────────── */}
      <div className="mt-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-violet-400" />
          <h2 className="text-base font-bold">What Updates Automatically</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: '📊', title: 'Multi-Year Bar Chart', desc: 'New bar added for the active batch year' },
            { icon: '📈', title: 'Growth Line Chart', desc: 'New data point appears on each department line' },
            { icon: '🎯', title: 'Batch Dropdown', desc: 'Active years appear in dropdowns instantly' },
            { icon: '📋', title: 'Stat Cards', desc: 'Active dashboards query real-time database state' },
            { icon: '📥', title: 'Excel Export', desc: 'New year column added to exported reports' },
            { icon: '📦', title: 'State Restoration', desc: 'Archived years hide and preserve underlying historical data' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-xs font-bold text-slate-200">{item.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-slate-400">
          <Database className="h-3.5 w-3.5" />
          <span>
            MongoDB + Express backend ready? Decoupled routing consumes API endpoints directly via{' '}
            <code className="text-violet-300">GET/POST /api/years</code>.
          </span>
        </div>
      </div>

      {/* ── Confirmation Archive Modal ────────────────────────────────────── */}
      {archivingYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Archive {archivingYear} Batch Year?
            </h3>
            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
              Archiving this batch will hide it from active dropdowns, filters, and dashboards. 
              <strong> Historical placement records remain safe</strong> and can be fully restored at any time.
            </p>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setArchivingYear(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/10 cursor-pointer"
              >
                Archive Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
