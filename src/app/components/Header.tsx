"use client";

import { useState, useEffect } from "react";

/**
 * Premium Animated Header
 *
 * Apple Music風のダイナミックヘッダー:
 * - スクロールに連動してコンパクト化
 * - frosted glass の透明度がスクロールで変化
 * - ロゴにマイクロインタラクション
 * - ナビゲーションのホバーにアンダーラインアニメーション
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      // ヘッダーの背景切替 (48px以降でコンパクト)
      setScrolled(currentY > 48);

      // スクロール方向判定 — 下スクロールで隠す (モバイルUXパターン)
      if (currentY > 400) {
        setVisible(currentY < lastScrollY || currentY < 100);
      } else {
        setVisible(true);
      }

      setLastScrollY(currentY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        visible ? "translate-y-0" : "-translate-y-full"
      } ${
        scrolled
          ? "glass-dark border-b border-white/[0.06] shadow-lg shadow-black/5"
          : "bg-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-5 transition-all duration-500 ${
          scrolled ? "py-2.5" : "py-4"
        }`}
      >
        {/* ─── ロゴ ─── */}
        <a href="/" className="group flex items-center gap-3">
          <span
            className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 shadow-lg shadow-rose-500/25 transition-all duration-500 group-hover:shadow-rose-500/40 group-hover:scale-110 ${
              scrolled ? "h-8 w-8" : "h-10 w-10"
            }`}
          >
            <svg
              className={`text-white transition-all duration-500 ${
                scrolled ? "h-4 w-4" : "h-5 w-5"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {/* Pulse ring on hover */}
            <span className="absolute inset-0 rounded-xl bg-rose-400/30 opacity-0 transition-opacity duration-300 group-hover:animate-ping group-hover:opacity-100" />
            {/* Online indicator */}
            <span
              className={`absolute rounded-full border-2 bg-emerald-400 shadow-sm shadow-emerald-400/50 transition-all duration-500 ${
                scrolled
                  ? "-right-0.5 -top-0.5 h-2 w-2 border-stone-900"
                  : "-right-0.5 -top-0.5 h-2.5 w-2.5 border-stone-900"
              }`}
            />
          </span>

          <div className="flex flex-col overflow-hidden">
            <span
              className={`font-bold tracking-tight transition-all duration-500 ${
                scrolled
                  ? "text-[14px] text-white"
                  : "text-[16px] text-white"
              }`}
            >
              予約ポータル
            </span>
            <span
              className={`text-[10px] font-medium tracking-[0.2em] transition-all duration-500 ${
                scrolled
                  ? "h-0 opacity-0 -translate-y-2"
                  : "h-auto opacity-100 translate-y-0 text-white/40"
              }`}
            >
              BOOKING PORTAL
            </span>
          </div>
        </a>

        {/* ─── ナビゲーション ─── */}
        <nav className="flex items-center gap-5">
          <a
            href="/"
            className="group relative text-[13px] font-medium text-white/60 transition-colors duration-300 hover:text-white"
          >
            トップ
            {/* Animated underline */}
            <span className="absolute -bottom-1 left-0 h-[2px] w-0 rounded-full bg-gradient-to-r from-rose-400 to-pink-400 transition-all duration-300 group-hover:w-full" />
          </a>

          <span
            className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] font-semibold tracking-wide text-white/70 backdrop-blur-sm transition-all duration-500 ${
              scrolled
                ? "px-3 py-1 text-[10px]"
                : "px-3.5 py-1.5 text-[11px]"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            </span>
            公式ポータル
          </span>
        </nav>
      </div>

      {/* Progress line — shows scroll progress */}
      <div
        className={`h-[2px] bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 transition-opacity duration-300 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
        style={{
          width: typeof window !== "undefined" ? undefined : "0%",
        }}
        id="scroll-progress"
      />
    </header>
  );
}
