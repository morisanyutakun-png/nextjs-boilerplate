"use client";

import { useState, useEffect } from "react";

/**
 * Premium Animated Header — Mobile-first
 *
 * - スクロールでコンパクト化 + frosted glass
 * - 下スクロールで自動非表示 (モバイルUXパターン)
 * - タップフレンドリーなサイズ (44px+)
 * - 有機的なオンラインインジケーター
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        setScrolled(currentY > 32);

        if (currentY > 300) {
          setVisible(currentY < lastScrollY || currentY < 80);
        } else {
          setVisible(true);
        }
        setLastScrollY(currentY);
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] safe-top ${
        visible ? "translate-y-0" : "-translate-y-full"
      } ${
        scrolled
          ? "glass-dark border-b border-white/[0.06] shadow-lg shadow-black/10"
          : "bg-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-5 transition-all duration-500 ${
          scrolled ? "py-2" : "py-3 sm:py-4"
        }`}
      >
        {/* ─── ロゴ ─── */}
        <a href="/" className="group flex items-center gap-2.5 touch-target">
          <span
            className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 shadow-lg shadow-rose-500/25 transition-all duration-500 group-active:scale-95 ${
              scrolled ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"
            }`}
          >
            <svg
              className={`text-white transition-all duration-500 ${
                scrolled ? "h-4 w-4" : "h-[18px] w-[18px] sm:h-5 sm:w-5"
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
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-xl bg-rose-400/30 opacity-0 transition-opacity duration-300 group-hover:animate-ping group-hover:opacity-100" />
            {/* Online dot — continuous pulse */}
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-stone-900 bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            </span>
          </span>

          <div className="flex flex-col">
            <span
              className={`font-bold tracking-tight transition-all duration-500 ${
                scrolled ? "text-[13px] text-white" : "text-[15px] sm:text-[16px] text-white"
              }`}
            >
              予約ポータル
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-medium tracking-[0.2em] transition-all duration-500 ${
                scrolled
                  ? "h-0 opacity-0 -translate-y-1"
                  : "h-auto opacity-100 translate-y-0 text-white/40"
              }`}
            >
              BOOKING PORTAL
            </span>
          </div>
        </a>

        {/* ─── ナビ ─── */}
        <nav className="flex items-center gap-3 sm:gap-5">
          <a
            href="/"
            className="group relative hidden sm:flex text-[13px] font-medium text-white/60 transition-colors duration-300 hover:text-white touch-target items-center justify-center"
          >
            トップ
            <span className="absolute -bottom-1 left-0 h-[2px] w-0 rounded-full bg-gradient-to-r from-rose-400 to-pink-400 transition-all duration-300 group-hover:w-full" />
          </a>

          <span
            className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] font-semibold tracking-wide text-white/70 backdrop-blur-sm transition-all duration-500 ${
              scrolled
                ? "px-2.5 py-1 text-[10px]"
                : "px-3 py-1.5 text-[10px] sm:text-[11px]"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            </span>
            公式
          </span>
        </nav>
      </div>
    </header>
  );
}
