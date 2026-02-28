"use client";

import { useEffect, useRef } from "react";

/**
 * AmbientBackground — Warm Glow Orbs
 *
 * ウォームクリーム背景の上にゆったり漂う暖色グラデーションオーブ。
 * ピーチ・ブラッシュ・ラベンダー・ゴールドの柔らかい色で
 * 心理的に「安心・信頼・温かみ」を演出。
 * Canvas 描画・GPU accelerated・低負荷。
 */

interface OrbConfig {
  cx: number;
  cy: number;
  r: number;
  hue: number;
  saturation: number;
  lightness: number;
  speed: number;
  driftX: number;
  driftY: number;
  alpha: number;
}

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
    };

    resize();
    window.addEventListener("resize", resize);

    const getOrbs = (): OrbConfig[] => {
      const { w, h } = sizeRef.current;
      const r = Math.min(w, h);
      return [
        // ピーチ (左上) — 安心感・温かみ
        { cx: w * 0.15, cy: h * 0.2, r: r * 0.4, hue: 20, saturation: 80, lightness: 85, speed: 0.15, driftX: 80, driftY: 50, alpha: 0.12 },
        // ブラッシュローズ (右中央) — 親しみ・ケア
        { cx: w * 0.8, cy: h * 0.35, r: r * 0.35, hue: 345, saturation: 60, lightness: 88, speed: -0.1, driftX: 60, driftY: 70, alpha: 0.1 },
        // ラベンダー (左下) — 穏やかさ・癒し
        { cx: w * 0.25, cy: h * 0.7, r: r * 0.3, hue: 270, saturation: 40, lightness: 90, speed: 0.12, driftX: 50, driftY: 40, alpha: 0.08 },
        // ゴールド (右上) — 信頼・プレミアム感
        { cx: w * 0.75, cy: h * 0.15, r: r * 0.25, hue: 40, saturation: 70, lightness: 87, speed: -0.08, driftX: 40, driftY: 55, alpha: 0.09 },
        // ピンク (中央下) — 優しさ
        { cx: w * 0.5, cy: h * 0.85, r: r * 0.35, hue: 10, saturation: 65, lightness: 90, speed: 0.07, driftX: 70, driftY: 35, alpha: 0.07 },
      ];
    };

    const drawOrbs = (t: number) => {
      const orbs = getOrbs();
      for (const orb of orbs) {
        const x = orb.cx + Math.sin(t * orb.speed) * orb.driftX;
        const y = orb.cy + Math.cos(t * orb.speed * 0.7 + 1) * orb.driftY;
        const breathe = 1 + Math.sin(t * 0.3 + orb.hue * 0.01) * 0.08;
        const currentR = orb.r * breathe;
        const alpha = orb.alpha + Math.sin(t * 0.2 + orb.hue) * 0.02;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, currentR);
        gradient.addColorStop(0, `hsla(${orb.hue}, ${orb.saturation}%, ${orb.lightness}%, ${alpha})`);
        gradient.addColorStop(0.5, `hsla(${orb.hue}, ${orb.saturation - 10}%, ${orb.lightness + 3}%, ${alpha * 0.5})`);
        gradient.addColorStop(1, `hsla(${orb.hue}, ${orb.saturation - 20}%, ${orb.lightness + 5}%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, currentR, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const animate = () => {
      const { w, h } = sizeRef.current;

      if (prefersReducedMotion) {
        ctx.clearRect(0, 0, w, h);
        drawOrbs(0);
        return;
      }

      timeRef.current += 0.016;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);
      drawOrbs(t);

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
    />
  );
}
