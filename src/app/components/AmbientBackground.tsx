"use client";

import { useEffect, useRef } from "react";

/**
 * AmbientBackground — Aurora Wave Animation
 *
 * ダーク背景上に流れるオーロラ風の波線 + グローイングオーブ +
 * スパークルパーティクルを Canvas で描画。
 * 常時表示・GPU accelerated・低負荷。
 */

interface WaveConfig {
  baseY: number;
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  hue: number;
  hueShift: number;
  lineWidth: number;
  glowWidth: number;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  phase: number;
}

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
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

      // パーティクル再生成
      particlesRef.current = Array.from({ length: 50 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 1.5 + 0.5,
        baseOpacity: Math.random() * 0.5 + 0.15,
        twinkleSpeed: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    resize();
    window.addEventListener("resize", resize);

    const getWaves = (): WaveConfig[] => {
      const { h } = sizeRef.current;
      return [
        // ローズオーロラ (メイン)
        { baseY: h * 0.3, amplitude: h * 0.08, frequency: 0.003, speed: 0.4, phase: 0, hue: 340, hueShift: 8, lineWidth: 1.5, glowWidth: 30, opacity: 0.5 },
        // バイオレット
        { baseY: h * 0.45, amplitude: h * 0.06, frequency: 0.004, speed: -0.3, phase: 1.5, hue: 280, hueShift: -6, lineWidth: 1.2, glowWidth: 25, opacity: 0.35 },
        // ティール
        { baseY: h * 0.6, amplitude: h * 0.07, frequency: 0.0025, speed: 0.2, phase: 3.0, hue: 185, hueShift: 5, lineWidth: 1, glowWidth: 20, opacity: 0.3 },
        // アンバーゴールド
        { baseY: h * 0.55, amplitude: h * 0.05, frequency: 0.0035, speed: -0.25, phase: 4.5, hue: 35, hueShift: -4, lineWidth: 1, glowWidth: 18, opacity: 0.25 },
        // サブローズ (上部)
        { baseY: h * 0.2, amplitude: h * 0.04, frequency: 0.005, speed: 0.35, phase: 2.2, hue: 350, hueShift: 10, lineWidth: 0.8, glowWidth: 15, opacity: 0.2 },
      ];
    };

    const drawWave = (wave: WaveConfig, t: number) => {
      const { w } = sizeRef.current;
      const currentHue = ((wave.hue + t * wave.hueShift) % 360 + 360) % 360;

      // 波のポイント計算
      const points: { x: number; y: number }[] = [];
      for (let x = -10; x <= w + 10; x += 3) {
        const y =
          wave.baseY +
          wave.amplitude * Math.sin(x * wave.frequency + t * wave.speed + wave.phase) +
          wave.amplitude * 0.4 * Math.sin(x * wave.frequency * 2.1 + t * wave.speed * 1.4 + wave.phase + 1) +
          wave.amplitude * 0.2 * Math.cos(x * wave.frequency * 3.5 + t * wave.speed * 0.6 + 2);
        points.push({ x, y });
      }

      // フィル: 波線下のグラデーショングロー
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineTo(w + 10, points[points.length - 1].y + wave.amplitude * 4);
      ctx.lineTo(-10, points[0].y + wave.amplitude * 4);
      ctx.closePath();

      const fillGrad = ctx.createLinearGradient(
        0,
        wave.baseY - wave.amplitude,
        0,
        wave.baseY + wave.amplitude * 4
      );
      fillGrad.addColorStop(0, `hsla(${currentHue}, 70%, 55%, ${wave.opacity * 0.12})`);
      fillGrad.addColorStop(0.3, `hsla(${currentHue}, 60%, 50%, ${wave.opacity * 0.06})`);
      fillGrad.addColorStop(1, `hsla(${currentHue}, 50%, 40%, 0)`);
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // グローライン (太く半透明)
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = `hsla(${currentHue}, 70%, 55%, ${wave.opacity * 0.15})`;
      ctx.lineWidth = wave.glowWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // コアライン (細く明るい)
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = `hsla(${currentHue}, 80%, 70%, ${wave.opacity * 0.6})`;
      ctx.lineWidth = wave.lineWidth;
      ctx.stroke();
    };

    const drawOrbs = (t: number) => {
      const { w, h } = sizeRef.current;
      const orbs = [
        { cx: w * 0.15, cy: h * 0.25, r: Math.min(w, h) * 0.35, hue: 340, speed: 0.3 },
        { cx: w * 0.8, cy: h * 0.65, r: Math.min(w, h) * 0.3, hue: 270, speed: -0.2 },
        { cx: w * 0.5, cy: h * 0.85, r: Math.min(w, h) * 0.25, hue: 30, speed: 0.15 },
      ];

      for (const orb of orbs) {
        const x = orb.cx + Math.sin(t * orb.speed) * 60;
        const y = orb.cy + Math.cos(t * orb.speed * 0.7) * 45;
        const hue = ((orb.hue + t * 3) % 360 + 360) % 360;
        const alpha = 0.035 + Math.sin(t * 0.5 + orb.hue) * 0.015;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, orb.r);
        gradient.addColorStop(0, `hsla(${hue}, 70%, 55%, ${alpha * 1.8})`);
        gradient.addColorStop(0.5, `hsla(${hue}, 60%, 50%, ${alpha})`);
        gradient.addColorStop(1, `hsla(${hue}, 50%, 40%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawParticles = (t: number) => {
      for (const p of particlesRef.current) {
        const twinkle = Math.sin(t * p.twinkleSpeed + p.phase) * 0.5 + 0.5;
        const alpha = p.baseOpacity * twinkle;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
    };

    const animate = () => {
      const { w, h } = sizeRef.current;

      if (prefersReducedMotion) {
        ctx.clearRect(0, 0, w, h);
        drawOrbs(0);
        getWaves().forEach((wave) => drawWave(wave, 0));
        drawParticles(0);
        return;
      }

      timeRef.current += 0.016;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);
      drawOrbs(t);
      getWaves().forEach((wave) => drawWave(wave, t));
      drawParticles(t);

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
