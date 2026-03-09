import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnalysisResult } from '@/lib/steganography';
import { Crosshair, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Eye, EyeOff, Download } from 'lucide-react';

interface SuspiciousRegionsProps {
  imageUrl: string;
  regions: AnalysisResult['suspiciousRegions'];
}

const SuspiciousRegions = ({ imageUrl, regions }: SuspiciousRegionsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [showOverlay, setShowOverlay] = useState(true);
  const [hoveredRegion, setHoveredRegion] = useState<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const scaleRef = useRef(1);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d')!;
    const img = imgRef.current;
    const scale = scaleRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (!showOverlay) return;

    regions.forEach((r, i) => {
      const alpha = Math.min(0.6, r.intensity * 0.8);
      const isHovered = hoveredRegion === i;
      const isSelected = selectedRegion === i;
      const x = r.x * scale;
      const y = r.y * scale;
      const w = r.w * scale;
      const h = r.h * scale;

      // Glow effect
      if (isHovered || isSelected) {
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
        ctx.shadowBlur = 15;
      }

      // Fill
      const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
      gradient.addColorStop(0, `rgba(239, 68, 68, ${alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(239, 100, 68, ${alpha * 0.9})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, w, h);

      // Border
      ctx.strokeStyle = isHovered || isSelected
        ? 'rgba(239, 68, 68, 0.95)'
        : `rgba(239, 68, 68, ${alpha + 0.3})`;
      ctx.lineWidth = isHovered || isSelected ? 3 : 2;
      ctx.setLineDash(isSelected ? [] : [4, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Corner markers
      const cornerLen = Math.min(8, w / 3, h / 3);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(x, y + h - cornerLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cornerLen, y + h);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cornerLen);
      ctx.stroke();

      // Region label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      const labelW = 50;
      const labelH = 16;
      ctx.fillRect(x, y - labelH - 2, labelW, labelH);
      ctx.fillStyle = '#fff';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(`R${i + 1} ${Math.round(r.intensity * 100)}%`, x + 4, y - 5);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(600 / img.width, 400 / img.height, 1);
      scaleRef.current = scale;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      imgRef.current = img;
      drawCanvas();
    };
    img.src = imageUrl;
  }, [imageUrl, regions]);

  useEffect(() => {
    drawCanvas();
  }, [showOverlay, hoveredRegion, selectedRegion]);

  const getIntensityLevel = (intensity: number) => {
    if (intensity >= 0.7) return { label: 'Critical', color: 'text-destructive', bg: 'bg-destructive/15' };
    if (intensity >= 0.4) return { label: 'High', color: 'text-warning', bg: 'bg-warning/15' };
    return { label: 'Medium', color: 'text-muted-foreground', bg: 'bg-secondary' };
  };

  const avgIntensity = regions.length > 0
    ? regions.reduce((s, r) => s + r.intensity, 0) / regions.length
    : 0;

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'suspicious-regions-heatmap.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-border bg-card p-6 card-elevated relative overflow-hidden"
    >
      {/* Ambient glow */}
      {regions.length > 0 && (
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(var(--destructive) / 0.15), transparent)' }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <Crosshair className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <h3 className="font-mono text-xs text-foreground tracking-[0.15em] uppercase font-semibold">
              Suspicious Region Heatmap
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              {regions.length} region{regions.length !== 1 ? 's' : ''} · Avg intensity {Math.round(avgIntensity * 100)}%
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowOverlay(o => !o)}
            className="w-8 h-8 rounded-lg border border-border bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            title={showOverlay ? 'Hide overlay' : 'Show overlay'}
          >
            {showOverlay ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleExport}
            className="w-8 h-8 rounded-lg border border-border bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            title="Export heatmap"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="relative bg-secondary/20 rounded-xl p-2 border border-border/50 overflow-hidden">
        <div
          className="flex justify-center transition-transform duration-300"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
        >
          <canvas ref={canvasRef} className="rounded-lg max-w-full" />
        </div>

        {/* Zoom controls overlay */}
        <div className="absolute bottom-3 right-3 flex gap-1">
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.25))}
            className="w-7 h-7 rounded-lg bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            className="w-7 h-7 rounded-lg bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="w-7 h-7 rounded-lg bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Region list */}
      {regions.length > 0 && (
        <div className="mt-4 space-y-1.5 relative z-10">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Detected Regions</p>
          {regions.map((r, i) => {
            const level = getIntensityLevel(r.intensity);
            return (
              <motion.button
                key={i}
                onClick={() => setSelectedRegion(selectedRegion === i ? null : i)}
                onMouseEnter={() => setHoveredRegion(i)}
                onMouseLeave={() => setHoveredRegion(null)}
                whileHover={{ x: 4 }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left ${
                  selectedRegion === i
                    ? 'border-destructive/50 bg-destructive/5'
                    : 'border-border/50 bg-secondary/20 hover:border-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-destructive/10 text-destructive text-[10px] font-mono font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-[11px] font-mono text-foreground">
                      ({r.x}, {r.y}) → {r.w}×{r.h}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${r.intensity * 100}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                      className="h-full rounded-full bg-destructive"
                    />
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${level.bg} ${level.color}`}>
                    {level.label}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Footer legend */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50 relative z-10">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
          <AlertTriangle className="h-3 w-3 text-destructive" />
          Overlay {showOverlay ? 'active' : 'hidden'} · Zoom {Math.round(zoom * 100)}%
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
          <div className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded-full bg-destructive/30" />
            Low
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded-full bg-destructive/60" />
            Med
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded-full bg-destructive" />
            High
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SuspiciousRegions;
