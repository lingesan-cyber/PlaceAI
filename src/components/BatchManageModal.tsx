import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useYearsStore } from '../store/useYearsStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  X,
  PlusCircle,
  Archive,
  CalendarDays,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Settings2,
} from 'lucide-react';

interface BatchManageModalProps {
  onClose: () => void;
}

export const BatchManageModal: React.FC<BatchManageModalProps> = ({ onClose }) => {
  const { years, archivedYears, addYear, archiveYear, restoreYear } = useYearsStore();
  const { selectedYear, setSelectedYear, compareYears, setCompareYears } = useAuthStore();
  const queryClient = useQueryClient();

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [archivingYear, setArchivingYear] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  // ── Add year ────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const trimmed = input.trim();
    setError('');
    setSuccess('');

    if (!trimmed) { setError('Please enter a year.'); return; }
    if (!/^\d{4}$/.test(trimmed)) { setError('Year must be exactly 4 digits (e.g. 2027).'); return; }
    const num = parseInt(trimmed, 10);
    if (num < 2000 || num > 2100) { setError('Year must be between 2000 and 2100.'); return; }
    if (years.includes(trimmed)) { setError(`${trimmed} batch already exists and is active.`); return; }
    if (archivedYears.includes(trimmed)) {
      await handleRestore(trimmed);
      setInput('');
      return;
    }

    setIsAdding(true);
    await new Promise((r) => setTimeout(r, 600));
    await addYear(trimmed);
    setSelectedYear(trimmed);
    setInput('');
    setSuccess(`${trimmed} batch added. Dropdowns and charts will now include ${trimmed}.`);
    setIsAdding(false);
    await queryClient.invalidateQueries({ queryKey: ['years'], exact: true });
  };

  // ── Archive ─────────────────────────────────────────────────────────────────
  const handleArchiveClick = (year: string) => {
    setError(''); setSuccess('');
    if (selectedYear === year) {
      setError('Select a different year in the topbar before archiving this batch.');
      return;
    }
    setArchivingYear(year);
  };

  const confirmArchive = async () => {
    if (!archivingYear) return;
    const year = archivingYear;
    await archiveYear(year);
    if (compareYears.includes(year)) setCompareYears(compareYears.filter((y) => y !== year));
    await queryClient.invalidateQueries({ queryKey: ['years'], exact: true });
    setArchivingYear(null);
    setSuccess(`${year} batch archived. Historical records remain available for restoration.`);
  };

  // ── Restore ─────────────────────────────────────────────────────────────────
  const handleRestore = async (year: string) => {
    setError(''); setSuccess('');
    await restoreYear(year);
    await queryClient.invalidateQueries({ queryKey: ['years'], exact: true });
    setSuccess(`${year} batch restored! It has returned to active dropdowns and charts.`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm animate-overlay-fade"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto animate-modal-scale">

          {/* ── Header ── */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Settings2 className="h-[18px] w-[18px] text-white" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800">Batch Year Management</h2>
                <p className="text-[10px] text-slate-400">Manage active academic years, archive, and restore</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* ── LEFT: Add + Archived ── */}
              <div className="space-y-5">

                {/* Add Year Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <PlusCircle className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Add New Batch Year</h3>
                  </div>

                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Academic Year
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => { setInput(e.target.value); setError(''); setSuccess(''); }}
                      onKeyDown={handleKeyDown}
                      placeholder={`e.g. ${Math.max(...years.map(Number), currentYear) + 1}`}
                      maxLength={4}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 bg-white"
                    />
                    <button
                      onClick={handleAdd}
                      disabled={isAdding}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                      {isAdding ? 'Adding…' : 'Add'}
                    </button>
                  </div>

                  {/* Quick fill */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[currentYear + 1, currentYear + 2, currentYear + 3].map((yr) => {
                      const y = String(yr);
                      const exists = years.includes(y);
                      return (
                        <button
                          key={y}
                          disabled={exists}
                          onClick={() => { setInput(y); setError(''); setSuccess(''); }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
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

                  {/* Feedback */}
                  {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[11px] text-red-700">
                      <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-[11px] text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      {success}
                    </div>
                  )}
                </div>

                {/* Archived Batches */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Archive className="h-4 w-4 text-slate-500" />
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Archived Years</h3>
                    <span className="ml-auto text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                      {archivedYears.length}
                    </span>
                  </div>

                  {!archivedYears || archivedYears.length === 0 ? (
                    <div className="text-center py-5 text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                      <Archive className="h-6 w-6 mx-auto mb-1.5 opacity-30" />
                      <p className="text-[10px] font-semibold">No archived batches</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {archivedYears.map((year) => (
                        <div
                          key={year}
                          className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold bg-slate-200 text-slate-600">
                              {year.slice(2)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">{year} Batch</p>
                              <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase">
                                Archived
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRestore(year)}
                            className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT: Active Years ── */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Active Years</h3>
                  </div>
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {years.length} active
                  </span>
                </div>

                {years.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No batch years configured yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {years.map((year) => {
                      const isSelected = selectedYear === year;
                      const isLatest = year === years[0];
                      return (
                        <div
                          key={year}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {year.slice(2)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{year} Batch</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isLatest && (
                                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                    Latest
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                                    Active View
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!isSelected && (
                              <button
                                onClick={() => setSelectedYear(year)}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold px-2 py-1 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
                              >
                                Set Active
                              </button>
                            )}
                            <button
                              onClick={() => handleArchiveClick(year)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                              title={`Archive ${year} batch`}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Archive Confirmation Sub-Modal ── */}
      {archivingYear && (
        <div className="fixed inset-0 z-[202] flex items-center justify-center p-4 bg-slate-950/50 animate-overlay-fade">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full animate-modal-scale">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Archive {archivingYear} Batch?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              This hides the batch from active dropdowns and dashboards.{' '}
              <strong>Historical records remain safe</strong> and can be restored at any time.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setArchivingYear(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Archive Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
