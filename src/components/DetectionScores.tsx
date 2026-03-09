import { motion } from 'framer-motion';
import { useState } from 'react';
import type { AnalysisResult } from '@/lib/steganography';
import { ShieldCheck, AlertTriangle, ShieldAlert, Binary, BarChart3, Radio, Grid3X3, Archive, ChevronRight } from 'lucide-react';

const DetectionScores = ({ result }: { result: AnalysisResult }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const scores = [
    {
      label: 'LSB Pattern',
      value: result.lsbScore,
      desc: 'Least Significant Bit analysis — detects hidden data in pixel bit planes',
      icon: Binary,
      detail: result.lsbScore > 50 ? 'Sequential header signature detected' : 'No suspicious bit patterns found',
    },
    {
      label: 'Histogram',
      value: result.histogramScore,
      desc: 'Color distribution anomalies — checks for unnatural even/odd pair convergence',
      icon: BarChart3,
      detail: result.histogramScore > 40 ? 'Histogram comb pattern detected' : 'Natural color distribution',
    },
    {
      label: 'Noise Level',
      value: result.noiseScore,
      desc: 'Statistical noise uniformity — steganography creates unnaturally uniform noise',
      icon: Radio,
      detail: result.noiseScore > 30 ? 'Anomalous noise uniformity detected' : 'Normal noise distribution',
    },
    {
      label: 'Pixel Anomaly',
      value: result.pixelAnomalyScore,
      desc: 'Spatial anomaly detection — scans for blocks with suspicious LSB distributions',
      icon: Grid3X3,
      detail: result.pixelAnomalyScore > 20 ? 'Suspicious pixel blocks found' : 'No spatial anomalies',
    },
    {
      label: 'Compression',
      value: result.compressionScore,
      desc: 'Artifact analysis — checks for inconsistent compression block boundaries',
      icon: Archive,
      detail: result.compressionScore > 20 ? 'Compression anomalies detected' : 'Normal compression profile',
    },
  ];

  const getBarGradient = (val: number) =>
    val < 25 ? 'from-success/80 to-success' :
    val < 50 ? 'from-success/60 to-warning' :
    val < 75 ? 'from-warning to-destructive/80' :
    'from-destructive/80 to-destructive';

  const getStatusColor = (val: number) =>
    val < 25 ? 'text-success' : val < 50 ? 'text-warning' : 'text-destructive';

  const getStatusIcon = (val: number) =>
    val < 25 ? ShieldCheck : val < 50 ? AlertTriangle : ShieldAlert;

  const getStatusBg = (val: number) =>
    val < 25 ? 'bg-success/10 border-success/20' :
    val < 50 ? 'bg-warning/10 border-warning/20' :
    'bg-destructive/10 border-destructive/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80 }}
      className="rounded-2xl border border-border bg-card p-6 card-elevated"
    >
      <h3 className="font-mono text-xs text-muted-foreground mb-6 tracking-[0.2em] uppercase flex items-center gap-2">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        Detection Module Scores
      </h3>

      <div className="space-y-1">
        {scores.map((s, i) => {
          const StatusIcon = getStatusIcon(s.value);
          const isHovered = hoveredIdx === i;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`p-3 rounded-xl transition-all cursor-default ${
                isHovered ? 'bg-secondary/60' : 'hover:bg-secondary/30'
              }`}
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 ${getStatusBg(s.value)}`}>
                  <s.icon className={`h-4 w-4 ${getStatusColor(s.value)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground">{s.label}</span>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-3.5 w-3.5 ${getStatusColor(s.value)}`} />
                      <span className={`text-sm font-mono font-bold ${getStatusColor(s.value)}`}>{s.value}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-secondary overflow-hidden ml-11">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(s.value)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${s.value}%` }}
                  transition={{ duration: 1.2, delay: i * 0.08, ease: 'easeOut' }}
                  style={{
                    boxShadow: s.value > 50 ? `0 0 12px hsl(var(--destructive) / 0.3)` :
                               s.value > 25 ? `0 0 8px hsl(var(--warning) / 0.2)` : 'none',
                  }}
                />
              </div>

              {/* Expandable detail */}
              <motion.div
                initial={false}
                animate={{ height: isHovered ? 'auto' : 0, opacity: isHovered ? 1 : 0 }}
                className="overflow-hidden ml-11"
              >
                <div className="pt-2 flex items-start gap-1.5">
                  <ChevronRight className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
                    <p className={`text-[11px] font-mono mt-1 ${getStatusColor(s.value)}`}>{s.detail}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 pt-4 border-t border-border flex items-center justify-between"
      >
        <span className="text-xs font-mono text-muted-foreground">Combined Risk Score</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {scores.map((s, i) => (
              <div
                key={i}
                className={`w-1.5 h-4 rounded-sm ${
                  s.value < 25 ? 'bg-success/60' : s.value < 50 ? 'bg-warning/60' : 'bg-destructive/60'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-mono font-bold text-foreground">
            {result.overallRisk}%
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DetectionScores;
