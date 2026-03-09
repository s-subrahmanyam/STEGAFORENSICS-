import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Play, Loader2, ShieldCheck, AlertTriangle, ShieldAlert, Eye, ChevronDown, FileDown, ArrowLeftRight } from 'lucide-react';
import ComparisonView from '@/components/ComparisonView';
import { analyzeImage, type AnalysisResult } from '@/lib/steganography';
import RiskGauge from '@/components/RiskGauge';
import DetectionScores from '@/components/DetectionScores';
import HistogramChart from '@/components/HistogramChart';
import SuspiciousRegions from '@/components/SuspiciousRegions';
import EvidenceInfo from '@/components/EvidenceInfo';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import { generateForensicReport } from '@/lib/reportGenerator';

export interface BatchEntry {
  id: string;
  file: File;
  imageUrl: string;
  result: AnalysisResult | null;
  status: 'pending' | 'analyzing' | 'done' | 'error';
}

interface BatchAnalysisProps {
  onBatchComplete: (results: BatchEntry[]) => void;
}

const BatchAnalysis = ({ onBatchComplete }: BatchAnalysisProps) => {
  const [entries, setEntries] = useState<BatchEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newEntries: BatchEntry[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        imageUrl: URL.createObjectURL(file),
        result: null,
        status: 'pending' as const,
      }));
    setEntries(prev => [...prev, ...newEntries]);
  }, []);

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const runBatch = async () => {
    setIsRunning(true);
    const updated = [...entries];

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status !== 'pending') continue;
      updated[i] = { ...updated[i], status: 'analyzing' };
      setEntries([...updated]);

      try {
        const result = await analyzeImage(updated[i].file);
        updated[i] = { ...updated[i], status: 'done', result };
      } catch {
        updated[i] = { ...updated[i], status: 'error' };
      }
      setEntries([...updated]);
    }

    setIsRunning(false);
    onBatchComplete(updated.filter(e => e.result !== null));
  };

  const getRiskIcon = (level?: string) => {
    if (level === 'low') return <ShieldCheck className="h-4 w-4 text-success" />;
    if (level === 'moderate') return <AlertTriangle className="h-4 w-4 text-warning" />;
    if (level === 'high') return <ShieldAlert className="h-4 w-4 text-destructive" />;
    return null;
  };

  const getRiskBadge = (level?: string) => {
    if (!level) return null;
    const cls = level === 'low' ? 'bg-success/15 text-success border-success/30'
      : level === 'moderate' ? 'bg-warning/15 text-warning border-warning/30'
      : 'bg-destructive/15 text-destructive border-destructive/30';
    return (
      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${cls} uppercase`}>
        {level}
      </span>
    );
  };

  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const doneCount = entries.filter(e => e.status === 'done').length;
  const selectedEntry = entries.find(e => e.id === selectedId);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 card-elevated space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs text-muted-foreground tracking-[0.2em] uppercase">
            Batch Analysis
          </h3>
          <span className="text-xs text-muted-foreground font-mono">
            {doneCount}/{entries.length} analyzed
          </span>
        </div>

        {/* Drop zone */}
        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/40 transition-colors">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Add multiple images</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>

        {/* Image thumbnails */}
        {entries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <AnimatePresence>
              {entries.map(entry => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => entry.result && setSelectedId(entry.id === selectedId ? null : entry.id)}
                  className={`relative group rounded-xl overflow-hidden border bg-secondary/30 transition-all cursor-pointer ${
                    entry.id === selectedId ? 'border-primary cyber-glow' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <img
                    src={entry.imageUrl}
                    alt={entry.file.name}
                    className="w-full h-24 object-cover"
                  />
                  <div className="p-2 space-y-1">
                    <p className="text-[10px] font-mono text-foreground truncate">{entry.file.name}</p>
                    <div className="flex items-center justify-between">
                      {entry.status === 'analyzing' && (
                        <Loader2 className="h-3 w-3 text-primary animate-spin" />
                      )}
                      {entry.status === 'done' && entry.result && (
                        <div className="flex items-center gap-1">
                          {getRiskIcon(entry.result.riskLevel)}
                          <span className="text-[10px] font-mono font-bold">{entry.result.overallRisk}%</span>
                        </div>
                      )}
                      {entry.status === 'pending' && (
                        <span className="text-[10px] text-muted-foreground font-mono">Pending</span>
                      )}
                      {entry.status === 'error' && (
                        <span className="text-[10px] text-destructive font-mono">Failed</span>
                      )}
                      {entry.status === 'done' && (
                        <Eye className="h-3 w-3 text-primary" />
                      )}
                    </div>
                  </div>
                  {!isRunning && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeEntry(entry.id); }}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-foreground" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Run button */}
        {pendingCount > 0 && (
          <button
            onClick={runBatch}
            disabled={isRunning}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-cyber text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {isRunning ? 'Analyzing...' : `Analyze ${pendingCount} image${pendingCount > 1 ? 's' : ''}`}
          </button>
        )}

        {/* Comparison & Table */}
        {doneCount > 0 && (
          <div className="space-y-4">
            {doneCount >= 2 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setShowComparison(!showComparison); setSelectedId(null); }}
                className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  showComparison
                    ? 'bg-primary/10 border-2 border-primary text-primary cyber-glow'
                    : 'gradient-cyber text-primary-foreground hover:opacity-90'
                }`}
              >
                <ArrowLeftRight className="h-4 w-4" />
                {showComparison ? 'Close Comparison Mode' : `Compare ${doneCount} Images Side-by-Side`}
              </motion.button>
            )}

            {!showComparison && (
              <div className="overflow-x-auto">
                <h4 className="font-mono text-xs text-muted-foreground tracking-[0.2em] uppercase mb-3">
                  {doneCount > 1 ? 'Comparison Table' : 'Results'} — Click a row to view full dashboard
                </h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted-foreground font-mono font-medium">Image</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-mono font-medium">Risk</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-mono font-medium">LSB</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-mono font-medium">Hist</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-mono font-medium">Noise</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-mono font-medium">Pixel</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-mono font-medium">Comp</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-mono font-medium">Level</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-mono font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.filter(e => e.result).map(entry => (
                      <tr
                        key={entry.id}
                        onClick={() => setSelectedId(entry.id === selectedId ? null : entry.id)}
                        className={`border-b border-border/50 cursor-pointer transition-colors ${
                          entry.id === selectedId ? 'bg-primary/5' : 'hover:bg-secondary/30'
                        }`}
                      >
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <img src={entry.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                            <span className="font-mono text-foreground truncate max-w-[100px]">{entry.file.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-2 px-2 font-mono font-bold text-foreground">{entry.result!.overallRisk}%</td>
                        <td className="text-center py-2 px-2 font-mono text-muted-foreground">{entry.result!.lsbScore}%</td>
                        <td className="text-center py-2 px-2 font-mono text-muted-foreground">{entry.result!.histogramScore}%</td>
                        <td className="text-center py-2 px-2 font-mono text-muted-foreground">{entry.result!.noiseScore}%</td>
                        <td className="text-center py-2 px-2 font-mono text-muted-foreground">{entry.result!.pixelAnomalyScore}%</td>
                        <td className="text-center py-2 px-2 font-mono text-muted-foreground">{entry.result!.compressionScore}%</td>
                        <td className="text-center py-2 px-2">{getRiskBadge(entry.result!.riskLevel)}</td>
                        <td className="text-center py-2 px-2">
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${entry.id === selectedId ? 'rotate-180' : ''}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Comparison View */}
      <AnimatePresence>
        {showComparison && doneCount >= 2 && (
          <ComparisonView entries={entries} onClose={() => setShowComparison(false)} />
        )}
      </AnimatePresence>

      {/* Full Dashboard for Selected Image */}
      <AnimatePresence>
        {selectedEntry && selectedEntry.result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 overflow-hidden"
          >
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-mono text-muted-foreground tracking-[0.3em] uppercase">
                Detailed Results — {selectedEntry.file.name}
              </span>
              <div className="h-px flex-1 bg-border" />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => generateForensicReport(selectedEntry.result!, [])}
                className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-cyber text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <FileDown className="h-4 w-4" />
                PDF Report
              </motion.button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <RiskGauge risk={selectedEntry.result.overallRisk} level={selectedEntry.result.riskLevel} />
              <DetectionScores result={selectedEntry.result} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <HistogramChart histogram={selectedEntry.result.histogram} />
              <SuspiciousRegions imageUrl={selectedEntry.imageUrl} regions={selectedEntry.result.suspiciousRegions} />
            </div>

            <BeforeAfterSlider imageUrl={selectedEntry.imageUrl} regions={selectedEntry.result.suspiciousRegions} />

            <div className="grid md:grid-cols-1 gap-6">
              <EvidenceInfo metadata={selectedEntry.result.metadata} sha256={selectedEntry.result.sha256} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BatchAnalysis;
