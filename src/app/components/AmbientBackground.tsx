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
    // メインオーブ: ローズピンクの大きな光
    {
      x: w * 0.65,
      y: h * 0.25,
      vx: 0.35,
      vy: -0.2,
      radius: Math.min(w, h) * 0.5,
      hue: 340,
      hueSpeed: 0.025,
      saturation: 75,
      lightness: 65,
      alpha: 0.14,
    },
    // ウォームアンバー: 暖かみのある光
    {
      x: w * 0.15,
      y: h * 0.65,
      vx: -0.22,
      vy: 0.28,
      radius: Math.min(w, h) * 0.4,
      hue: 32,
      hueSpeed: -0.02,
      saturation: 70,
      lightness: 70,
      alpha: 0.1,
    },
    // バイオレット: 高級感のある紫
    {
      x: w * 0.5,
      y: h * 0.1,
      vx: 0.18,
      vy: 0.2,
      radius: Math.min(w, h) * 0.32,
      hue: 285,
      hueSpeed: 0.03,
      saturation: 60,
      lightness: 60,
      alpha: 0.08,
    },
    // ティール: クールなアクセント
    {
      x: w * 0.85,
      y: h * 0.78,
      vx: -0.25,
      vy: -0.15,
      radius: Math.min(w, h) * 0.28,
      hue: 175,
      hueSpeed: 0.02,
      saturation: 55,
      lightness: 65,
      alpha: 0.07,
    },
    // ゴールド: 高級感のある暖色
    {
      x: w * 0.3,
      y: h * 0.45,
      vx: 0.3,
      vy: -0.12,
      radius: Math.min(w, h) * 0.22,
      hue: 42,
      hueSpeed: -0.035,
      saturation: 80,
      lightness: 72,
      alpha: 0.06,
    },
    // サクラピンク: 明るく柔らかい光
    {
      x: w * 0.75,
      y: h * 0.5,
      vx: -0.15,
      vy: 0.22,
      radius: Math.min(w, h) * 0.35,
      hue: 350,
      hueSpeed: 0.018,
      saturation: 65,
      lightness: 75,
      alpha: 0.09,
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

        // Alpha は呼吸のように揺れる（ベースalphaの±30%）
        const baseAlpha = orb.radius > Math.min(cw, ch) * 0.35 ? 0.12 : 0.08;
        orb.alpha = baseAlpha + Math.sin(t * 0.3 + orb.hue) * (baseAlpha * 0.3);
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
