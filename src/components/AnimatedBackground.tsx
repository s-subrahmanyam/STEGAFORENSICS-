import { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; opacity: number; pulse: number; speed: number;
  hue: number;
}

interface HexNode {
  x: number; y: number; size: number; phase: number;
}

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let hexNodes: HexNode[] = [];
    let time = 0;
    let scanY = 0;
    let mouseX = -1000;
    let mouseY = -1000;

    // Detect mobile for reduced particles
    const isMobile = window.innerWidth < 768;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // Fewer particles on mobile
    const pCount = isMobile ? 25 : Math.min(90, Math.floor((W() * H()) / 10000));
    for (let i = 0; i < pCount; i++) {
      particles.push({
        x: Math.random() * W(), y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 2 + 0.3, opacity: Math.random() * 0.35 + 0.08,
        pulse: Math.random() * Math.PI * 2, speed: Math.random() * 0.025 + 0.01,
        hue: 175 + Math.random() * 30 - 15,
      });
    }

    // Hex grid — skip on mobile
    if (!isMobile) {
      const hexSpacing = 120;
      for (let x = 0; x < W() + hexSpacing; x += hexSpacing) {
        for (let y = 0; y < H() + hexSpacing; y += hexSpacing * 0.866) {
          const row = Math.floor(y / (hexSpacing * 0.866));
          hexNodes.push({
            x: x + (row % 2 ? hexSpacing / 2 : 0), y,
            size: 3 + Math.random() * 2,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    const onMouseMove = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
    if (!isMobile) window.addEventListener('mousemove', onMouseMove);

    const draw = () => {
      const cw = W();
      const ch = H();
      ctx.clearRect(0, 0, cw, ch);
      time += 0.012;

      // Grid
      ctx.strokeStyle = 'hsla(175, 85%, 48%, 0.02)';
      ctx.lineWidth = 0.5;
      const grid = 48;
      const ox = (time * 4) % grid;
      const oy = (time * 2.5) % grid;
      for (let x = -grid + ox; x < cw; x += grid) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
      }
      for (let y = -grid + oy; y < ch; y += grid) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
      }

      // Hex grid (desktop only)
      hexNodes.forEach(node => {
        const pulse = Math.sin(time * 2 + node.phase) * 0.5 + 0.5;
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        const mouseDist = Math.sqrt(dx * dx + dy * dy);
        const mouseInfluence = Math.max(0, 1 - mouseDist / 200);
        const alpha = 0.015 + pulse * 0.025 + mouseInfluence * 0.12;
        const s = node.size * (0.6 + pulse * 0.4 + mouseInfluence * 0.8);

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const hx = node.x + Math.cos(angle) * s;
          const hy = node.y + Math.sin(angle) * s;
          i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.strokeStyle = `hsla(175, 80%, 48%, ${alpha})`;
        ctx.lineWidth = 0.5 + mouseInfluence;
        ctx.stroke();
        if (mouseInfluence > 0.3) {
          ctx.fillStyle = `hsla(175, 80%, 48%, ${mouseInfluence * 0.04})`;
          ctx.fill();
        }
      });

      // Scanline
      scanY = (scanY + 0.4) % ch;
      const sg = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      sg.addColorStop(0, 'hsla(175, 85%, 48%, 0)');
      sg.addColorStop(0.5, 'hsla(175, 85%, 48%, 0.035)');
      sg.addColorStop(1, 'hsla(175, 85%, 48%, 0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY - 30, cw, 60);

      // Horizontal scanline (desktop only)
      if (!isMobile) {
        const scanX = ((time * 30) % (cw + 200)) - 100;
        const hsg = ctx.createLinearGradient(scanX - 60, 0, scanX + 60, 0);
        hsg.addColorStop(0, 'hsla(200, 80%, 50%, 0)');
        hsg.addColorStop(0.5, 'hsla(200, 80%, 50%, 0.02)');
        hsg.addColorStop(1, 'hsla(200, 80%, 50%, 0)');
        ctx.fillStyle = hsg;
        ctx.fillRect(scanX - 60, 0, 120, ch);
      }

      // Particles
      const connectionDist = isMobile ? 8000 : 16000;
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        p.pulse += p.speed;
        if (p.x < 0) p.x = cw; if (p.x > cw) p.x = 0;
        if (p.y < 0) p.y = ch; if (p.y > ch) p.y = 0;

        // Mouse repulsion (desktop)
        if (!isMobile) {
          const mdx = p.x - mouseX;
          const mdy = p.y - mouseY;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 150) {
            const force = (1 - mDist / 150) * 0.5;
            p.vx += (mdx / mDist) * force * 0.1;
            p.vy += (mdy / mDist) * force * 0.1;
          }
        }
        p.vx *= 0.998; p.vy *= 0.998;

        const glow = Math.sin(p.pulse) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * glow, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 85%, 48%, ${p.opacity * glow})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x;
          const dy = p.y - particles[j].y;
          const dist = dx * dx + dy * dy;
          if (dist < connectionDist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(175, 85%, 48%, ${0.06 * (1 - Math.sqrt(dist) / Math.sqrt(connectionDist))})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      });

      // Floating orbs
      const orbCount = isMobile ? 2 : 4;
      for (let i = 0; i < orbCount; i++) {
        const orbX = cw * (0.15 + i * (0.7 / orbCount)) + Math.sin(time * 0.2 + i * 1.8) * cw * 0.06;
        const orbY = ch * (0.25 + (i % 2) * 0.4) + Math.cos(time * 0.15 + i * 1.3) * ch * 0.08;
        const r = 60 + Math.sin(time * 0.3 + i * 0.7) * 25;
        const og = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, r);
        og.addColorStop(0, `hsla(${175 + i * 12}, 75%, 48%, 0.035)`);
        og.addColorStop(1, 'hsla(175, 75%, 48%, 0)');
        ctx.fillStyle = og;
        ctx.beginPath(); ctx.arc(orbX, orbY, r, 0, Math.PI * 2); ctx.fill();
      }

      // Data streams (desktop only)
      if (!isMobile) {
        ctx.fillStyle = 'hsla(175, 85%, 48%, 0.04)';
        for (let i = 0; i < 8; i++) {
          const sx = (cw / 8) * i + 20;
          const baseY = ((time * 40 + i * 137) % (ch + 200)) - 100;
          for (let d = 0; d < 5; d++) {
            const dy = baseY + d * 8;
            if (dy > 0 && dy < ch) {
              ctx.fillRect(sx, dy, 2 + ((i + d) % 3) * 2, 2);
            }
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};

export default AnimatedBackground;
