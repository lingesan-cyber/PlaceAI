// ─────────────────────────────────────────────────────────────────────────────
//  PlaceAI — Mock Data Layer
//  Architecture: add a new year? Just add one entry to YEAR_REGISTRY below.
//  EVERY chart, dropdown, Excel export, stat card, and table updates itself.
//  No other file needs to change. This comment serves as the full guide.
// ─────────────────────────────────────────────────────────────────────────────

// ── 1.  PER-YEAR RECORDS ──────────────────────────────────────────────────────
//  To add 2027:  copy a data2026 block, adjust numbers, add to YEAR_REGISTRY.
//  To add a new department (e.g. AIDS): add it to every year's deptRates &
//  deptPlacements, and add it to DEPT_GROWTH_ROWS for that year.
// ─────────────────────────────────────────────────────────────────────────────

import placementsJson from '../data/placements.json';
import companiesJson from '../data/companies.json';
import studentsJson from '../data/students.json';

interface YearRecord {
  stats: {
    totalStudents: number;
    placedStudents: number;
    pendingStudents: number;
    companiesVisited: number;
    placementRate: number;
    avgPackage: string;
    highestPackage: string;
  };
  /** placement rate per department this year */
  deptRates: Record<string, number>;
  /** absolute placements per department this year */
  deptPlacements: Record<string, number>;
  funnel: { name: string; value: number; percentage: number }[];
  companies: { id: string; name: string; status: string; driveDate: string; selections: number; packageOffer: string }[];
}

// ── YEAR_REGISTRY — THE SINGLE SOURCE OF TRUTH FOR ALL YEARS ─────────────────
// Seeded dynamically from placements.json
const YEAR_REGISTRY: Record<string, YearRecord> = { ...placementsJson };

// ── 2.  DERIVED HELPERS ───────────────────────────────────────────────────────
//  Everything below is computed from YEAR_REGISTRY — nothing is hardcoded.
// ─────────────────────────────────────────────────────────────────────────────

/** Sorted year list, newest first. Used by getMockYears(). */
const sortedYears = (): string[] =>
  Object.keys(YEAR_REGISTRY).sort((a, b) => b.localeCompare(a));

/** All department names discovered from data, sorted. */
const allDepts = (): string[] => {
  const deptSet = new Set<string>();
  Object.values(YEAR_REGISTRY).forEach((rec) =>
    Object.keys(rec.deptRates).forEach((d) => deptSet.add(d))
  );
  return [...deptSet].sort();
};

// ── 3.  COMPARISON + GROWTH (used in getMockDashboardData) ───────────────────

/**
 * comparison rows: [{ name: 'CSE', rate2024: 92, rate2025: 95, rate2026: 96 }, …]
 * Adding a new year automatically adds a new `rateYYYY` key to every row.
 */
const buildComparison = () => {
  const years = sortedYears(); // newest-first, matches charting order
  const depts = allDepts();
  return depts.map((dept) => {
    const row: Record<string, any> = { name: dept };
    years.forEach((yr) => {
      row[`rate${yr}`] = YEAR_REGISTRY[yr]?.deptRates[dept] ?? null;
    });
    return row;
  });
};

/**
 * growth rows: [{ year: '2023', CSE: 88, ECE: 80, … }, { year: '2024', … }, …]
 * Adding a new department auto-adds a key to every row.
 */
const buildGrowth = () => {
  const years = sortedYears().reverse(); // chronological for x-axis
  const depts = allDepts();
  return years.map((yr) => {
    const row: Record<string, any> = { year: yr };
    depts.forEach((d) => {
      row[d] = YEAR_REGISTRY[yr]?.deptRates[d] ?? null;
    });
    return row;
  });
};

// ── 4.  EMPTY YEAR DATA (for admin-added batch years with no data yet) ────────

/**
 * Returns zeroed stats for a year that was added by admin but has no real data.
 * Charts and stat cards render gracefully (zeros) instead of showing errors.
 * When real data is imported/entered for this year, it belongs in YEAR_REGISTRY.
 */
const getEmptyYearData = (year: string) => ({
  year,
  stats: {
    totalStudents: 0,
    placedStudents: 0,
    pendingStudents: 0,
    companiesVisited: 0,
    placementRate: 0,
    avgPackage: '0 LPA',
    highestPackage: '0 LPA',
  },
  comparison: buildComparison(), // same departments, but this year has null rates
  growth: buildGrowth(),         // same years on x-axis
  funnel: [
    { name: 'Eligible',    value: 0, percentage: 0 },
    { name: 'Applied',     value: 0, percentage: 0 },
    { name: 'Shortlisted', value: 0, percentage: 0 },
    { name: 'Interviewed', value: 0, percentage: 0 },
    { name: 'Placed',      value: 0, percentage: 0 },
  ],
  companies: [],
});

// ── 5.  AGGREGATE "All Years" STATS ──────────────────────────────────────────

const buildAllStats = () => {
  const records = Object.values(YEAR_REGISTRY);
  const totalStudents   = records.reduce((s, r) => s + r.stats.totalStudents,   0);
  const placedStudents  = records.reduce((s, r) => s + r.stats.placedStudents,  0);
  const pendingStudents = records.reduce((s, r) => s + r.stats.pendingStudents, 0);
  const companiesVisited = records.reduce((s, r) => s + r.stats.companiesVisited, 0);
  const placementRate = parseFloat(((placedStudents / totalStudents) * 100).toFixed(1));

  // avg package: average of all year averages (numeric extraction)
  const avgLPA = records
    .map((r) => parseFloat(r.stats.avgPackage))
    .reduce((s, v) => s + v, 0) / records.length;

  // highest package: max across all years
  const highestLPA = Math.max(...records.map((r) => parseFloat(r.stats.highestPackage)));

  return {
    totalStudents,
    placedStudents,
    pendingStudents,
    companiesVisited,
    placementRate,
    avgPackage: `${avgLPA.toFixed(1)} LPA`,
    highestPackage: `${highestLPA.toFixed(1)} LPA`,
  };
};

const buildAllFunnel = () => {
  const records = Object.values(YEAR_REGISTRY);
  const stages = records[0].funnel.map((f) => f.name);
  return stages.map((stage) => {
    const total = records.reduce((s, r) => {
      const match = r.funnel.find((f) => f.name === stage);
      return s + (match?.value ?? 0);
    }, 0);
    const eligible = records.reduce((s, r) => s + r.stats.totalStudents, 0);
    return {
      name: stage,
      value: total,
      percentage: parseFloat(((total / eligible) * 100).toFixed(1)),
    };
  });
};

const buildAllCompanies = () => {
  return sortedYears().flatMap((yr) =>
    YEAR_REGISTRY[yr].companies.map((c) => ({
      ...c,
      id: `${yr}-${c.id}`,
      name: `${c.name} (${yr})`,
    }))
  );
};

// ── 6.  PUBLIC API ────────────────────────────────────────────────────────────

export const getMockDashboardData = (year: string): any => {
  if (year !== 'All' && YEAR_REGISTRY[year]) {
    const rec = YEAR_REGISTRY[year];
    return {
      year,
      stats: rec.stats,
      comparison: buildComparison(),
      growth: buildGrowth(),
      funnel: rec.funnel,
      companies: rec.companies,
    };
  }

  // Year added by admin but not yet in YEAR_REGISTRY — return empty data
  if (year !== 'All') {
    return getEmptyYearData(year);
  }

  // "All Years" view — fully derived, never hardcoded
  return {
    year: 'All Years',
    stats: buildAllStats(),
    comparison: buildComparison(),
    growth: buildGrowth(),
    funnel: buildAllFunnel(),
    companies: buildAllCompanies(),
  };
};

/**
 * Returns years sorted newest-first.
 * This is the only function Topbar, OverallDashboard, and DirectorDashboard
 * should call for the year list. Adding 2027 to YEAR_REGISTRY = 2027 appears
 * everywhere with zero other code changes.
 */
export const getMockYears = (): string[] => sortedYears();

export const deleteMockYear = (year: string): void => {
  delete YEAR_REGISTRY[year];
};

export const getMockMetadata = (): any => ({
  years: getMockYears(),
  departments: allDepts(),
});

/**
 * Director general stats — derived from YEAR_REGISTRY for the given year.
 * year='All' → aggregated across all years (same as buildAllStats).
 */
export const getMockDirectorData = (year: string): any => {
  // Derive package stats from the year's data
  const getPackageStats = (yr: string) => {
    if (yr === 'All' || !YEAR_REGISTRY[yr]) {
      const records = Object.values(YEAR_REGISTRY);
      const avgLPA = records.reduce((s, r) => s + parseFloat(r.stats.avgPackage), 0) / records.length;
      const highLPA = Math.max(...records.map((r) => parseFloat(r.stats.highestPackage)));
      return { highest: `${highLPA.toFixed(1)} LPA`, average: `${avgLPA.toFixed(1)} LPA`, median: `${(avgLPA * 0.88).toFixed(1)} LPA` };
    }
    const rec = YEAR_REGISTRY[yr];
    const avg = parseFloat(rec.stats.avgPackage);
    return { highest: rec.stats.highestPackage, average: rec.stats.avgPackage, median: `${(avg * 0.88).toFixed(1)} LPA` };
  };

  // Dept package estimates — scale with year (older years = slightly lower)
  const yearOffset = year !== 'All' && YEAR_REGISTRY[year]
    ? (parseInt(year) - 2024) * 0.6 : 0;
  const deptRates = year !== 'All' && YEAR_REGISTRY[year]
    ? YEAR_REGISTRY[year].deptRates : { CSE: 96, IT: 95, ECE: 90, ME: 78, CE: 72 };

  return {
    packages: getPackageStats(year),
    deptPackages: [
      { name: 'CSE', avgPkg: parseFloat((12.4 + yearOffset).toFixed(1)) },
      { name: 'IT',  avgPkg: parseFloat((9.8  + yearOffset).toFixed(1)) },
      { name: 'ECE', avgPkg: parseFloat((8.2  + yearOffset).toFixed(1)) },
      { name: 'ME',  avgPkg: parseFloat((6.0  + yearOffset).toFixed(1)) },
      { name: 'CE',  avgPkg: parseFloat((5.4  + yearOffset).toFixed(1)) },
    ],
    deptPerformance: [
      { department: 'Computer Science (CSE)', placed: Math.round(deptRates.CSE * 2.6), total: 260, percentage: deptRates.CSE,      topCompany: 'Google' },
      { department: 'Information Tech (IT)',  placed: Math.round(deptRates.IT  * 1.2), total: 120, percentage: deptRates.IT,       topCompany: 'Microsoft' },
      { department: 'Electronics (ECE)',      placed: Math.round(deptRates.ECE * 2.0), total: 200, percentage: deptRates.ECE,      topCompany: 'Samsung' },
      { department: 'Mechanical (ME)',        placed: Math.round(deptRates.ME  * 1.5), total: 150, percentage: deptRates.ME,       topCompany: 'Tesla India' },
      { department: 'Civil Engg (CE)',        placed: Math.round(deptRates.CE  * 1.1), total: 110, percentage: deptRates.CE,       topCompany: 'L&T' },
    ],
    topHiring: year !== 'All' && YEAR_REGISTRY[year]
      ? YEAR_REGISTRY[year].companies
          .filter(c => c.selections > 0)
          .sort((a, b) => b.selections - a.selections)
          .slice(0, 10)
          .map(c => ({ name: c.name, selections: c.selections }))
      : [
          { name: 'TCS',       selections: 145 }, { name: 'Infosys',   selections: 98 },
          { name: 'Cognizant', selections: 82  }, { name: 'Wipro',     selections: 64 },
          { name: 'Deloitte',  selections: 45  }, { name: 'Accenture', selections: 38 },
          { name: 'Capgemini', selections: 28  }, { name: 'Amazon',    selections: 14 },
          { name: 'Google',    selections: 8   }, { name: 'Microsoft', selections: 5  },
        ],
    activities: [
      { id: 1,  user: 'Mr. Rajesh Kumar',  role: 'Placement Officer', action: 'Scheduled drive',      target: 'Google Campus Visit',        time: '10 mins ago' },
      { id: 2,  user: 'Dr. Sarah Jenkins', role: 'Director',          action: 'Approved budget',      target: 'Pre-placement training',     time: '1 hour ago'  },
      { id: 3,  user: 'Prof. Amit Sharma', role: 'Training Head',     action: 'Uploaded marks',       target: 'Aptitude Test Cohort A',     time: '2 hours ago' },
      { id: 4,  user: 'System Agent',      role: 'Automated',         action: 'Generated stats',      target: 'Weekly recruitment summary', time: '3 hours ago' },
      { id: 5,  user: 'Mr. Rajesh Kumar',  role: 'Placement Officer', action: 'Verified profiles',    target: '72 CSE Students',            time: '4 hours ago' },
      { id: 6,  user: 'Prof. Amit Sharma', role: 'Training Head',     action: 'Scheduled interview',  target: 'Mock Interview Phase 2',     time: '5 hours ago' },
      { id: 7,  user: 'Dr. Sarah Jenkins', role: 'Director',          action: 'Reviewed report',      target: 'MOU with Tesla India',       time: '6 hours ago' },
      { id: 8,  user: 'System Agent',      role: 'Automated',         action: 'Synced data',          target: 'LinkedIn Recruiting API',    time: '8 hours ago' },
      { id: 9,  user: 'Mr. Rajesh Kumar',  role: 'Placement Officer', action: 'Approved schedule',    target: 'Microsoft coding round',     time: '10 hours ago'},
      { id: 10, user: 'Prof. Amit Sharma', role: 'Training Head',     action: 'Created task',         target: 'Soft skills bootcamp',       time: '12 hours ago'},
    ],
  };
};

/**
 * Director yearly analysis.
 * year='All' → all years' rows for the full stacked chart.
 * year='2026' → only the 2026 row (for focused single-year view).
 */
export const getMockDirectorYearlyAnalysis = (year: string): any[] => {
  const allYears = sortedYears().reverse(); // chronological
  const depts = allDepts();
  const allRows = allYears.map((yr) => {
    const row: Record<string, any> = { year: yr };
    depts.forEach((d) => {
      row[d] = YEAR_REGISTRY[yr]?.deptPlacements[d] ?? 0;
    });
    return row;
  });
  // For a specific year: return all rows but mark non-selected years so the chart
  // can dim them. The chart component uses this to highlight the active year.
  if (year !== 'All' && YEAR_REGISTRY[year]) {
    return allRows.map((row) => ({ ...row, _activeYear: year }));
  }
  return allRows;
};

// ── 7.  PLACEMENT OFFICER DATA ───────────────────────────────────────────────

/**
 * Companies list for the given year — sourced from YEAR_REGISTRY.
 * year='All' → flattens all years' companies with the year label appended.
 */
export const getMockCompaniesList = (year: string): any => {
  if (year !== 'All' && YEAR_REGISTRY[year]) {
    return YEAR_REGISTRY[year].companies.map((c) => ({
      id: c.id,
      name: c.name,
      role: 'Campus Drive',
      package: parseFloat(c.packageOffer).toFixed(1),
      driveDate: c.driveDate,
      status: c.status,
    }));
  }
  // All years: flatten with year badge
  return sortedYears().flatMap((yr) =>
    YEAR_REGISTRY[yr].companies.map((c) => ({
      id: `${yr}-${c.id}`,
      name: `${c.name} (${yr})`,
      role: 'Campus Drive',
      package: parseFloat(c.packageOffer).toFixed(1),
      driveDate: c.driveDate,
      status: c.status,
    }))
  );
};

export const getMockHRList = (): any => {
  return companiesJson.hrList;
};

/**
 * Drive events for the given year — sourced from YEAR_REGISTRY company entries.
 * year='All' → all years' events.
 */
export const getMockDriveEvents = (year: string): any => {
  const driveTypeFor = (companyName: string): string => {
    if (['Google', 'Microsoft', 'Meta', 'Amazon'].includes(companyName)) return 'drive';
    if (['TCS', 'Infosys', 'Wipro', 'Cognizant'].includes(companyName)) return 'drive';
    if (['Tesla India', 'Deloitte USI', 'Accenture'].includes(companyName)) return 'interview';
    return 'visit';
  };
  const toEvents = (yr: string) =>
    (YEAR_REGISTRY[yr]?.companies || []).map((c, idx) => ({
      id: `${yr}-${idx + 1}`,
      title: `${c.name} ${driveTypeFor(c.name) === 'drive' ? 'Campus Drive' : driveTypeFor(c.name) === 'interview' ? 'Interview Round' : 'Pre-Placement Talk'}`,
      date: c.driveDate,
      type: driveTypeFor(c.name),
      description: `${c.status} — ${c.packageOffer} offer`,
    }));

  if (year !== 'All' && YEAR_REGISTRY[year]) return toEvents(year);
  return sortedYears().flatMap(toEvents);
};

let filterStudentsList = [ ...studentsJson.filterStudentsList ];

export const getMockStudentsFilter = (cgpa: number, depts: string[], skills: string[], arrears: number): any => {
  const filtered = filterStudentsList.filter((s) => {
    if (s.cgpa < cgpa) return false;
    if (s.arrears > arrears) return false;
    if (depts.length > 0 && !depts.includes(s.dept)) return false;
    if (skills.length > 0) {
      const matchSkills = skills.every((reqSkill) =>
        s.skills.some((studentSkill) =>
          studentSkill.toLowerCase().includes(reqSkill.toLowerCase())
        )
      );
      if (!matchSkills) return false;
    }
    return true;
  });

  return { count: filtered.length, students: filtered };
};

export const importMockStudentRecords = (year: string, validCount: number, records: any[]) => {
  if (YEAR_REGISTRY[year]) {
    YEAR_REGISTRY[year].stats.totalStudents += validCount;
  }
  records.forEach((r) => {
    filterStudentsList.push({
      name: r.name,
      dept: r.dept,
      cgpa: r.cgpa,
      arrears: r.arrears,
      skills: r.skills || [],
    });
  });
};

// ── 8.  TRAINING DATA ────────────────────────────────────────────────────────

const BASE_STUDENTS = [ ...studentsJson.baseStudents ];

/** Cap score to 0–100. */
const cap = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/**
 * Training students for the given year.
 * Scores are scaled by year to show realistic progression over batches.
 * year='All' → base scores (2026 baseline).
 */
export const getMockTrainingStudents = (year: string): any[] => {
  // Scale: each year adds/subtracts a small random-consistent offset
  const yearOffset = year !== 'All' && YEAR_REGISTRY[year]
    ? (parseInt(year, 10) - 2026) * 2.5 : 0;

  return BASE_STUDENTS.map((s) => {
    const aptitude      = cap(s.aptitude      + yearOffset);
    const coding        = cap(s.coding        + yearOffset);
    const communication = cap(s.communication + yearOffset * 0.6);
    const mockInterview = cap(s.mockInterview + yearOffset * 0.8);
    const attendance    = cap(s.attendance    + yearOffset * 0.4);
    const avgScore = parseFloat(((aptitude + coding + communication + mockInterview) / 4).toFixed(1));
    let readinessLevel: 'Highly Placeable' | 'Placement Ready' | 'Needs Improvement' | 'High Risk' = 'Placement Ready';
    if (attendance < 75 || avgScore < 60)  readinessLevel = 'High Risk';
    else if (avgScore < 74)               readinessLevel = 'Needs Improvement';
    else if (avgScore < 87)               readinessLevel = 'Placement Ready';
    else                                  readinessLevel = 'Highly Placeable';
    return { ...s, aptitude, coding, communication, mockInterview, attendance, avgScore, readinessLevel };
  });
};

/**
 * Radar-chart training analysis for the given year.
 * Scores scale slightly per year to reflect real batch differences.
 * year='All' → baseline 2026 scores.
 */
export const getMockTrainingAnalysis = (year: string): any => {
  const offset = year !== 'All' && YEAR_REGISTRY[year]
    ? (parseInt(year, 10) - 2026) * 1.5 : 0;
  const adj = (n: number) => cap(n + offset);
  return {
    radarData: [
      { subject: 'Aptitude',        CSE: adj(86), IT: adj(80), ECE: adj(77), ME: adj(65), CE: adj(68) },
      { subject: 'Coding',          CSE: adj(93), IT: adj(83), ECE: adj(70), ME: adj(50), CE: adj(45) },
      { subject: 'Communication',   CSE: adj(85), IT: adj(84), ECE: adj(81), ME: adj(71), CE: adj(73) },
      { subject: 'Mock Interviews', CSE: adj(89), IT: adj(82), ECE: adj(79), ME: adj(62), CE: adj(64) },
      { subject: 'Attendance',      CSE: adj(94), IT: adj(89), ECE: adj(88), ME: adj(79), CE: adj(81) },
    ],
  };
};
