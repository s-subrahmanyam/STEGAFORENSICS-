import { motion } from 'framer-motion';
import { Shield, Hash, Copy, Check, FileImage, Maximize2, Calendar, HardDrive } from 'lucide-react';
import type { ImageMetadata } from '@/lib/steganography';
import { useState } from 'react';

interface EvidenceInfoProps {
  metadata: ImageMetadata;
  sha256: string;
}

const EvidenceInfo = ({ metadata, sha256 }: EvidenceInfoProps) => {
  const [copied, setCopied] = useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText(sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const items = [
    { icon: FileImage, label: 'File Name', value: metadata.fileName },
    { icon: Maximize2, label: 'Dimensions', value: `${metadata.width} × ${metadata.height} px` },
    { icon: HardDrive, label: 'File Size', value: `${(metadata.fileSize / 1024).toFixed(1)} KB` },
    { icon: FileImage, label: 'Type', value: metadata.fileType },
    { icon: Calendar, label: 'Last Modified', value: new Date(metadata.lastModified).toLocaleString() },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80 }}
      className="rounded-2xl border border-border bg-card p-6 space-y-4 card-elevated"
    >
      <h3 className="font-mono text-xs text-muted-foreground tracking-[0.2em] uppercase flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-primary" /> Evidence Integrity
      </h3>

      <div className="space-y-1">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex justify-between items-center text-sm py-2.5 px-3 rounded-lg hover:bg-secondary/40 transition-colors"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </div>
            <span className="font-mono text-foreground font-medium text-right truncate max-w-[55%]">{item.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-mono text-muted-foreground">SHA-256 Evidence Hash</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyHash}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              copied
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-border bg-secondary/50 text-primary hover:bg-secondary'
            }`}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied!' : 'Copy Hash'}
          </motion.button>
        </div>
        <div className="relative">
          <p className="text-[10px] font-mono text-foreground break-all bg-secondary/50 p-3 rounded-xl border border-border leading-relaxed">
            {sha256}
          </p>
          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-mono font-bold">
            VERIFIED
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EvidenceInfo;
