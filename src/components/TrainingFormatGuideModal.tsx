import React, { useState } from 'react';
import { X, Copy, Check, BookOpen, AlertCircle, Info } from 'lucide-react';

interface TrainingFormatGuideModalProps {
  onClose: () => void;
}

// ── Tokenizer (same robust single-pass approach as FormatGuideModal) ──────────
function tokenizeLine(line: string): React.ReactNode[] {
  const TOKEN_RE =
    /("(?:[^"\\]|\\.)*")(\s*:)|:\s*("(?:[^"\\]|\\.)*")|:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|:\s*(true|false|null)|([[\]{},])/g;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(line)) !== null) {
    if (match.index > cursor) nodes.push(line.slice(cursor, match.index));

    if (match[1] !== undefined && match[2] !== undefined) {
      nodes.push(<span key={cursor + 'k'} style={{ color: '#4f46e5', fontWeight: 700 }}>{match[1]}</span>);
      nodes.push(match[2]);
    } else if (match[3] !== undefined) {
      nodes.push(': ');
      nodes.push(<span key={cursor + 's'} style={{ color: '#059669' }}>{match[3]}</span>);
    } else if (match[4] !== undefined) {
      nodes.push(': ');
      nodes.push(<span key={cursor + 'n'} style={{ color: '#2563eb' }}>{match[4]}</span>);
    } else if (match[5] !== undefined) {
      nodes.push(': ');
      nodes.push(<span key={cursor + 'b'} style={{ color: '#d97706' }}>{match[5]}</span>);
    } else if (match[6] !== undefined) {
      nodes.push(<span key={cursor + 'p'} style={{ color: '#94a3b8' }}>{match[6]}</span>);
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < line.length) nodes.push(line.slice(cursor));
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

// ── Example record ────────────────────────────────────────────────────────────
const EXAMPLE = {
  reg_no: "1920100001",
  name: "Harsh Raj",
  department: "CSE",
  aptitude_score: 82,
  coding_score: 91,
  communication_score: 75,
  mock_interview_score: 80,
  attendance: 92
};

// ── Field descriptions ────────────────────────────────────────────────────────
const FIELDS = [
  { key: 'reg_no',               type: 'string',  required: true,  desc: 'Student Register Number' },
  { key: 'name',                 type: 'string',  required: true,  desc: 'Student Full Name' },
  { key: 'department',           type: 'string',  required: true,  desc: 'Student Department (e.g. CSE, IT, ECE)' },
  { key: 'aptitude_score',       type: 'number',  required: false, desc: 'Aptitude test score (0 – 100)' },
  { key: 'coding_score',         type: 'number',  required: false, desc: 'Coding / DSA score (0 – 100)' },
  { key: 'communication_score',  type: 'number',  required: false, desc: 'Communication score (0 – 100)' },
  { key: 'mock_interview_score', type: 'number',  required: false, desc: 'Mock interview rating (0 – 100)' },
  { key: 'attendance',           type: 'number',  required: false, desc: 'Attendance percentage (0 – 100)' },
];

// ── Component ────────────────────────────────────────────────────────────────
export const TrainingFormatGuideModal: React.FC<TrainingFormatGuideModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
    console.log('[TrainingFormatGuideModal] Modal open state: true');
    console.log('[TrainingFormatGuideModal] window.scrollY:', window.scrollY);
    if (containerRef.current) {
      console.log('[TrainingFormatGuideModal] Modal container height:', containerRef.current.offsetHeight);
    }
    const timer = setTimeout(() => {
      if (containerRef.current) {
        console.log('[TrainingFormatGuideModal] Modal container height (after paint):', containerRef.current.offsetHeight);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(EXAMPLE, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4 animate-overlay-fade"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-modal-scale"
        style={{
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <BookOpen className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">Training Evaluations Format Guide</h2>
              <p className="text-[10px] text-slate-400">Reference for building compatible training import files</p>
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
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0 space-y-2.5">
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
          {/* Help note */}
          <p className="text-[10px] text-slate-500 bg-indigo-50/70 border border-indigo-100 rounded-lg px-3 py-2 leading-relaxed flex items-start gap-1.5">
            <Info className="h-3 w-3 text-indigo-500 mt-0.5 flex-shrink-0" />
            <span>
              <span className="font-bold text-indigo-700">Auto-validated import:</span>{' '}
              The importer automatically validates records and stores them in the{' '}
              <span className="font-extrabold text-slate-700">training_details</span> collection.
            </span>
          </p>
        </div>

        {/* ── Scrollable Body ── */}
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto p-6 space-y-5"
          style={{
            overflowY: 'auto',
          }}
        >

          {/* Target collection */}
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target MongoDB Collection</p>
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200">
                🗄️ training_details
              </span>
            </div>
          </div>

          {/* ── JSON Example ── */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 overflow-hidden">
            <div className="px-4 py-2 border-b border-indigo-200 flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">JSON Example (single record)</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700"
              >
                {copied ? (
                  <><Check className="h-3 w-3" /><span>Copied!</span></>
                ) : (
                  <><Copy className="h-3 w-3" /><span>Copy Example</span></>
                )}
              </button>
            </div>
            <div className="p-4 text-slate-700">
              <SyntaxJson obj={EXAMPLE} />
            </div>
          </div>

          {/* ── Field Descriptions ── */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Field Reference</p>
            <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {FIELDS.map(f => (
                <div key={f.key} className="flex items-start gap-3 px-4 py-2.5 bg-white hover:bg-slate-50/50 transition-colors">
                  <code className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                    {f.key}
                  </code>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-slate-600">{f.desc}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                      f.type === 'string'
                        ? 'bg-violet-50 text-violet-700 border-violet-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {f.type}
                    </span>
                    {f.required && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200">
                        required
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Validation Rules ── */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">Validation Rules</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px]">
              {/* Required */}
              <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-3 space-y-1.5">
                <p className="font-extrabold text-rose-700 uppercase tracking-wider text-[9px]">Required Fields</p>
                {['reg_no', 'name', 'department'].map(f => (
                  <div key={f} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                    <code className="text-rose-800 font-bold">{f}</code>
                  </div>
                ))}
              </div>

              {/* Numeric */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-1.5">
                <p className="font-extrabold text-blue-700 uppercase tracking-wider text-[9px]">Numeric Fields</p>
                {['aptitude_score', 'coding_score', 'communication_score', 'mock_interview_score', 'attendance'].map(f => (
                  <div key={f} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <code className="text-blue-800 font-bold">{f}</code>
                  </div>
                ))}
              </div>

              {/* Range */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 space-y-1.5">
                <p className="font-extrabold text-emerald-700 uppercase tracking-wider text-[9px]">Recommended Range</p>
                <div className="flex items-center justify-center mt-4">
                  <span className="text-3xl font-black text-emerald-700 tabular-nums">0</span>
                  <span className="text-sm font-bold text-slate-400 mx-2">–</span>
                  <span className="text-3xl font-black text-emerald-700 tabular-nums">100</span>
                </div>
                <p className="text-[9px] text-emerald-600 text-center font-semibold">All score fields</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
