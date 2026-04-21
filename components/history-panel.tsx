'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, GitCompareArrows, X, Clock, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { fetchHistory, deleteHistoryItem, type HistoryItem } from '@/app/history-actions';
import { AnalysisResult } from '@/lib/llm';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (result: AnalysisResult, filename: string) => void;
  onCompare: (a: { result: AnalysisResult; filename: string; date: string }, b: { result: AnalysisResult; filename: string; date: string }) => void;
  refreshTrigger?: number;
}

export function HistoryPanel({ isOpen, onClose, onSelectItem, onCompare, refreshTrigger }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<number[]>([]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchHistory();
      setHistory(items);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory, refreshTrigger]);

  const handleClose = () => {
    onClose();
    setCompareMode(false);
    setCompareSelection([]);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      setCompareSelection((prev) => prev.filter((sid) => sid !== id));
      toast.success('Analysis removed');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleItemClick = (item: HistoryItem) => {
    if (!item.analysis_json) {
      toast.error('No analysis data', { description: 'This entry was saved before full history support was added.' });
      return;
    }

    if (compareMode) {
      setCompareSelection((prev) => {
        if (prev.includes(item.id)) return prev.filter((id) => id !== item.id);
        if (prev.length >= 2) return [prev[1], item.id];
        return [...prev, item.id];
      });
    } else {
      try {
        const result = JSON.parse(item.analysis_json) as AnalysisResult;
        onSelectItem(result, item.filename);
        handleClose();
      } catch {
        toast.error('Failed to load analysis data');
      }
    }
  };

  const handleCompare = () => {
    if (compareSelection.length !== 2) {
      toast.error('Select exactly 2 items to compare');
      return;
    }
    const itemA = history.find((h) => h.id === compareSelection[0]);
    const itemB = history.find((h) => h.id === compareSelection[1]);
    if (!itemA?.analysis_json || !itemB?.analysis_json) {
      toast.error('Both items must have analysis data');
      return;
    }
    try {
      const resultA = JSON.parse(itemA.analysis_json) as AnalysisResult;
      const resultB = JSON.parse(itemB.analysis_json) as AnalysisResult;
      onCompare(
        { result: resultA, filename: itemA.filename, date: itemA.created_at },
        { result: resultB, filename: itemB.filename, date: itemB.created_at }
      );
      handleClose();
    } catch {
      toast.error('Failed to parse analysis data');
    }
  };

  const scoreColor = (score: number) =>
    score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-yellow-500' : 'text-red-500';
  const scoreBg = (score: number) =>
    score >= 70 ? 'bg-emerald-500/10' : score >= 40 ? 'bg-yellow-500/10' : 'bg-red-500/10';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Analysis History</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">{history.length} {history.length === 1 ? 'analysis' : 'analyses'}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={loadHistory}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
            </button>
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Compare Bar */}
        <div className="px-5 py-2.5 border-b border-border flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareSelection([]);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              compareMode
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <GitCompareArrows className="w-3 h-3" strokeWidth={2} />
            {compareMode ? 'Comparing...' : 'Compare'}
          </button>

          {compareMode && compareSelection.length === 2 && (
            <button
              onClick={handleCompare}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Compare Selected
            </button>
          )}
          {compareMode && compareSelection.length < 2 && (
            <span className="text-[11px] text-muted-foreground">
              Select {2 - compareSelection.length} more
            </span>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
          {loading && history.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" strokeWidth={2} />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <FileText className="w-6 h-6 opacity-30" strokeWidth={1.5} />
              <p className="text-xs">No analyses yet</p>
              <p className="text-[11px] opacity-50">Results will appear here after you analyze a resume</p>
            </div>
          ) : (
            history.map((item) => {
              const isSelected = compareSelection.includes(item.id);
              const hasData = !!item.analysis_json;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  disabled={!hasData && !compareMode}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all duration-150 cursor-pointer group ${
                    isSelected
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-transparent hover:border-border hover:bg-muted/40'
                  } ${!hasData ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {compareMode && (
                        <div
                          className={`w-3.5 h-3.5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/25'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground truncate" title={item.filename}>
                          {item.filename}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-muted-foreground/50" strokeWidth={2} />
                          <span className="text-[10px] text-muted-foreground/60">
                            {new Date(item.created_at).toLocaleDateString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-md ${scoreColor(item.score)} ${scoreBg(item.score)}`}>
                        {item.score}
                      </span>
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-all cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
