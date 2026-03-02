'use client';

import { AnalysisResult } from '@/lib/llm';
import { ArrowLeft, CheckCircle2, AlertTriangle, Tag, ArrowRightLeft } from 'lucide-react';

/* ─── Score Ring ─── */
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size / 2) - 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#1c1c1c" strokeWidth="5" />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

/* ─── Mini Bar ─── */
function MiniBar({ label, value, max = 25 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-zinc-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-zinc-400 w-8 text-right">{value}/{max}</span>
    </div>
  );
}

/* ─── Section ─── */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/40">
        {icon}
        <span className="text-xs font-medium text-zinc-200 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-4 py-3">
        {children}
      </div>
    </div>
  );
}

/* ─── Dashboard ─── */
export function ResultsDashboard({ result, onReset }: { result: AnalysisResult | null; onReset: () => void }) {
  if (!result) return null;

  return (
    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Back */}
      <button onClick={onReset} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors w-fit cursor-pointer mb-1">
        <ArrowLeft className="w-3 h-3" /> New Analysis
      </button>

      {/* Score Overview */}
      <div className="flex items-start gap-5 bg-zinc-900/40 border border-zinc-800/40 rounded-xl p-4">
        <ScoreRing score={result.score} />
        <div className="flex-1 pt-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">ATS Score</p>
          <p className="text-sm text-zinc-200 leading-relaxed">{result.summary}</p>
          <div className="mt-3 flex flex-col gap-1.5">
            <MiniBar label="Keywords" value={result.scoreBreakdown.keywordMatch} />
            <MiniBar label="Formatting" value={result.scoreBreakdown.formatting} />
            <MiniBar label="Experience" value={result.scoreBreakdown.experience} />
            <MiniBar label="Skills" value={result.scoreBreakdown.skills} />
          </div>
        </div>
      </div>

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <Section title="Strengths" icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}>
          <ul className="flex flex-col gap-2">
            {result.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-zinc-300 leading-relaxed">
                <span className="text-emerald-600 mt-0.5 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Improvements */}
      {result.improvements.length > 0 && (
        <Section title="Improvements" icon={<AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />}>
          <ul className="flex flex-col gap-2">
            {result.improvements.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-zinc-300 leading-relaxed">
                <span className="text-yellow-600 mt-0.5 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Missing Keywords */}
      {result.missingKeywords.length > 0 && (
        <Section title="Missing Keywords" icon={<Tag className="w-3.5 h-3.5 text-red-400" />}>
          <div className="flex flex-wrap gap-1.5">
            {result.missingKeywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 bg-red-950/20 border border-red-900/20 rounded-full text-[11px] text-red-400">
                {kw}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Rewrite Suggestions */}
      {result.rewriteSuggestions.length > 0 && (
        <Section title="Rewrites" icon={<ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />}>
          <div className="flex flex-col gap-3">
            {result.rewriteSuggestions.map((s, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                {s.original && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] uppercase text-zinc-600 w-12 shrink-0 pt-0.5">Before</span>
                    <p className="text-xs text-zinc-500 leading-relaxed line-through decoration-zinc-700">{s.original}</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-[10px] uppercase text-emerald-600 w-12 shrink-0 pt-0.5">After</span>
                  <p className="text-xs text-emerald-300/80 leading-relaxed">{s.improved}</p>
                </div>
                {i < result.rewriteSuggestions.length - 1 && <hr className="border-zinc-800/40 mt-1" />}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
