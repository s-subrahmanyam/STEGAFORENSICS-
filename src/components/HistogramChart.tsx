import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
// Note: Don't wrap recharts components in AnimatePresence - they don't support refs
import { motion } from 'framer-motion';
import { BarChart3, Activity, TrendingUp, Layers, Maximize2, Minimize2 } from 'lucide-react';

interface HistogramChartProps {
  histogram: { channel: string; values: number[] }[];
}

const HistogramChart = ({ histogram }: HistogramChartProps) => {
  const [channels, setChannels] = useState({ red: true, green: true, blue: true });
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'area' | 'overlay'>('area');

  const data = Array.from({ length: 64 }, (_, i) => {
    const idx = i * 4;
    return {
      bin: idx,
      red: histogram[0]?.values[idx] ?? 0,
      green: histogram[1]?.values[idx] ?? 0,
      blue: histogram[2]?.values[idx] ?? 0,
    };
  });

  const stats = useMemo(() => {
    const calcStats = (values: number[]) => {
      const filtered = values.filter(v => v > 0);
      if (!filtered.length) return { peak: 0, mean: 0, std: 0 };
      const peak = Math.max(...filtered);
      const mean = filtered.reduce((a, b) => a + b, 0) / filtered.length;
      const std = Math.sqrt(filtered.reduce((s, v) => s + (v - mean) ** 2, 0) / filtered.length);
      return { peak: Math.round(peak), mean: Math.round(mean), std: Math.round(std) };
    };
    return {
      red: calcStats(histogram[0]?.values ?? []),
      green: calcStats(histogram[1]?.values ?? []),
      blue: calcStats(histogram[2]?.values ?? []),
    };
  }, [histogram]);

  const toggleChannel = (ch: 'red' | 'green' | 'blue') =>
    setChannels(prev => ({ ...prev, [ch]: !prev[ch] }));

  const channelConfig = [
    { key: 'red' as const, color: '#ef4444', label: 'Red', icon: '🔴' },
    { key: 'green' as const, color: '#22c55e', label: 'Green', icon: '🟢' },
    { key: 'blue' as const, color: '#3b82f6', label: 'Blue', icon: '🔵' },
  ];

  const chartHeight = expanded ? 320 : 220;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80 }}
      className="rounded-2xl border border-border bg-card p-6 card-elevated relative overflow-hidden"
    >
      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline pointer-events-none opacity-30" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-mono text-xs text-foreground tracking-[0.15em] uppercase font-semibold">
              Color Histogram
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              RGB channel distribution · {data.length} bins
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* View mode toggle */}
          <button
            onClick={() => setViewMode(v => v === 'area' ? 'overlay' : 'area')}
            className="w-8 h-8 rounded-lg border border-border bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            title={viewMode === 'area' ? 'Switch to overlay' : 'Switch to area'}
          >
            <Layers className="h-3.5 w-3.5" />
          </button>
          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-8 h-8 rounded-lg border border-border bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Channel toggles */}
      <div className="flex gap-2 mb-4 relative z-10">
        {channelConfig.map(ch => (
          <motion.button
            key={ch.key}
            onClick={() => toggleChannel(ch.key)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`flex-1 rounded-xl px-3 py-2.5 text-[10px] font-mono font-semibold flex items-center justify-center gap-2 transition-all border ${
              channels[ch.key]
                ? 'border-transparent shadow-sm'
                : 'border-border opacity-40 bg-transparent'
            }`}
            style={{
              backgroundColor: channels[ch.key] ? `${ch.color}15` : 'transparent',
              color: ch.color,
              boxShadow: channels[ch.key] ? `0 0 20px ${ch.color}15` : 'none',
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: ch.color,
                boxShadow: channels[ch.key] ? `0 0 8px ${ch.color}60` : 'none',
              }}
            />
            {ch.label}
            {channels[ch.key] && (
              <span className="text-[9px] opacity-60">ON</span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        animate={{ height: chartHeight }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="relative z-10"
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="redGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="greenGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="blueGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
            <XAxis
              dataKey="bin"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono',
                color: 'hsl(var(--foreground))',
                boxShadow: '0 8px 32px hsl(var(--foreground) / 0.1)',
                padding: '10px 14px',
              }}
              labelFormatter={(val) => `Bin ${val}`}
            />
            {channels.red && (
              <Area
                type={viewMode === 'overlay' ? 'basis' : 'monotone'}
                dataKey="red"
                stroke="#ef4444"
                fill="url(#redGrad2)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#ef4444', strokeWidth: 2, fill: 'hsl(var(--card))' }}
                filter="url(#glow)"
              />
            )}
            {channels.green && (
              <Area
                type={viewMode === 'overlay' ? 'basis' : 'monotone'}
                dataKey="green"
                stroke="#22c55e"
                fill="url(#greenGrad2)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#22c55e', strokeWidth: 2, fill: 'hsl(var(--card))' }}
                filter="url(#glow)"
              />
            )}
            {channels.blue && (
              <Area
                type={viewMode === 'overlay' ? 'basis' : 'monotone'}
                dataKey="blue"
                stroke="#3b82f6"
                fill="url(#blueGrad2)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: 'hsl(var(--card))' }}
                filter="url(#glow)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Stats cards */}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 relative z-10">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
          <Activity className="h-3 w-3 text-primary" />
          {Object.values(channels).filter(Boolean).length}/3 channels active
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          {viewMode === 'area' ? 'Area' : 'Overlay'} mode
        </div>
      </div>
    </motion.div>
  );
};

export default HistogramChart;
