'use client';

import { AnalysisResult } from '@/lib/llm';
import { ScoreRing, MiniBar } from './results-dashboard';
import { ArrowLeft, ArrowUp, ArrowDown, Equal, CheckCircle2, AlertTriangle, Tag } from 'lucide-react';

interface ComparisonItem {
  result: AnalysisResult;
  filename: string;
  date: string;
}

interface ComparisonViewProps {
  itemA: ComparisonItem;
  itemB: ComparisonItem;
  onClose: () => void;
}

function DeltaBadge({ a, b }: { a: number; b: number }) {
  const diff = b - a;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
        <Equal className="w-3 h-3" strokeWidth={2} />
        0
      </span>
    );
  }
  const isPositive = diff > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums ${isPositive ? 'text-emerald-500' : 'text-red-400'}`}>
      {isPositive ? (
        <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
      ) : (
        <ArrowDown className="w-3 h-3" strokeWidth={2.5} />
      )}
      {isPositive ? '+' : ''}{diff}
    </span>
  );
}

function CompareSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--surface-card-border)] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--surface-card-border)]">
        {icon}
        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export function ComparisonView({ itemA, itemB, onClose }: ComparisonViewProps) {
  const a = itemA.result;
  const b = itemB.result;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onClose}
          className="print-hidden flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} /> Back
        </button>
        <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider">Comparison</span>
      </div>

      {/* Score Cards Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { item: itemA, result: a, label: 'A' },
          { item: itemB, result: b, label: 'B' },
        ].map(({ item, result, label }) => (
          <div key={label} className="bg-[var(--surface-card)] border border-[var(--surface-card-border)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                {label}
              </span>
              <span className="text-[12px] font-medium text-foreground truncate" title={item.filename}>
                {item.filename}
              </span>
            </div>
            <div className="flex items-start gap-4">
              <ScoreRing score={result.score} size={64} />
              <div className="flex-1 space-y-1.5">
                <MiniBar label="Keywords" value={result.scoreBreakdown.keywordMatch} />
                <MiniBar label="Format" value={result.scoreBreakdown.formatting} />
                <MiniBar label="Experience" value={result.scoreBreakdown.experience} />
                <MiniBar label="Skills" value={result.scoreBreakdown.skills} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-3">
              {new Date(item.date).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>
        ))}
      </div>

      {/* Score Breakdown Comparison */}
      <CompareSection title="Score Breakdown" icon={<ArrowUp className="w-3.5 h-3.5 text-primary" strokeWidth={2} />}>
        <div className="space-y-0">
          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_70px_70px_80px] items-center gap-2 pb-2.5 mb-1 border-b border-[var(--surface-card-border)]">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Metric</span>
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider text-center truncate" title={itemA.filename}>
              {itemA.filename.replace(/\.[^.]+$/, '').slice(0, 8)}
            </span>
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider text-center truncate" title={itemB.filename}>
              {itemB.filename.replace(/\.[^.]+$/, '').slice(0, 8)}
            </span>
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider text-center">Change</span>
          </div>

          {/* Rows */}
          {[
            { label: 'Overall Score', aVal: a.score, bVal: b.score, max: 100 },
            { label: 'Keywords', aVal: a.scoreBreakdown.keywordMatch, bVal: b.scoreBreakdown.keywordMatch, max: 25 },
            { label: 'Formatting', aVal: a.scoreBreakdown.formatting, bVal: b.scoreBreakdown.formatting, max: 25 },
            { label: 'Experience', aVal: a.scoreBreakdown.experience, bVal: b.scoreBreakdown.experience, max: 25 },
            { label: 'Skills', aVal: a.scoreBreakdown.skills, bVal: b.scoreBreakdown.skills, max: 25 },
          ].map(({ label, aVal, bVal, max }, idx) => {
            const diff = bVal - aVal;
            const isPositive = diff > 0;
            const isNegative = diff < 0;
            const isFirst = idx === 0;

            return (
              <div
                key={label}
                className={`grid grid-cols-[1fr_70px_70px_80px] items-center gap-2 py-2.5 ${
                  !isFirst ? 'border-t border-[var(--surface-card-border)]/50' : ''
                } ${isFirst ? 'bg-muted/30 -mx-5 px-5 rounded-lg' : ''}`}
              >
                <span className={`text-[12px] ${isFirst ? 'font-semibold text-foreground' : 'text-foreground/70'}`}>
                  {label}
                </span>
                <span className="text-[12px] tabular-nums text-muted-foreground text-center">
                  {aVal}<span className="text-muted-foreground/30">/{max}</span>
                </span>
                <span className="text-[12px] tabular-nums text-muted-foreground text-center">
                  {bVal}<span className="text-muted-foreground/30">/{max}</span>
                </span>
                <div className="flex justify-center">
                  {diff === 0 ? (
                    <span className="text-[11px] text-muted-foreground/40 tabular-nums">—</span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md ${
                        isPositive
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                          : ''
                      }${
                        isNegative
                          ? 'text-red-600 dark:text-red-400 bg-red-500/10'
                          : ''
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
                      ) : (
                        <ArrowDown className="w-3 h-3" strokeWidth={2.5} />
                      )}
                      {isPositive ? '+' : ''}{diff}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CompareSection>

      {/* Strengths Comparison */}
      {(a.strengths.length > 0 || b.strengths.length > 0) && (
        <CompareSection title="Strengths" icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2} />}>
          <div className="grid grid-cols-2 gap-6">
            {[a, b].map((result, idx) => (
              <div key={idx}>
                <p className="text-[10px] uppercase text-muted-foreground/50 mb-2.5 tracking-wider font-medium">
                  {idx === 0 ? 'Analysis A' : 'Analysis B'}
                </p>
                <ul className="space-y-2">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-foreground/75 leading-relaxed">
                      <span className="text-emerald-500 mt-0.5 shrink-0 text-[10px]">●</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CompareSection>
      )}

      {/* Improvements Comparison */}
      {(a.improvements.length > 0 || b.improvements.length > 0) && (
        <CompareSection title="Improvements" icon={<AlertTriangle className="w-3.5 h-3.5 text-yellow-500" strokeWidth={2} />}>
          <div className="grid grid-cols-2 gap-6">
            {[a, b].map((result, idx) => (
              <div key={idx}>
                <p className="text-[10px] uppercase text-muted-foreground/50 mb-2.5 tracking-wider font-medium">
                  {idx === 0 ? 'Analysis A' : 'Analysis B'}
                </p>
                <ul className="space-y-2">
                  {result.improvements.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-foreground/75 leading-relaxed">
                      <span className="text-yellow-500 mt-0.5 shrink-0 text-[10px]">●</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CompareSection>
      )}

      {/* Missing Keywords Comparison */}
      {(a.missingKeywords.length > 0 || b.missingKeywords.length > 0) && (
        <CompareSection title="Missing Keywords" icon={<Tag className="w-3.5 h-3.5 text-red-400" strokeWidth={2} />}>
          <div className="grid grid-cols-2 gap-6">
            {[a, b].map((result, idx) => (
              <div key={idx}>
                <p className="text-[10px] uppercase text-muted-foreground/50 mb-2.5 tracking-wider font-medium">
                  {idx === 0 ? 'Analysis A' : 'Analysis B'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.missingKeywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 bg-red-500/8 border border-red-500/15 rounded-md text-[10px] text-red-500 dark:text-red-400">
                      {kw}
                    </span>
                  ))}
                  {result.missingKeywords.length === 0 && (
                    <span className="text-[11px] text-muted-foreground/40 italic">None</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CompareSection>
      )}
    </div>
  );
}
