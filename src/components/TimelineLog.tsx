import { motion } from 'framer-motion';
import { Info, Search, AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';
import type { TimelineEntry } from '@/lib/steganography';

const iconMap = {
  info: Info,
  analysis: Search,
  warning: AlertTriangle,
  result: CheckCircle,
};

const colorMap = {
  info: 'text-primary',
  analysis: 'text-foreground',
  warning: 'text-warning',
  result: 'text-success',
};

const bgMap = {
  info: 'bg-primary/10 border-primary/20',
  analysis: 'bg-secondary border-border',
  warning: 'bg-warning/10 border-warning/20',
  result: 'bg-success/10 border-success/20',
};

const lineColorMap = {
  info: 'bg-primary/30',
  analysis: 'bg-border',
  warning: 'bg-warning/30',
  result: 'bg-success/30',
};

const TimelineLog = ({ entries }: { entries: TimelineEntry[] }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80 }}
      className="rounded-2xl border border-border bg-card p-6 card-elevated"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-xs text-muted-foreground tracking-[0.2em] uppercase flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Investigation Timeline
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground px-2 py-1 rounded-md bg-secondary/50 border border-border">
          {entries.length} events
        </span>
      </div>

      <div className="relative space-y-0 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        {entries.map((entry, i) => {
          const Icon = iconMap[entry.type];
          const isLast = i === entries.length - 1;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex gap-3 relative"
            >
              {/* Timeline line */}
              {!isLast && (
                <div className={`absolute left-[13px] top-9 bottom-0 w-px ${lineColorMap[entry.type]}`} />
              )}

              {/* Icon node */}
              <div className={`h-7 w-7 rounded-lg border ${bgMap[entry.type]} flex items-center justify-center shrink-0 z-10`}>
                <Icon className={`h-3.5 w-3.5 ${colorMap[entry.type]}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-medium text-foreground text-sm">{entry.action}</span>
                  <span className="text-[9px] font-mono text-muted-foreground shrink-0 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{entry.detail}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default TimelineLog;
