import { Shield, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

import { useEffect, useRef } from 'react';

const Header = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; pulse: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    // Create particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w(),
        y: Math.random() * h(),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let scanY = 0;
    let time = 0;

    const draw = () => {
      const cw = w();
      const ch = h();
      ctx.clearRect(0, 0, cw, ch);
      time += 0.016;

      // Moving grid lines
      ctx.strokeStyle = 'hsla(175, 85%, 48%, 0.04)';
      ctx.lineWidth = 0.5;
      const gridSize = 24;
      const offsetX = (time * 8) % gridSize;
      for (let x = -gridSize + offsetX; x < cw; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
      }
      for (let y = 0; y < ch; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
      }

      // Scanline
      scanY = (scanY + 0.5) % ch;
      const scanGrad = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
      scanGrad.addColorStop(0, 'hsla(175, 85%, 48%, 0)');
      scanGrad.addColorStop(0.5, 'hsla(175, 85%, 48%, 0.12)');
      scanGrad.addColorStop(1, 'hsla(175, 85%, 48%, 0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 8, cw, 16);

      // Particles + connections
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.03;

        if (p.x < 0) p.x = cw;
        if (p.x > cw) p.x = 0;
        if (p.y < 0) p.y = ch;
        if (p.y > ch) p.y = 0;

        const glow = Math.sin(p.pulse) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * glow, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(175, 85%, 48%, ${p.opacity * glow})`;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x;
          const dy = p.y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(175, 85%, 48%, ${0.08 * (1 - dist / 80)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      // Horizontal data stream effect
      const streamY = ch * 0.5 + Math.sin(time * 0.8) * ch * 0.3;
      const streamGrad = ctx.createLinearGradient(0, 0, cw, 0);
      streamGrad.addColorStop(0, 'hsla(175, 85%, 48%, 0)');
      const streamPos = ((time * 0.15) % 1);
      streamGrad.addColorStop(Math.max(0, streamPos - 0.15), 'hsla(175, 85%, 48%, 0)');
      streamGrad.addColorStop(streamPos, 'hsla(175, 85%, 48%, 0.06)');
      streamGrad.addColorStop(Math.min(1, streamPos + 0.15), 'hsla(175, 85%, 48%, 0)');
      streamGrad.addColorStop(1, 'hsla(175, 85%, 48%, 0)');
      ctx.fillStyle = streamGrad;
      ctx.fillRect(0, streamY - 1, cw, 2);

      animId = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => { resize(); };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <header className="relative border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50 overflow-hidden">
      {/* Animated canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.9 }}
      />

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container relative flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <motion.div
            className="h-10 w-10 rounded-xl gradient-cyber flex items-center justify-center cyber-glow"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shield className="h-5 w-5 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-base font-bold font-mono tracking-wider text-gradient-cyber">
              STEGAFORENSICS
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-[0.25em]">
              AI STEGANOGRAPHY DETECTOR
            </p>
          </div>
        </div>

        <div className="flex items-center">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
            <Activity className="h-3 w-3 text-success animate-pulse" />
            <span>SYSTEM ACTIVE</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
