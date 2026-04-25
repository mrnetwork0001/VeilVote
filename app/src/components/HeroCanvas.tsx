'use client';

import { useEffect, useRef } from 'react';

const CHARS = '01ABCDEF✓✗⊕⊗⟨⟩∑∏∧∨▓░█▒';
const GREEN = '#33ff00';
const AMBER = '#ffb000';
const DIM   = '#145214';

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  char: string;
  life: number; maxLife: number;
  color: string;
  size: number;
};

type Node = {
  x: number; y: number;
  label: string;
  pulse: number;
  locked: boolean;
};

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let raf: number;
    let W = 0, H = 0;
    let particles: Particle[] = [];
    let tick = 0;

    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width  = W;
      canvas.height = H;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Three MPC nodes forming a triangle
    const getNodes = (): Node[] => [
      { x: W * 0.5,  y: H * 0.22, label: 'NODE_A', pulse: 0, locked: true },
      { x: W * 0.22, y: H * 0.72, label: 'NODE_B', pulse: 0, locked: true },
      { x: W * 0.78, y: H * 0.72, label: 'NODE_C', pulse: 0, locked: true },
    ];

    // Source: bottom centre — "user vote"
    const getSrc = () => ({ x: W * 0.5, y: H * 0.88 });

    const randChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];

    const spawnParticle = () => {
      const src  = getSrc();
      const node = getNodes()[Math.floor(Math.random() * 3)];
      const life = 60 + Math.random() * 40;
      const dx   = node.x - src.x;
      const dy   = node.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = dist / life;
      particles.push({
        x: src.x + (Math.random() - 0.5) * 20,
        y: src.y,
        vx: (dx / dist) * speed + (Math.random() - 0.5) * 0.5,
        vy: (dy / dist) * speed + (Math.random() - 0.5) * 0.5,
        char: randChar(),
        life, maxLife: life,
        color: Math.random() > 0.3 ? GREEN : AMBER,
        size: 9 + Math.random() * 4,
      });
    };

    const drawNode = (n: Node, pulse: number) => {
      const r = 22;
      // glow
      const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.5);
      grd.addColorStop(0, `rgba(51,255,0,${0.08 + pulse * 0.12})`);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // hex border
      ctx.strokeStyle = pulse > 0.5 ? GREEN : DIM;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = n.x + r * Math.cos(a);
        const py = n.y + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // lock icon text
      ctx.font      = `bold 11px monospace`;
      ctx.fillStyle = pulse > 0.5 ? GREEN : DIM;
      ctx.textAlign = 'center';
      ctx.fillText('🔒', n.x, n.y + 4);

      // label
      ctx.font      = `8px monospace`;
      ctx.fillStyle = DIM;
      ctx.fillText(n.label, n.x, n.y + r + 14);
    };

    const drawSource = () => {
      const src = getSrc();
      const glow = (Math.sin(tick * 0.05) * 0.5 + 0.5);
      ctx.strokeStyle = `rgba(255,176,0,${0.3 + glow * 0.4})`;
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(src.x - 28, src.y - 14, 56, 28);
      ctx.font        = '9px monospace';
      ctx.fillStyle   = AMBER;
      ctx.textAlign   = 'center';
      ctx.fillText('[ VOTE ]', src.x, src.y + 4);
    };

    const drawEdges = (nodes: Node[]) => {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          ctx.strokeStyle = 'rgba(26,56,26,0.6)';
          ctx.lineWidth   = 1;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    };

    // Scrolling hex rain columns
    const rainCols = Array.from({ length: Math.floor(W / 18) || 30 }, (_, i) => ({
      x: i * 18,
      y: Math.random() * H,
      speed: 0.4 + Math.random() * 0.6,
    }));

    const drawRain = () => {
      const cols = Math.floor(W / 18) || rainCols.length;
      ctx.font      = '9px monospace';
      ctx.textAlign = 'left';
      for (let i = 0; i < Math.min(cols, rainCols.length); i++) {
        const col = rainCols[i];
        ctx.fillStyle = `rgba(26,56,26,0.5)`;
        ctx.fillText(randChar(), col.x, col.y);
        col.y += col.speed;
        if (col.y > H) col.y = 0;
      }
    };

    const frame = () => {
      tick++;
      ctx.clearRect(0, 0, W, H);

      drawRain();

      const nodes = getNodes();
      drawEdges(nodes);

      if (tick % 6 === 0) spawnParticle();

      // draw particles
      particles = particles.filter(p => p.life > 0);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        p.life--;
        const alpha = p.life / p.maxLife;
        if (tick % 8 === 0) p.char = randChar();
        ctx.font      = `bold ${p.size}px monospace`;
        ctx.fillStyle = p.color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
        // simple hex → rgba
        if (p.color === GREEN) {
          ctx.fillStyle = `rgba(51,255,0,${alpha})`;
        } else {
          ctx.fillStyle = `rgba(255,176,0,${alpha})`;
        }
        ctx.textAlign = 'center';
        ctx.fillText(p.char, p.x, p.y);
      }

      nodes.forEach((n, i) => {
        const pulse = (Math.sin(tick * 0.04 + i * 2.1) + 1) / 2;
        drawNode(n, pulse);
      });

      drawSource();

      // "TALLY ENCRYPTED" status blinking text
      if (Math.floor(tick / 30) % 2 === 0) {
        ctx.font      = '8px monospace';
        ctx.fillStyle = `rgba(51,255,0,0.5)`;
        ctx.textAlign = 'center';
        ctx.fillText('// MPC TALLY COMPUTING...', W / 2, H * 0.5);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="hero-canvas-wrap">
      <canvas ref={canvasRef} />
      <div className="hero-canvas-overlay" />
      <div className="hero-canvas-label">
        <span>arcium_mpc_sim_v2.enc</span>
        <span className="hero-canvas-status">
          <span className="hero-canvas-dot" />
          LIVE
        </span>
      </div>
    </div>
  );
}
