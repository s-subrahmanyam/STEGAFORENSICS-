import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { AnalysisResult } from '@/lib/steganography';

interface HistoryEntry {
  id: string;
  timestamp: string;
  result: AnalysisResult;
}

const STORAGE_KEY = 'stegaforensics_history';

export function saveToHistory(result: AnalysisResult) {
  const history = getHistory();
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    result,
  };
  history.unshift(entry);
  // Keep last 20
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
}

export function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

const riskColors: Record<string, string> = {
  low: 'text-green-400',
  moderate: 'text-yellow-400',
  high: 'text-red-400',
};

const riskBgColors: Record<string, string> = {
  low: 'bg-green-500/10 border-green-500/20',
  moderate: 'bg-yellow-500/10 border-yellow-500/20',
  high: 'bg-red-500/10 border-red-500/20',
};

const AnalysisHistory = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setHistory(getHistory());
    const interval = setInterval(() => setHistory(getHistory()), 2000);
    return () => clearInterval(interval);
  }, []);

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  if (history.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <History className="h-16 w-16 mx-auto text-primary/15 mb-4" />
        <p className="text-muted-foreground font-mono text-sm">No analysis history yet</p>
        <p className="text-xs text-muted-foreground mt-1">Completed scans will appear here</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">
          {history.length} scan(s) saved
        </span>
        <button
          onClick={handleClear}
          className="flex items-center gap-1 text-xs text-destructive/70 hover:text-destructive transition-colors font-mono"
        >
          <Trash2 className="h-3 w-3" />
          Clear All
        </button>
      </div>

      <div className="space-y-2">
        {history.map((entry) => {
          const r = entry.result;
          const isExpanded = expandedId === entry.id;
          return (
            <motion.div
              key={entry.id}
              layout
              className={`rounded-xl border bg-card overflow-hidden transition-colors ${riskBgColors[r.riskLevel]}`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-foreground truncate">{r.metadata.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-bold font-mono ${riskColors[r.riskLevel]}`}>
                    {r.overallRisk}%
                  </p>
                  <p className={`text-[10px] font-mono uppercase ${riskColors[r.riskLevel]}`}>
                    {r.riskLevel}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { label: 'LSB', value: r.lsbScore },
                          { label: 'Hist', value: r.histogramScore },
                          { label: 'Noise', value: r.noiseScore },
                          { label: 'Pixel', value: r.pixelAnomalyScore },
                          { label: 'Comp', value: r.compressionScore },
                        ].map(s => (
                          <div key={s.label} className="text-center">
                            <p className="text-xs text-muted-foreground font-mono">{s.label}</p>
                            <p className="text-sm font-bold font-mono text-foreground">{s.value}%</p>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono space-y-1">
                        <p>Dimensions: {r.metadata.width}×{r.metadata.height}</p>
                        <p>Size: {(r.metadata.fileSize / 1024).toFixed(1)} KB</p>
                        <p className="truncate">SHA-256: {r.sha256.substring(0, 32)}...</p>
                        <p className="italic">{r.riskVerdict}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AnalysisHistory;
