import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface AnalysisProgressProps {
  step: string;
  progress: number;
}

const AnalysisProgress = ({ step, progress }: AnalysisProgressProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-2xl border border-primary/20 bg-card p-6 cyber-glow card-elevated"
    >
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
        <span className="font-mono text-sm text-primary font-semibold tracking-wider">
          FORENSIC ANALYSIS IN PROGRESS
        </span>
      </div>
      <div className="relative mb-3">
        <Progress value={progress} className="h-3 rounded-full" />
        <div
          className="absolute top-0 h-3 rounded-full bg-primary/20 animate-shimmer"
          style={{
            width: `${progress}%`,
            backgroundImage: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent)',
            backgroundSize: '200% 100%',
          }}
        />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-sm font-mono text-muted-foreground">{step}</p>
        <p className="text-sm font-mono text-primary font-bold">{progress}%</p>
      </div>
    </motion.div>
  );
};

export default AnalysisProgress;
