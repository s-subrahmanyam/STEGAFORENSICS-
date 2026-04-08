import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, ShieldCheck, AlertTriangle, ShieldAlert, X as XIcon, Trophy, ArrowRight, FileDown } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { BatchEntry } from '@/components/BatchAnalysis';
import { generateComparisonReport } from '@/lib/reportGenerator';

interface ComparisonViewProps {
  entries: BatchEntry[];
  onClose: () => void;
}

const COLORS = {
  A: { bg: 'hsl(175 85% 48%)', label: 'Image A', ring: 'ring-primary', border: 'border-primary', text: 'text-primary' },
  B: { bg: 'hsl(280 70% 55%)', label: 'Image B', ring: 'ring-purple-500', border: 'border-purple-500', text: 'text-purple-400' },
};

const ComparisonView = ({ entries, onClose }: ComparisonViewProps) => {
  const analyzed = entries.filter(e => e.result);
  const [leftId, setLeftId] = useState<string>(analyzed[0]?.id || '');
  const [rightId, setRightId] = useState<string>(analyzed[1]?.id || analyzed[0]?.id || '');

  const left = analyzed.find(e => e.id === leftId);
  const right = analyzed.find(e => e.id === rightId);

  const scoreKeys = [
    { key: 'lsbScore', label: 'LSB' },
    { key: 'histogramScore', label: 'Histogram' },
    { key: 'noiseScore', label: 'Noise' },
    { key: 'pixelAnomalyScore', label: 'Pixel Anomaly' },
    { key: 'compressionScore', label: 'Compression' },
  ];

  const radarData = useMemo(() => {
    if (!left?.result || !right?.result) return [];
    return scoreKeys.map(s => ({
      metric: s.label,
      A: (left.result as any)[s.key],
      B: (right.result as any)[s.key],
    }));
  }, [left, right]);

  const getRiskLevel = (level?: string) => {
    if (level === 'low') return { icon: <ShieldCheck className="h-5 w-5 text-success" />, color: 'text-success', bg: 'bg-success/10 border-success/30' };
    if (level === 'moderate') return { icon: <AlertTriangle className="h-5 w-5 text-warning" />, color: 'text-warning', bg: 'bg-warning/10 border-warning/30' };
    return { icon: <ShieldAlert className="h-5 w-5 text-destructive" />, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' };
  };

  const winner = useMemo(() => {
    if (!left?.result || !right?.result) return null;
    if (left.result.overallRisk === right.result.overallRisk) return 'tie';
    return left.result.overallRisk > right.result.overallRisk ? 'A' : 'B';
  }, [left, right]);

  if (analyzed.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="space-y-5"
    >
      {/* ── Step 1: Pick Images ── */}
      <div className="rounded-2xl border border-primary/30 bg-card p-5 card-elevated">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl gradient-cyber flex items-center justify-center">
              <ArrowLeftRight className="h-4 w-4 text-primary-foreground" />
            </div>
            <h3 className="font-mono text-sm font-bold text-foreground tracking-wide uppercase">
              Compare Two Images
            </h3>
          </div>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center hover:bg-destructive/20 transition-colors">
            <XIcon className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
          {/* Image A Selector */}
          <ImageSelector
            label="A"
            color={COLORS.A}
            entries={analyzed}
            selectedId={leftId}
            onSelect={setLeftId}
          />

          <div className="flex items-center justify-center pt-8">
            <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center">
              <span className="text-muted-foreground font-mono text-xs font-bold">VS</span>
            </div>
          </div>

          {/* Image B Selector */}
          <ImageSelector
            label="B"
            color={COLORS.B}
            entries={analyzed}
            selectedId={rightId}
            onSelect={setRightId}
          />
        </div>
      </div>

      {left?.result && right?.result && (
        <>
          {/* ── Step 2: Side-by-Side Overview ── */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
            {/* Image A Card */}
            <ImageCard entry={left} label="A" color={COLORS.A} getRiskLevel={getRiskLevel} scoreKeys={scoreKeys} />

            {/* Center Divider */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-px flex-1 bg-border" />
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              <div className="w-px flex-1 bg-border" />
            </div>

            {/* Image B Card */}
            <ImageCard entry={right} label="B" color={COLORS.B} getRiskLevel={getRiskLevel} scoreKeys={scoreKeys} />
          </div>

          {/* ── Step 3: Score-by-Score Comparison ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border bg-card p-5 card-elevated"
          >
            <h4 className="font-mono text-xs text-muted-foreground tracking-[0.2em] uppercase mb-4">
              Score-by-Score Breakdown
            </h4>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm" style={{ background: COLORS.A.bg }} />
                <span className="text-[11px] font-mono text-foreground truncate max-w-[120px]">A: {left.file.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm" style={{ background: COLORS.B.bg }} />
                <span className="text-[11px] font-mono text-foreground truncate max-w-[120px]">B: {right.file.name}</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Overall Risk row */}
              <ScoreRow
                label="Overall Risk"
                aVal={left.result.overallRisk}
                bVal={right.result.overallRisk}
                highlight
              />
              {scoreKeys.map(s => (
                <ScoreRow
                  key={s.key}
                  label={s.label}
                  aVal={(left.result as any)[s.key]}
                  bVal={(right.result as any)[s.key]}
                />
              ))}
            </div>
          </motion.div>

          {/* ── Step 4: Radar Overlay ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl border border-border bg-card p-5 card-elevated"
          >
            <h4 className="font-mono text-xs text-muted-foreground tracking-[0.2em] uppercase mb-2">
              Forensic Profile Overlay
            </h4>
            <p className="text-[11px] text-muted-foreground mb-4 font-mono">
              Larger area = more suspicious activity detected
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickCount={5} />
                  <Radar name="A" dataKey="A" stroke={COLORS.A.bg} fill={COLORS.A.bg} fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="B" dataKey="B" stroke={COLORS.B.bg} fill={COLORS.B.bg} fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-6 rounded-full" style={{ background: COLORS.A.bg }} />
                <span className="text-[10px] font-mono text-muted-foreground">A</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-6 rounded-full" style={{ background: COLORS.B.bg }} />
                <span className="text-[10px] font-mono text-muted-foreground">B</span>
              </div>
            </div>
          </motion.div>

          {/* ── Step 5: Verdict ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-primary/20 bg-card p-6 card-elevated"
          >
            <h4 className="font-mono text-xs text-muted-foreground tracking-[0.2em] uppercase text-center mb-4">
              Verdict
            </h4>

            <div className="flex items-center justify-center gap-6">
              {/* A */}
              <div className="flex flex-col items-center gap-2 flex-1 max-w-[160px]">
                <div className={`relative rounded-xl overflow-hidden border-2 ${COLORS.A.border}`}>
                  <img src={left.imageUrl} alt="" className="h-20 w-full object-cover" />
                  <div className="absolute top-1 left-1 h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-mono font-black text-primary-foreground" style={{ background: COLORS.A.bg }}>A</div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${getRiskLevel(left.result.riskLevel).bg}`}>
                  {getRiskLevel(left.result.riskLevel).icon}
                  <span className={`text-sm font-mono font-black ${getRiskLevel(left.result.riskLevel).color}`}>
                    {left.result.overallRisk}%
                  </span>
                </div>
              </div>

              {/* VS / Arrow */}
              <div className="flex flex-col items-center gap-1">
                {winner === 'tie' ? (
                  <span className="text-xs font-mono text-muted-foreground font-bold">=</span>
                ) : (
                  <>
                    <Trophy className="h-5 w-5 text-warning" />
                    <ArrowRight className={`h-4 w-4 text-muted-foreground ${winner === 'A' ? 'rotate-180' : ''}`} />
                    <span className="text-[10px] font-mono text-muted-foreground">safer</span>
                  </>
                )}
              </div>

              {/* B */}
              <div className="flex flex-col items-center gap-2 flex-1 max-w-[160px]">
                <div className={`relative rounded-xl overflow-hidden border-2 ${COLORS.B.border}`}>
                  <img src={right.imageUrl} alt="" className="h-20 w-full object-cover" />
                  <div className="absolute top-1 left-1 h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-mono font-black text-white" style={{ background: COLORS.B.bg }}>B</div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${getRiskLevel(right.result.riskLevel).bg}`}>
                  {getRiskLevel(right.result.riskLevel).icon}
                  <span className={`text-sm font-mono font-black ${getRiskLevel(right.result.riskLevel).color}`}>
                    {right.result.overallRisk}%
                  </span>
                </div>
              </div>
            </div>

            {winner && winner !== 'tie' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-xs text-muted-foreground font-mono mt-4 pt-3 border-t border-border"
              >
                <span className="font-bold text-foreground">
                  {winner === 'A' ? left.file.name : right.file.name}
                </span>
                {' '}has{' '}
                <span className="font-bold text-primary">
                  {Math.abs(left.result.overallRisk - right.result.overallRisk)}% higher
                </span>
                {' '}steganographic risk
              </motion.p>
            )}
          </motion.div>

          {/* Download Comparison PDF */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => generateComparisonReport(left.result!, right.result!, left.file.name, right.file.name)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-cyber text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity cyber-glow"
            >
              <FileDown className="h-4 w-4" />
              Download Comparison PDF
            </motion.button>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

/* ── Sub-components ── */

function ImageSelector({ label, color, entries, selectedId, onSelect }: {
  label: string;
  color: typeof COLORS.A;
  entries: BatchEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-mono font-black text-white" style={{ background: color.bg }}>
          {label}
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">Select {color.label}</span>
      </div>
      <div className="space-y-1.5">
        {entries.map(entry => (
          <motion.button
            key={entry.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(entry.id)}
            className={`w-full flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left ${
              entry.id === selectedId
                ? `${color.border} bg-secondary/50`
                : 'border-transparent hover:bg-secondary/30'
            }`}
          >
            <img src={entry.imageUrl} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono text-foreground truncate">{entry.file.name}</p>
              <p className="text-[9px] font-mono text-muted-foreground">{entry.result?.overallRisk}% risk</p>
            </div>
            {entry.id === selectedId && (
              <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: color.bg }} />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ImageCard({ entry, label, color, getRiskLevel, scoreKeys }: {
  entry: BatchEntry;
  label: string;
  color: typeof COLORS.A;
  getRiskLevel: (l?: string) => { icon: JSX.Element; color: string; bg: string };
  scoreKeys: { key: string; label: string }[];
}) {
  const risk = getRiskLevel(entry.result!.riskLevel);
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border bg-card overflow-hidden card-elevated ${color.border}`}
    >
      <div className="relative">
        <img src={entry.imageUrl} alt="" className="w-full h-32 object-cover" />
        <div className="absolute top-2 left-2 h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-mono font-black text-white shadow-lg" style={{ background: color.bg }}>
          {label}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-[11px] font-mono text-foreground font-bold truncate">{entry.file.name}</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Risk badge */}
        <div className={`flex items-center justify-center gap-2 py-2 rounded-lg border ${risk.bg}`}>
          {risk.icon}
          <span className={`text-lg font-mono font-black ${risk.color}`}>{entry.result!.overallRisk}%</span>
          <span className={`text-[10px] font-mono font-bold uppercase ${risk.color}`}>{entry.result!.riskLevel}</span>
        </div>

        {/* Score bars */}
        <div className="space-y-1.5">
          {scoreKeys.map(s => {
            const val = (entry.result as any)[s.key] as number;
            return (
              <div key={s.key} className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-muted-foreground w-16 truncate">{s.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: color.bg }}
                  />
                </div>
                <span className="text-[9px] font-mono font-bold text-foreground w-7 text-right">{val}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function ScoreRow({ label, aVal, bVal, highlight }: { label: string; aVal: number; bVal: number; highlight?: boolean }) {
  const diff = aVal - bVal;
  const maxVal = Math.max(aVal, bVal, 1);

  return (
    <div className={`flex items-center gap-3 ${highlight ? 'py-2 px-3 rounded-lg bg-secondary/30 border border-border' : ''}`}>
      <span className={`text-xs font-mono w-24 flex-shrink-0 ${highlight ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>

      {/* A value + bar */}
      <span className="text-xs font-mono font-bold w-8 text-right" style={{ color: COLORS.A.bg }}>{aVal}%</span>
      <div className="flex-1 flex items-center gap-0.5">
        <div className="flex-1 h-2 rounded-l-full bg-secondary/30 overflow-hidden flex justify-end">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(aVal / maxVal) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-l-full"
            style={{ background: COLORS.A.bg }}
          />
        </div>
        <div className="w-0.5 h-4 bg-border flex-shrink-0" />
        <div className="flex-1 h-2 rounded-r-full bg-secondary/30 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(bVal / maxVal) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-r-full"
            style={{ background: COLORS.B.bg }}
          />
        </div>
      </div>
      <span className="text-xs font-mono font-bold w-8" style={{ color: COLORS.B.bg }}>{bVal}%</span>

      {/* Diff indicator */}
      <span className={`text-[10px] font-mono font-bold w-10 text-right ${
        diff > 0 ? 'text-destructive' : diff < 0 ? 'text-success' : 'text-muted-foreground'
      }`}>
        {diff === 0 ? '=' : (diff > 0 ? `+${diff}` : diff)}
      </span>
    </div>
  );
}

export default ComparisonView;
