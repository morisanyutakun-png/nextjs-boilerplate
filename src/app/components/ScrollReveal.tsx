"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Animation variant */
  variant?: "fadeUp" | "fadeIn" | "slideLeft" | "slideRight" | "scale";
}

/**
 * ScrollReveal — Intersection Observer ベースのスクロール表示アニメーション
 *
 * 人間工学に基づく設計:
 * - 視線の移動方向に合わせた自然な出現方向
 * - 350ms duration — 脳が「動き」として認識できる最短時間
 * - ease-out カーブ — 自然な減速で注意を引きすぎない
 */
export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  variant = "fadeUp",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.classList.add("scroll-revealed");
          }, delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`scroll-reveal scroll-reveal-${variant} ${className}`}>
      {children}
    </div>
  );
}
