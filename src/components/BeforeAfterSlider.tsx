import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight } from 'lucide-react';
import type { AnalysisResult } from '@/lib/steganography';

interface BeforeAfterSliderProps {
  imageUrl: string;
  regions: AnalysisResult['suspiciousRegions'];
}

const BeforeAfterSlider = ({ imageUrl, regions }: BeforeAfterSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Draw heatmap overlay on canvas
  useEffect(() => {
    const canvas = afterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      const maxW = containerRef.current?.clientWidth || 600;
      const scale = Math.min(maxW / img.width, 500 / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      canvas.width = w;
      canvas.height = h;
      setDimensions({ width: w, height: h });

      ctx.drawImage(img, 0, 0, w, h);

      // Apply analysis overlay
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Slight green tint on safe areas
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, data[i] - 10);
        data[i + 1] = Math.min(255, data[i + 1] + 5);
        data[i + 2] = Math.max(0, data[i + 2] - 10);
      }
      ctx.putImageData(imageData, 0, 0);

      // Draw suspicious regions with red overlay and border
      regions.forEach(r => {
        const alpha = Math.min(0.5, r.intensity * 0.7);
        // Glow effect
        ctx.shadowColor = `rgba(239, 68, 68, ${alpha})`;
        ctx.shadowBlur = 12;
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
        ctx.shadowBlur = 0;

        // Dashed border
        ctx.strokeStyle = `rgba(239, 68, 68, ${alpha + 0.3})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        const labelW = 60;
        ctx.fillRect(r.x * scale, r.y * scale - 16, labelW, 16);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillText(`${(r.intensity * 100).toFixed(0)}% risk`, r.x * scale + 4, r.y * scale - 4);
      });

      // Watermark
      ctx.fillStyle = 'rgba(0, 200, 180, 0.15)';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText('STEGAFORENSICS ANALYSIS', 8, h - 8);
    };
    img.src = imageUrl;
  }, [imageUrl, regions]);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging) handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const stopDrag = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopDrag);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', stopDrag);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, stopDrag]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-border bg-card p-6 card-elevated"
    >
      <h3 className="font-mono text-xs text-muted-foreground mb-4 tracking-[0.2em] uppercase flex items-center gap-2">
        <ArrowLeftRight className="h-4 w-4 text-primary" /> Before / After Comparison
      </h3>

      <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-2 px-1">
        <span>◀ ORIGINAL</span>
        <span>ANALYZED ▶</span>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border border-border cursor-col-resize select-none"
        style={{ width: dimensions.width || '100%', height: dimensions.height || 300, maxWidth: '100%', margin: '0 auto' }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        {/* Original image (full width, underneath) */}
        <img
          src={imageUrl}
          alt="Original"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Analyzed overlay (clipped from right) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
        >
          <canvas
            ref={afterCanvasRef}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* Slider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-primary/90 border-2 border-primary-foreground flex items-center justify-center cyber-glow">
            <ArrowLeftRight className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>

        {/* Labels on image */}
        <div
          className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground text-[10px] font-mono px-2 py-1 rounded-md border border-border z-20"
          style={{ opacity: sliderPos > 15 ? 1 : 0 }}
        >
          ORIGINAL
        </div>
        <div
          className="absolute top-3 right-3 bg-destructive/80 backdrop-blur-sm text-destructive-foreground text-[10px] font-mono px-2 py-1 rounded-md z-20"
          style={{ opacity: sliderPos < 85 ? 1 : 0 }}
        >
          ANALYZED
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-3 font-mono">
        Drag the slider to compare original vs forensic analysis overlay
      </p>
    </motion.div>
  );
};

export default BeforeAfterSlider;
