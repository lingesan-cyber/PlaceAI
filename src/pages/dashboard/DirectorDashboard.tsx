import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDirectorData, useDirectorYearlyAnalysis } from '../../hooks/useDirectorData';
import { 
  Award, 
  Coins, 
  TrendingUp, 
  ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';

export const DirectorDashboard: React.FC = () => {
  const { selectedYear } = useAuthStore();
  const { data: statsData, isLoading: isLoadingStats, error: errorStats } = useDirectorData(selectedYear);
  const { data: yearlyData, isLoading: isLoadingYearly, error: errorYearly } = useDirectorYearlyAnalysis(selectedYear);

  const isLoading = isLoadingStats || isLoadingYearly;
  const isError = errorStats || errorYearly || !statsData || !yearlyData;

  const deptKeys = React.useMemo(() => {
    if (!yearlyData || yearlyData.length === 0) return [];
    const keys = new Set<string>();
    yearlyData.forEach((row: any) => {
      Object.keys(row).forEach((k) => {
        if (k !== 'year') {
          keys.add(k);
        }
      });
    });
    return Array.from(keys);
  }, [yearlyData]);

  const yearText = React.useMemo(() => {
    if (!yearlyData || yearlyData.length === 0) return '';
    const years = yearlyData.map((d: any) => d.year).sort();
    if (years.length <= 1) return years[0] || '';
    return `${years.slice(0, -1).join(', ')} and ${years[years.length - 1]}`;
  }, [yearlyData]);

  const colors = [
    '#1E40AF', // blue-800
    '#3B82F6', // blue-500
    '#7C3AED', // violet-600
    '#A78BFA', // violet-300
    '#F59E0B', // amber-500
    '#10B981', // emerald-500
    '#EC4899', // pink-500
    '#64748B', // slate-500
  ];



  // Computed Department Rankings
  const rankedDepts = React.useMemo(() => {
    if (!statsData) return [];
    
    // Map of name -> average package
    const pkgMap: Record<string, number> = {};
    statsData.deptPackages.forEach((p: any) => {
      pkgMap[p.name] = p.avgPkg;
    });

    const depts = statsData.deptPerformance.map((d: any) => {
      return {
        name: d.department,
        code: d.department,
        percentage: d.percentage,
        placed: d.placed,
        total: d.total,
        avgPkg: `${pkgMap[d.department] || 0} LPA`,
        highestPkg: d.highestPackage || '0.0 LPA',
        topCompany: d.topCompany
      };
    });

    // Sort descending by placement percentage
    return depts.sort((a, b) => b.percentage - a.percentage);
  }, [statsData]);

  // Loading skeleton block
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/4 bg-slate-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>
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
  if (isError) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl max-w-xl mx-auto mt-20">
        <h2 className="text-rose-800 font-extrabold text-lg">Error Loading Director Dashboard</h2>
        <p className="text-rose-600 text-sm mt-2">Could not retrieve stats records. Please try reloading or check network connectivity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Director's Strategic Workspace</h1>
        <p className="text-slate-500 text-sm">High-level institutional statistics, YoY departmental analysis, and placement success trends.</p>
      </div>

      {/* B) Package Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Highest Package */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Highest Package</p>
            <h3 className="text-2xl font-black text-slate-800 mt-2">{statsData.packages.highest}</h3>
            <span className="text-xs text-rose-600 font-semibold flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>International offer</span>
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Award className="h-6 w-6" />
          </div>
        </div>

        {/* Average Package */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Package</p>
            <h3 className="text-2xl font-black text-slate-800 mt-2">{statsData.packages.average}</h3>
            <span className="text-xs text-blue-600 font-semibold flex items-center gap-0.5 mt-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+8.2% YoY growth</span>
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Coins className="h-6 w-6" />
          </div>
        </div>

        {/* Median Package */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Median Package</p>
            <h3 className="text-2xl font-black text-slate-800 mt-2">{statsData.packages.median}</h3>
            <span className="text-xs text-slate-400 mt-1 block">50th percentile offer</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* C) Department Performance Rankings Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="border-b border-slate-100 pb-3 mb-5">
          <h3 className="text-base font-extrabold text-slate-800">Top Performing Departments</h3>
          <p className="text-slate-400 text-xs mt-0.5">Top performing academic branches ranked by placement rates and package metrics.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {rankedDepts.map((dept, index) => {
            const rank = index + 1;
            let rankBadgeColor = "bg-slate-100 text-slate-700 border-slate-200";
            if (rank === 1) rankBadgeColor = "bg-amber-100 text-amber-800 border-amber-200";
            else if (rank === 2) rankBadgeColor = "bg-slate-200 text-slate-800 border-slate-300";
            else if (rank === 3) rankBadgeColor = "bg-amber-50 text-amber-700 border-amber-100";

            return (
              <div
                key={dept.code}
                className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <span className={`inline-flex items-center justify-center h-6 w-12 rounded text-[10px] font-black uppercase border ${rankBadgeColor}`}>
                      Rank {rank}
                    </span>
                    <span className="text-[10px] font-bold text-slate-450 uppercase">{dept.code}</span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Placement Rate</p>
                    <div className="flex items-baseline gap-1.5">
                      <h4 className="text-2xl font-black text-slate-850 tracking-tighter">{dept.percentage}%</h4>
                    </div>
                    {/* Tiny Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full rounded-full ${
                          dept.percentage >= 90 ? 'bg-emerald-500' :
                          dept.percentage >= 80 ? 'bg-blue-500' :
                          dept.percentage >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${dept.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[10px] uppercase">Highest Package</span>
                      <span className="text-slate-800 font-extrabold">{dept.highestPkg}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[10px] uppercase">Average Package</span>
                      <span className="text-slate-850 font-bold">{dept.avgPkg}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                  <span>Placed: {dept.placed}/{dept.total}</span>
                  <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-black max-w-[80px] truncate" title={`Top company: ${dept.topCompany}`}>
                    {dept.topCompany}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Section 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* A) Multi-Year Placement Analysis — Stacked Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-slate-800">Multi-Year Placements Overview</h3>
            <p className="text-slate-400 text-xs">Stacked bar analysis representing department success aggregates across {yearText || 'all academic years'}.</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {deptKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="a"
                    fill={colors[index % colors.length]}
                    name={key}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* B) Average Packages Comparative Chart — Horizontal Bar Layout */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Avg Package by Department</h3>
            <p className="text-slate-400 text-xs">Horizontal comparative metrics representing LPA packages.</p>
          </div>
          <div className="h-[280px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData.deptPackages} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip formatter={(value) => `${value} LPA`} />
                <Bar dataKey="avgPkg" fill="#7C3AED" name="Avg Package (LPA)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 2: Table & Recruiter Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* C) Department Performance Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-base font-extrabold text-slate-800">Departmental Selection Highlights</h3>
            <p className="text-slate-400 text-xs">Comparing placement percentages and top hiring offers by department.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider">
                  <th className="px-6 py-3 font-bold">Department</th>
                  <th className="px-6 py-3 font-bold">Placed</th>
                  <th className="px-6 py-3 font-bold">Total</th>
                  <th className="px-6 py-3 font-bold">Placement Rate</th>
                  <th className="px-6 py-3 font-bold">Top Placement offer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {statsData.deptPerformance.map((dept: any, index: number) => {
                  const rate = dept.percentage;
                  // Color coding: green >= 85%, blue 70%-85%, red < 70%
                  const badgeClass = 
                    rate >= 85 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : rate >= 70 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200';

                  return (
                    <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{dept.department}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{dept.placed}</td>
                      <td className="px-6 py-4 text-slate-500">{dept.total}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
                          {rate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2 mt-1 border-0">
                        {dept.topCompany ? (
                          dept.topCompany.includes(' (') ? (
                            <>
                              <span className="font-bold text-slate-800">{dept.topCompany.split(' (')[0]}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">({dept.topCompany.split(' (')[1].replace(')', '')})</span>
                            </>
                          ) : (
                            <span className="font-bold text-slate-800">{dept.topCompany}</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* D) Hiring Analytics — Top 10 Recruiters horizontal bar chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Top 10 Recruiter Rankings</h3>
            <p className="text-slate-400 text-xs">Total number of students hired by corporate partners.</p>
          </div>
          <div className="h-[280px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData.topHiring} layout="vertical" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip formatter={(value) => `${value} Students`} />
                <Bar dataKey="selections" fill="#1E40AF" name="Selections" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
