'use client';
import { useState, useCallback } from 'react';
import { History } from 'lucide-react';
import { ResumeUploader } from './resume-uploader';
import { ResultsDashboard } from './results-dashboard';
import { HistoryPanel } from './history-panel';
import { ComparisonView } from './comparison-view';
import { ThemeToggle } from './theme-toggle';
import { Logo } from './logo';
import { AnalysisResult } from '@/lib/llm';

export type AnalysisStep = 
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'analyzing'
  | 'done'
  | 'error';

type ViewMode = 'upload' | 'result' | 'compare';

interface ComparisonData {
  a: { result: AnalysisResult; filename: string; date: string };
  b: { result: AnalysisResult; filename: string; date: string };
}

export function MainWorkspace() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [step, setStep] = useState<AnalysisStep>('idle');
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleAnalysisComplete = useCallback((res: AnalysisResult) => {
    setResult(res);
    setStep('done');
    setViewMode('result');
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setStep('idle');
    setViewMode('upload');
    setComparisonData(null);
  }, []);

  const handleSelectHistoryItem = useCallback((historyResult: AnalysisResult) => {
    setResult(historyResult);
    setStep('done');
    setViewMode('result');
    setComparisonData(null);
  }, []);

  const handleCompare = useCallback(
    (
      a: { result: AnalysisResult; filename: string; date: string },
      b: { result: AnalysisResult; filename: string; date: string }
    ) => {
      setComparisonData({ a, b });
      setViewMode('compare');
      setResult(null);
    },
    []
  );

  const handleCloseComparison = useCallback(() => {
    setComparisonData(null);
    setViewMode('upload');
    setResult(null);
    setStep('idle');
  }, []);

  return (
    <div className="w-full">
      {/* ─── Header Bar — same max-w as card content ─── */}
      <div className="max-w-xl mx-auto print-hidden flex items-center justify-between mb-6 pl-1.5">
        {/* Logo */}
        <button
          onClick={handleReset}
          className="flex flex-col justify-center cursor-pointer hover:opacity-80 transition-opacity h-8"
          aria-label="Go to home"
        >
          <Logo height={22} />
        </button>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200 cursor-pointer"
          >
            <History className="w-4 h-4" strokeWidth={1.75} />
            <span>History</span>
          </button>
          <div className="w-px h-4 bg-border/60 mx-1" />
          <ThemeToggle />
        </div>
      </div>

      {/* ─── History Modal ─── */}
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectItem={handleSelectHistoryItem}
        onCompare={handleCompare}
        refreshTrigger={refreshTrigger}
      />

      {/* ─── Content Views ─── */}
      {viewMode === 'upload' && (
        <div className="max-w-xl mx-auto flex items-center justify-center min-h-[55vh]">
          <div className="w-full">
            <ResumeUploader
              onAnalysisComplete={handleAnalysisComplete}
              step={step}
              setStep={setStep}
            />
          </div>
        </div>
      )}

      {viewMode === 'result' && result && (
        <div className="max-w-xl mx-auto">
          <ResultsDashboard result={result} onReset={handleReset} />
        </div>
      )}

      {viewMode === 'compare' && comparisonData && (
        <div className="max-w-4xl mx-auto">
          <ComparisonView
            itemA={comparisonData.a}
            itemB={comparisonData.b}
            onClose={handleCloseComparison}
          />
        </div>
      )}
    </div>
  );
}
