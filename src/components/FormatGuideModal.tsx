import React, { useState } from 'react';
import { X, Copy, Check, BookOpen } from 'lucide-react';

interface FormatGuideModalProps {
  onClose: () => void;
}

const formats = [
  {
    id: 'student',
    label: 'Student',
    collection: 'students',
    color: 'emerald',
    example: {
      reg_no: "1920100001",
      name: "Harsh Raj",
      department: "CSE",
      section: "A",
      cgpa: 8.5,
      arrears: 0,
      skills: ["Python", "Java", "SQL"]
    }
  },
  {
    id: 'company',
    label: 'Company',
    collection: 'companies',
    color: 'blue',
    example: {
      company_name: "Infosys",
      role: "Systems Engineer",
      package: 6.5,
      drive_date: "2026-07-15",
      status: "Open",
      batch_year: 2026
    }
  },
  {
    id: 'placement',
    label: 'Placement',
    collection: 'placements',
    color: 'violet',
    example: {
      reg_no: "1920100001",
      company: "Infosys",
      role: "Systems Engineer",
      package: 6.5,
      placement_status: "Placed",
      batch_year: 2026
    }
  },
  {
    id: 'hr',
    label: 'HR Contact',
    collection: 'hr_contacts',
    color: 'amber',
    example: {
      company: "Infosys",
      hr_name: "Suresh Raj",
      email: "suresh@infosys.com",
      phone: "9876543210"
    }
  },
  {
    id: 'master',
    label: 'Master Import',
    collection: 'auto-routed',
    color: 'rose',
    example: {
      reg_no: "1920100001",
      name: "Harsh Raj",
      department: "CSE",
      section: "A",
      batch_year: 2026,
      cgpa: 8.5,
      arrears: 0,
      skills: ["Python", "Java", "SQL"],
      company_name: "Infosys",
      role: "Systems Engineer",
      package: 6.5,
      drive_date: "2026-07-15",
      placement_status: "Placed",
      hr_name: "Suresh Raj",
      hr_email: "suresh@infosys.com",
      hr_phone: "9876543210"
    }
  }
];

const colorMap: Record<string, { tab: string; badge: string; copy: string; border: string; bg: string }> = {
  emerald: {
    tab: 'border-emerald-500 text-emerald-700 bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    copy: 'bg-emerald-600 hover:bg-emerald-700',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/30',
  },
  blue: {
    tab: 'border-blue-500 text-blue-700 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700 border border-blue-200',
    copy: 'bg-blue-600 hover:bg-blue-700',
    border: 'border-blue-200',
    bg: 'bg-blue-50/30',
  },
  violet: {
    tab: 'border-violet-500 text-violet-700 bg-violet-50',
    badge: 'bg-violet-100 text-violet-700 border border-violet-200',
    copy: 'bg-violet-600 hover:bg-violet-700',
    border: 'border-violet-200',
    bg: 'bg-violet-50/30',
  },
  amber: {
    tab: 'border-amber-500 text-amber-700 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    copy: 'bg-amber-500 hover:bg-amber-600',
    border: 'border-amber-200',
    bg: 'bg-amber-50/30',
  },
  rose: {
    tab: 'border-rose-500 text-rose-700 bg-rose-50',
    badge: 'bg-rose-100 text-rose-700 border border-rose-200',
    copy: 'bg-rose-600 hover:bg-rose-700',
    border: 'border-rose-200',
    bg: 'bg-rose-50/30',
  },
};

function tokenizeLine(line: string): React.ReactNode[] {
  // Single-pass tokenizer: match key, string-value, number, boolean/null, or plain text
  const TOKEN_RE = /("(?:[^"\\]|\\.)*")(\s*:)|:\s*("(?:[^"\\]|\\.)*")|:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|:\s*(true|false|null)|([[\]{},])/g;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(line)) !== null) {
    // Plain text before this match
    if (match.index > cursor) {
      nodes.push(line.slice(cursor, match.index));
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      // Key: "key":
      nodes.push(<span key={cursor + 'k'} style={{ color: '#7c3aed', fontWeight: 600 }}>{match[1]}</span>);
      nodes.push(match[2]); // ":"
    } else if (match[3] !== undefined) {
      // String value
      nodes.push(': ');
      nodes.push(<span key={cursor + 's'} style={{ color: '#059669' }}>{match[3]}</span>);
    } else if (match[4] !== undefined) {
      // Number value
      nodes.push(': ');
      nodes.push(<span key={cursor + 'n'} style={{ color: '#2563eb' }}>{match[4]}</span>);
    } else if (match[5] !== undefined) {
      // Boolean / null value
      nodes.push(': ');
      nodes.push(<span key={cursor + 'b'} style={{ color: '#d97706' }}>{match[5]}</span>);
    } else if (match[6] !== undefined) {
      // Structural characters [ ] { } , 
      nodes.push(<span key={cursor + 'p'} style={{ color: '#94a3b8' }}>{match[6]}</span>);
    }

    cursor = match.index + match[0].length;
  }

  // Remainder
  if (cursor < line.length) {
    nodes.push(line.slice(cursor));
  }

  return nodes;
}

function SyntaxJson({ obj }: { obj: object }) {
  const lines = JSON.stringify(obj, null, 2).split('\n');
  return (
    <pre className="text-[11px] leading-5 font-mono overflow-x-auto whitespace-pre">
      {lines.map((line, i) => (
        <div key={i}>{tokenizeLine(line)}</div>
      ))}
    </pre>
  );
}


export const FormatGuideModal: React.FC<FormatGuideModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('student');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const current = formats.find(f => f.id === activeTab)!;
  const colors = colorMap[current.color];

  const handleCopy = (id: string, example: object) => {
    navigator.clipboard.writeText(JSON.stringify(example, null, 2)).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4 animate-overlay-fade"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-modal-scale">

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <BookOpen className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">Spreadsheet Format Guide</h2>
              <p className="text-[10px] text-slate-400">Reference for building compatible import files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Supported Formats Banner ── */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Supported File Types</p>
              <div className="flex items-center gap-2">
                {['JSON', 'CSV', 'XLSX'].map(t => (
                  <span key={t} className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="text-emerald-500">✓</span> {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Encoding</p>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 w-fit">
                <span className="text-emerald-500">✓</span> UTF-8
              </span>
            </div>
          </div>
          <p className="mt-2.5 text-[10px] text-slate-500 bg-blue-50/70 border border-blue-100 rounded-lg px-3 py-2 leading-relaxed">
            <span className="font-bold text-blue-700">ℹ️ Auto-routing:</span>{' '}
            The importer automatically detects the record type and routes data to the correct MongoDB collection.
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-100 bg-white overflow-x-auto flex-shrink-0 scrollbar-none">
          {formats.map(f => {
            const isActive = activeTab === f.id;
            const c = colorMap[f.color];
            return (
              <button
                key={f.id}
                onClick={() => setActiveTab(f.id)}
                className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? c.tab + ' border-b-2'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                {f.id === 'master' ? '⭐ ' : ''}{f.label}
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Collection badge + description */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Collection</p>
              <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg ${colors.badge}`}>
                🗄️ {current.collection}
              </span>
            </div>
            {current.id === 'master' && (
              <p className="text-[10px] text-slate-500 max-w-xs text-right leading-relaxed">
                All fields in one row — the importer splits and routes to<br />
                <span className="font-bold text-slate-700">students, companies, placements & hr_contacts</span>
              </p>
            )}
          </div>

          {/* JSON code block */}
          <div className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
            <div className={`px-4 py-2 border-b ${colors.border} flex items-center justify-between`}>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">JSON Example</span>
              <button
                onClick={() => handleCopy(current.id, current.example)}
                className={`flex items-center gap-1.5 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${colors.copy}`}
              >
                {copiedId === current.id ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy Example</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4 text-slate-700">
              <SyntaxJson obj={current.example} />
            </div>
          </div>

          {/* Field descriptions */}
          {current.id === 'master' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">How Smart Routing Works</p>
              <div className="space-y-1.5 text-[10px] text-slate-600">
                {[
                  { badge: 'Students', color: 'emerald', fields: 'reg_no, name, department, section, cgpa, arrears, skills' },
                  { badge: 'Companies', color: 'blue', fields: 'company_name, role, package, drive_date, status, batch_year' },
                  { badge: 'Placements', color: 'violet', fields: 'reg_no, company_name, role, package, placement_status, batch_year' },
                  { badge: 'HR Contacts', color: 'amber', fields: 'company_name, hr_name, hr_email, hr_phone' },
                ].map(item => (
                  <div key={item.badge} className="flex items-start gap-2">
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded flex-shrink-0 ${colorMap[item.color].badge}`}>
                      {item.badge}
                    </span>
                    <span className="text-slate-500 leading-relaxed">{item.fields}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
