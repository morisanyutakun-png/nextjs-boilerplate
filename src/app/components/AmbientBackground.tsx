"use client";

import { useEffect, useRef } from "react";

/**
 * AmbientBackground — Apple風の常時背景アニメーション
 *
 * Canvas で描画するグラデーションオーブが
 * ゆっくりと浮遊し、有機的に色を変えながら動く。
 * 全ページの背後に常時表示される。
 * GPU accelerated, 低負荷, 60fps 目標。
 */

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  hueSpeed: number;
  saturation: number;
  lightness: number;
  alpha: number;
}

function createOrbs(w: number, h: number): Orb[] {
  return [
    // 大きなメインオーブ (rose/pink系) — より大きく、より流動的
    {
      x: w * 0.7,
      y: h * 0.3,
      vx: 0.25,
      vy: -0.18,
      radius: Math.min(w, h) * 0.42,
      hue: 340,
      hueSpeed: 0.03,
      saturation: 70,
      lightness: 55,
      alpha: 0.04,
    },
    // 中くらいオーブ (amber/warm系)
    {
      x: w * 0.2,
      y: h * 0.7,
      vx: -0.18,
      vy: 0.22,
      radius: Math.min(w, h) * 0.34,
      hue: 35,
      hueSpeed: -0.025,
      saturation: 60,
      lightness: 60,
      alpha: 0.03,
    },
    // アクセントオーブ (violet系)
    {
      x: w * 0.5,
      y: h * 0.15,
      vx: 0.14,
      vy: 0.16,
      radius: Math.min(w, h) * 0.26,
      hue: 280,
      hueSpeed: 0.035,
      saturation: 55,
      lightness: 50,
      alpha: 0.025,
    },
    // 追加オーブ (teal系)
    {
      x: w * 0.85,
      y: h * 0.8,
      vx: -0.2,
      vy: -0.12,
      radius: Math.min(w, h) * 0.22,
      hue: 170,
      hueSpeed: 0.02,
      saturation: 50,
      lightness: 50,
      alpha: 0.022,
    },
    // 新: 浮遊するピンクの光 — 画面上部を漂う
    {
      x: w * 0.35,
      y: h * 0.4,
      vx: 0.3,
      vy: -0.1,
      radius: Math.min(w, h) * 0.18,
      hue: 330,
      hueSpeed: -0.04,
      saturation: 65,
      lightness: 60,
      alpha: 0.02,
    },
  ];
}

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbsRef = useRef<Orb[]>([]);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Reduced motion check
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
      orbsRef.current = createOrbs(w, h);
    };

    resize();
    window.addEventListener("resize", resize);

    const w = () => canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
    const h = () => canvas.height / (Math.min(window.devicePixelRatio || 1, 2));

    const animate = () => {
      if (prefersReducedMotion) {
        // 静止状態で1回だけ描画
        drawFrame(ctx, orbsRef.current, w(), h(), 0);
        return;
      }

      timeRef.current += 0.008;
      const orbs = orbsRef.current;
      const cw = w();
      const ch = h();

      // オーブの更新
      for (const orb of orbs) {
        // 有機的な動き (Perlin-like sine combinations)
        const t = timeRef.current;
        orb.x += orb.vx + Math.sin(t * 0.7 + orb.hue) * 0.3;
        orb.y += orb.vy + Math.cos(t * 0.5 + orb.hue * 0.1) * 0.25;

        // Hue シフト
        orb.hue = (orb.hue + orb.hueSpeed) % 360;

        // バウンス (ソフトバウンダリ)
        const margin = orb.radius * 0.5;
        if (orb.x < -margin) orb.vx = Math.abs(orb.vx) * 0.8;
        if (orb.x > cw + margin) orb.vx = -Math.abs(orb.vx) * 0.8;
        if (orb.y < -margin) orb.vy = Math.abs(orb.vy) * 0.8;
        if (orb.y > ch + margin) orb.vy = -Math.abs(orb.vy) * 0.8;

        // Alpha は呼吸のように揺れる
        orb.alpha = 0.02 + Math.sin(t * 0.3 + orb.hue) * 0.012;
      }

      drawFrame(ctx, orbs, cw, ch, timeRef.current);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
      style={{ mixBlendMode: "normal" }}
    />
  );
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  orbs: Orb[],
  w: number,
  h: number,
  _time: number
) {
  ctx.clearRect(0, 0, w, h);

  for (const orb of orbs) {
    const gradient = ctx.createRadialGradient(
      orb.x,
      orb.y,
      0,
      orb.x,
      orb.y,
      orb.radius
    );

    const hue = ((orb.hue % 360) + 360) % 360;
    gradient.addColorStop(
      0,
      `hsla(${hue}, ${orb.saturation}%, ${orb.lightness}%, ${orb.alpha * 1.5})`
    );
    gradient.addColorStop(
      0.4,
      `hsla(${hue}, ${orb.saturation}%, ${orb.lightness}%, ${orb.alpha * 0.8})`
    );
    gradient.addColorStop(1, `hsla(${hue}, ${orb.saturation}%, ${orb.lightness}%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
