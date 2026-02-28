"use client";

import { useState, useEffect } from "react";

/**
 * Apple-Inspired Premium Header
 *
 * - 超薄型フロステッドグラス
 * - シマーライン装飾
 * - スクロールでエレガントに変形
 * - モバイルファースト
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
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] safe-top ${
        visible ? "translate-y-0" : "-translate-y-full"
      } ${
        scrolled
          ? "header-glass border-b border-white/[0.08]"
          : "bg-transparent"
      }`}
    >
      {/* ── シマーライン (ヘッダー下部の光の帯) ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-px transition-opacity duration-700 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-full w-full bg-gradient-to-r from-transparent via-rose-400/40 to-transparent animate-header-shimmer" />
      </div>

      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 transition-all duration-500 ${
          scrolled ? "py-2.5" : "py-3 sm:py-4"
        }`}
      >
        {/* ─── ロゴ ─── */}
        <a href="/" className="group flex items-center gap-3 touch-target">
          <span
            className={`relative flex items-center justify-center rounded-2xl transition-all duration-500 group-active:scale-95 ${
              scrolled ? "h-8 w-8 rounded-xl" : "h-10 w-10 sm:h-11 sm:w-11"
            }`}
            style={{
              background: "linear-gradient(135deg, #e11d48 0%, #be123c 40%, #9f1239 100%)",
              boxShadow: "0 4px 20px rgba(225,29,72,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <svg
              className={`text-white transition-all duration-500 ${scrolled ? "h-4 w-4" : "h-5 w-5"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {/* Glow ring */}
            <span className="absolute -inset-[1px] rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "linear-gradient(135deg, rgba(251,113,133,0.4), rgba(190,18,60,0.2))", filter: "blur(4px)" }} />
          </span>

          <div className="flex flex-col">
            <span
              className={`font-bold tracking-tight transition-all duration-500 ${
                scrolled ? "text-[13px] text-white" : "text-[15px] sm:text-base text-white"
              }`}
            >
              Yoyaku
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-medium tracking-[0.15em] transition-all duration-500 overflow-hidden ${
                scrolled
                  ? "max-h-0 opacity-0 -translate-y-1"
                  : "max-h-4 opacity-100 translate-y-0 text-white/35"
              }`}
            >
              BOOKING PORTAL
            </span>
          </div>
        </a>

        {/* ─── ナビ ─── */}
        <nav className="flex items-center gap-2 sm:gap-4">
          {/* ナビリンク群 */}
          <div className="hidden sm:flex items-center gap-1">
            {["トップ", "検索"].map((label) => (
              <a
                key={label}
                href="/"
                className="group relative px-3 py-1.5 text-[13px] font-medium text-white/50 transition-colors duration-300 hover:text-white touch-target flex items-center justify-center rounded-lg hover:bg-white/[0.06]"
              >
                {label}
              </a>
            ))}
          </div>

          {/* ステータスバッジ */}
          <div
            className={`flex items-center gap-2 rounded-full border border-white/[0.08] font-medium tracking-wide text-white/60 transition-all duration-500 ${
              scrolled
                ? "bg-white/[0.04] px-2.5 py-1 text-[10px]"
                : "bg-white/[0.05] px-3 py-1.5 text-[10px] sm:text-[11px]"
            }`}
            style={{ backdropFilter: "blur(12px) saturate(160%)" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.6)" }} />
            </span>
            <span>公式</span>
          </div>
        </nav>
      </div>
    </header>
  );
}
