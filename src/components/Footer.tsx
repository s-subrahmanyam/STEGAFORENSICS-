import { Mail, MapPin, Linkedin, ExternalLink } from 'lucide-react';
import { useEffect, useRef } from 'react';

const Footer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles: { x: number; y: number; vx: number; vy: number; size: number; pulse: number }[] = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 1.5 + 0.3,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      time += 0.012;

      // Grid
      ctx.strokeStyle = 'hsla(175, 85%, 48%, 0.025)';
      ctx.lineWidth = 0.5;
      const grid = 36;
      const ox = (time * 5) % grid;
      for (let x = -grid + ox; x < w; x += grid) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += grid) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Scanline
      const scanY = (time * 20) % h;
      const sg = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
      sg.addColorStop(0, 'hsla(175, 85%, 48%, 0)');
      sg.addColorStop(0.5, 'hsla(175, 85%, 48%, 0.04)');
      sg.addColorStop(1, 'hsla(175, 85%, 48%, 0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY - 15, w, 30);

      // Particles + connections
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        p.pulse += 0.02;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;

        const glow = Math.sin(p.pulse) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * glow, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(175, 85%, 48%, ${0.15 * glow})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x;
          const dy = p.y - particles[j].y;
          const dist = dx * dx + dy * dy;
          if (dist < 10000) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(175, 85%, 48%, ${0.06 * (1 - Math.sqrt(dist) / 100)})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      });

      // Orbs
      for (let i = 0; i < 2; i++) {
        const ox = w * (0.3 + i * 0.4) + Math.sin(time * 0.3 + i) * w * 0.05;
        const oy = h * 0.5 + Math.cos(time * 0.2 + i) * h * 0.2;
        const r = 40 + Math.sin(time * 0.4 + i) * 15;
        const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
        og.addColorStop(0, 'hsla(175, 80%, 48%, 0.04)');
        og.addColorStop(1, 'hsla(175, 80%, 48%, 0)');
        ctx.fillStyle = og;
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <footer className="relative border-t border-border bg-card/80 backdrop-blur-xl mt-16 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container relative py-10">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Us */}
          <div>
            <h3 className="text-sm font-bold font-mono tracking-wider text-gradient-cyber mb-4">
              CONTACT US
            </h3>
            <div className="space-y-3">
              <a
                href="mailto:2320090011@klh.edu.in"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4 text-primary" />
                2320090011@klh.edu.in
              </a>
              <a
                href="https://www.linkedin.com/in/subrahmanyam-reddy-sanikommu"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="h-4 w-4 text-primary" />
                Subrahmanyam Reddy Sanikommu
                <ExternalLink className="h-3 w-3" />
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                KLH University, Bachupally Campus
              </div>
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-sm font-bold font-mono tracking-wider text-gradient-cyber mb-4">
              ABOUT
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              StegaForensics is an advanced AI-powered steganography detection and digital forensic analysis platform built for cybersecurity professionals, researchers, and forensic investigators. It leverages multiple detection algorithms — including LSB pattern analysis, histogram anomaly detection, noise profiling, pixel-level inspection, and compression artifact analysis — to uncover hidden data embedded within digital images. Designed with precision and security in mind, StegaForensics delivers comprehensive forensic reports, batch processing capabilities, and real-time threat assessment to support digital evidence integrity.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground font-mono">
            © {new Date().getFullYear()} Subrahmanyam Reddy. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            STEGAFORENSICS — AI Steganography Detector
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
