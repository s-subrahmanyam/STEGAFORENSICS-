import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Scan, Fingerprint, TrendingUp, TrendingDown, Activity, Zap, Eye } from 'lucide-react';

interface RiskGaugeProps {
  risk: number;
  level: 'low' | 'moderate' | 'high';
  verdict?: string;
}

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const duration = 2200;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      node.textContent = `${Math.round(eased * value)}`;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span ref={ref} className={className}>0</span>;
}

const RiskGauge = ({ risk, level, verdict }: RiskGaugeProps) => {
  const [showPulse, setShowPulse] = useState(true);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setShowPulse(false), 3500);
    return () => clearTimeout(t);
  }, []);

  const color = level === 'low' ? 'text-success' : level === 'moderate' ? 'text-warning' : 'text-destructive';
  const glowColor = level === 'low' ? 'hsl(var(--success))' : level === 'moderate' ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
  const bgClass = level === 'low' ? 'border-success/20' : level === 'moderate' ? 'border-warning/20' : 'border-destructive/20';
  const label = level === 'low' ? 'LOW RISK' : level === 'moderate' ? 'MODERATE RISK' : 'HIGH RISK';
  const RiskIcon = level === 'low' ? ShieldCheck : level === 'moderate' ? AlertTriangle : ShieldAlert;
  const desc = verdict || (
    level === 'low' ? 'No Steganography Detected' :
    level === 'moderate' ? 'Suspicious — Requires Further Analysis' :
    'Possible Hidden Data Detected'
  );

  const circumference = 2 * Math.PI * 68;
  const offset = circumference - (risk / 100) * circumference;

  // Risk zone segments for the outer ring
  const zones = [
    { label: 'Safe', range: '0-28%', color: 'hsl(var(--success))', start: 0, end: 28, icon: ShieldCheck },
    { label: 'Suspicious', range: '28-55%', color: 'hsl(var(--warning))', start: 28, end: 55, icon: AlertTriangle },
    { label: 'Dangerous', range: '55-100%', color: 'hsl(var(--destructive))', start: 55, end: 100, icon: ShieldAlert },
  ];

  const riskFactors = [
    { label: 'Bit Pattern', status: risk > 40 ? 'anomaly' : 'normal', icon: Activity },
    { label: 'Signature', status: risk > 50 ? 'detected' : 'clean', icon: Fingerprint },
    { label: 'Confidence', status: risk > 60 ? 'high' : risk > 30 ? 'medium' : 'low', icon: Eye },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80 }}
      className={`relative rounded-2xl border ${bgClass} p-6 flex flex-col items-center card-elevated overflow-hidden`}
    >
      {/* Animated ambient glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 35%, ${glowColor}, transparent 70%)` }}
        animate={{ opacity: [0.03, 0.07, 0.03] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 scanline pointer-events-none opacity-50" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4 z-10">
        <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
          <Scan className="h-3.5 w-3.5 text-primary" />
        </motion.div>
        <h3 className="font-mono text-[10px] text-muted-foreground tracking-[0.25em] uppercase">
          Threat Assessment
        </h3>
      </div>

      {/* Main gauge */}
      <div className="relative w-56 h-56 z-10">
        {/* Decorative outer ring with zone segments */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full -rotate-90">
          {zones.map((zone, i) => {
            const startAngle = (zone.start / 100) * 360;
            const endAngle = (zone.end / 100) * 360;
            const segCirc = 2 * Math.PI * 90;
            const segLength = ((zone.end - zone.start) / 100) * segCirc;
            const segOffset = segCirc - ((zone.start) / 100) * segCirc;
            return (
              <circle
                key={i}
                cx="100" cy="100" r="90"
                fill="none"
                stroke={zone.color}
                strokeWidth="2"
                strokeDasharray={`${segLength} ${segCirc - segLength}`}
                strokeDashoffset={segOffset}
                opacity={activeSegment === i ? 0.6 : 0.15}
                className="transition-opacity duration-300 cursor-pointer"
                onMouseEnter={() => setActiveSegment(i)}
                onMouseLeave={() => setActiveSegment(null)}
              />
            );
          })}

          {/* Tick marks */}
          {Array.from({ length: 50 }).map((_, i) => {
            const angle = (i / 50) * 2 * Math.PI;
            const isMajor = i % 5 === 0;
            const inner = isMajor ? 80 : 82;
            const outer = 85;
            return (
              <line
                key={i}
                x1={100 + inner * Math.cos(angle)}
                y1={100 + inner * Math.sin(angle)}
                x2={100 + outer * Math.cos(angle)}
                y2={100 + outer * Math.sin(angle)}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={isMajor ? 1.5 : 0.5}
                opacity={isMajor ? 0.4 : 0.2}
              />
            );
          })}

          {/* Background track */}
          <circle cx="100" cy="100" r="68" fill="none" stroke="hsl(var(--border))" strokeWidth="6" opacity="0.3" />

          {/* Main progress arc — glow layer */}
          <motion.circle
            cx="100" cy="100" r="68" fill="none"
            stroke={glowColor}
            strokeWidth="18" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            opacity={0.12}
          />

          {/* Main progress arc */}
          <motion.circle
            cx="100" cy="100" r="68" fill="none"
            stroke={glowColor}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 10px ${glowColor})` }}
          />

          {/* Needle dot at the end of the arc */}
          <motion.circle
            cx="100"
            cy="100"
            r="4"
            fill={glowColor}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
            style={{
              filter: `drop-shadow(0 0 6px ${glowColor})`,
              transformOrigin: '100px 100px',
              transform: `rotate(${(risk / 100) * 360 - 90}deg) translateX(68px)`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPulse && (
            <motion.div
              className="absolute w-20 h-20 rounded-full"
              style={{ backgroundColor: glowColor }}
              initial={{ opacity: 0.25, scale: 0.4 }}
              animate={{ opacity: 0, scale: 2.5 }}
              transition={{ duration: 2, repeat: 3, ease: 'easeOut' }}
            />
          )}

          <div className="flex items-baseline gap-0.5">
            <AnimatedCounter
              value={risk}
              className={`text-[52px] font-bold font-mono leading-none ${color}`}
            />
            <span className={`text-lg font-mono font-bold ${color} opacity-60`}>%</span>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.8, type: 'spring' }}
            className="flex items-center gap-1.5 mt-2"
          >
            <RiskIcon className={`h-3.5 w-3.5 ${color}`} />
            <span className={`text-[9px] font-mono ${color} tracking-[0.3em] font-bold uppercase`}>{label}</span>
          </motion.div>
        </div>
      </div>

      {/* Zone tooltip */}
      <motion.div
        initial={false}
        animate={{ opacity: activeSegment !== null ? 1 : 0, y: activeSegment !== null ? 0 : 5 }}
        className="z-10 h-6 flex items-center gap-2 mt-1"
      >
        {activeSegment !== null && (
          <>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: zones[activeSegment].color }} />
            <span className="text-[10px] font-mono text-muted-foreground">
              {zones[activeSegment].label}: {zones[activeSegment].range}
            </span>
          </>
        )}
      </motion.div>

      {/* Verdict card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}
        className="z-10 mt-3 w-full"
      >
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bgClass} bg-card/60 backdrop-blur-sm`}>
          <Fingerprint className={`h-5 w-5 ${color} shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono text-foreground font-semibold leading-tight">{desc}</p>
          </div>
          {risk > 40 ? (
            <TrendingUp className="h-4 w-4 text-destructive shrink-0" />
          ) : (
            <TrendingDown className="h-4 w-4 text-success shrink-0" />
          )}
        </div>
      </motion.div>

      {/* Quick status indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.3 }}
        className="z-10 mt-3 grid grid-cols-3 gap-2 w-full"
      >
        {riskFactors.map((factor, i) => (
          <motion.div
            key={factor.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.4 + i * 0.1 }}
            whileHover={{ scale: 1.03 }}
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/40 border border-border/50 cursor-default"
          >
            <factor.icon className="h-3 w-3 text-muted-foreground" />
            <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider">{factor.label}</span>
            <span className={`text-[9px] font-mono font-bold ${
              factor.status === 'anomaly' || factor.status === 'detected' || factor.status === 'high'
                ? 'text-destructive'
                : factor.status === 'medium'
                ? 'text-warning'
                : 'text-success'
            }`}>
              {factor.status.toUpperCase()}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default RiskGauge;
