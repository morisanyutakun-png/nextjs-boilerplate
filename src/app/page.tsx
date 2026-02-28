"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Tenant } from "@/lib/types";
import ScrollReveal from "./components/ScrollReveal";

/* ── SVG Icon Components ─────────────────────────────────── */
const SearchIcon = ({ className = "h-5 w-5 shrink-0 text-white/40" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const CalendarIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const BuildingIcon = () => (
  <svg className="h-8 w-8 sm:h-10 sm:w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const SparkleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
  </svg>
);
const ArrowRightIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={`${className} transition-transform duration-300 group-hover:translate-x-1`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);
const CheckIcon = () => (
  <svg className="h-3 w-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
const StarIcon = () => (
  <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
    <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
  </svg>
);

// カテゴリプリセット
const CATEGORIES = [
  { label: "すべて" },
  { label: "美容・サロン" },
  { label: "医療・クリニック" },
  { label: "IT・Web" },
  { label: "飲食" },
  { label: "教育・スクール" },
  { label: "その他" },
];

// カテゴリ別SVGアイコン
function CategoryIcon({ label, className = "h-3.5 w-3.5" }: { label: string; className?: string }) {
  switch (label) {
    case "美容・サロン":
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>;
    case "医療・クリニック":
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>;
    case "IT・Web":
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" /></svg>;
    case "飲食":
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37" /></svg>;
    case "教育・スクール":
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>;
    default:
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
  }
}

/* Ambient floating particles — positioned randomly, animated continuously */
const PARTICLES = [
  { size: 3, left: 12, top: 18, dur: 9, delay: 0 },
  { size: 5, left: 25, top: 60, dur: 12, delay: 2 },
  { size: 4, left: 45, top: 30, dur: 10, delay: 4 },
  { size: 6, left: 65, top: 70, dur: 14, delay: 1 },
  { size: 3, left: 80, top: 25, dur: 11, delay: 3 },
  { size: 4, left: 90, top: 50, dur: 13, delay: 5 },
  { size: 5, left: 35, top: 80, dur: 10, delay: 2.5 },
  { size: 3, left: 55, top: 15, dur: 11, delay: 3.5 },
];

export default function PortalTopPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState("すべて");
  const [loading, setLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  /* ── Scroll-linked parallax tracking ── */
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fetchTenants = useCallback(() => {
    const params = new URLSearchParams();
    if (searchText) params.set("name", searchText);
    if (activeCategory !== "すべて") params.set("category", activeCategory);

    setLoading(true);
    fetch(`/api/tenants?${params.toString()}`)
      .then((res) => res.json())
      .then((data: Tenant[]) => {
        setTenants(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [searchText, activeCategory]);

  useEffect(() => {
    const timer = setTimeout(fetchTenants, 300);
    return () => clearTimeout(timer);
  }, [fetchTenants]);

  // Parallax factors (capped for perf)
  const heroParallax = Math.min(scrollY * 0.35, 200);
  const textParallax = Math.min(scrollY * 0.12, 80);
  const orbParallax = Math.min(scrollY * 0.2, 120);

  return (
    <>
      {/* ═══ ヒーロー — scroll-linked parallax ═══ */}
      <section className="relative -mx-4 sm:-mx-5 -mt-6 sm:-mt-10 mb-10 sm:mb-14 overflow-hidden px-4 sm:px-5 pb-16 sm:pb-20 pt-16 sm:pt-24">
        {/* 多層背景 — ダイナミックグラデーション (常時シフト) */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-stone-950 via-stone-900 to-rose-950 animate-gradient-shift"
          style={{ transform: `translateY(${heroParallax}px)`, willChange: "transform" }}
        />

        {/* ドットパターン — parallax遅延 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
            transform: `translateY(${heroParallax * 0.5}px)`,
          }}
        />

        {/* 浮遊オーブ — parallax + 常時浮遊 */}
        <div
          className="absolute -right-24 sm:-right-32 -top-24 sm:-top-32 h-[400px] sm:h-[600px] w-[400px] sm:w-[600px] rounded-full bg-rose-500/[0.08] blur-[120px] sm:blur-[150px] animate-orb-1"
          style={{ transform: `translate(${-orbParallax * 0.3}px, ${orbParallax}px)` }}
        />
        <div
          className="absolute -bottom-32 sm:-bottom-48 -left-24 sm:-left-32 h-[350px] sm:h-[500px] w-[350px] sm:w-[500px] rounded-full bg-amber-500/[0.06] blur-[100px] sm:blur-[120px] animate-orb-2"
          style={{ transform: `translate(${orbParallax * 0.2}px, ${-orbParallax * 0.5}px)` }}
        />
        <div className="absolute right-1/4 top-1/3 h-[200px] sm:h-[300px] w-[200px] sm:w-[300px] rounded-full bg-pink-500/[0.04] blur-[80px] sm:blur-[100px] animate-glow-ambient" />

        {/* 浮遊パーティクル — 常時アニメーション */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/[0.06] animate-ambient-float"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.left}%`,
              top: `${p.top}%`,
              ["--float-duration" as string]: `${p.dur}s`,
              ["--float-delay" as string]: `${p.delay}s`,
            }}
          />
        ))}

        {/* 回転リング — 常時回転 + parallax */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] sm:h-[800px] w-[500px] sm:w-[800px] opacity-[0.02] animate-rotate-slow"
          style={{ transform: `translate(-50%, calc(-50% + ${heroParallax * 0.3}px))` }}
        >
          <div className="absolute inset-0 rounded-full border border-white" />
          <div className="absolute inset-[40px] sm:inset-[60px] rounded-full border border-white" />
          <div className="absolute inset-[80px] sm:inset-[120px] rounded-full border border-white" />
        </div>

        {/* テキストコンテンツ — parallax遅延 */}
        <div
          className="relative mx-auto max-w-3xl text-center"
          style={{ transform: `translateY(${textParallax}px)`, willChange: "transform" }}
        >
          {/* バッジ — shimmer */}
          <div
            className="mb-5 sm:mb-8 inline-flex items-center gap-2 sm:gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 sm:px-5 py-1.5 sm:py-2 backdrop-blur-sm animate-fade-in animate-shimmer-slide"
            style={{ animationDelay: "0.1s" }}
          >
            <SparkleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-300/80 animate-twinkle" />
            <span className="text-[11px] sm:text-[13px] font-medium text-white/60">信頼できるサロン・クリニックを厳選</span>
          </div>

          {/* タイトル — fluid typography + 常時グラデーション */}
          <h1
            className="mb-4 sm:mb-5 text-hero font-extrabold text-white animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            あなたにぴったりの
            <br />
            <span className="bg-gradient-to-r from-rose-300 via-pink-300 to-amber-200 bg-clip-text text-transparent animate-text-gradient bg-[length:200%_auto]">
              予約先を見つけよう
            </span>
          </h1>

          <p
            className="mx-auto mb-8 sm:mb-12 max-w-lg text-[13px] sm:text-base leading-relaxed text-white/40 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            導入企業のサービスを比較して、Webで簡単に予約できます
          </p>

          {/* 検索バー — glass + focus animation */}
          <div
            className={`animate-fade-in-up mx-auto flex max-w-xl items-center gap-3 rounded-2xl border px-4 sm:px-5 py-3.5 sm:py-4 shadow-2xl shadow-black/20 backdrop-blur-xl transition-all duration-500 ${
              searchFocused
                ? "border-rose-400/30 bg-white/[0.12] scale-[1.02]"
                : "border-white/[0.08] bg-white/[0.06]"
            }`}
            style={{ animationDelay: "0.45s" }}
          >
            <SearchIcon className={`h-5 w-5 shrink-0 transition-colors duration-300 ${searchFocused ? "text-rose-300" : "text-white/30"}`} />
            <input
              type="text"
              placeholder="サロン名・クリニック名で検索…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full bg-transparent py-0.5 text-[14px] sm:text-[15px] text-white placeholder-white/25 outline-none"
            />
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 transition-all duration-200 active:scale-90 hover:bg-white/20 hover:text-white touch-target"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* 統計バッジ — 常時ツインクル */}
          <div
            className="mt-6 sm:mt-8 flex items-center justify-center gap-4 sm:gap-6 animate-fade-in"
            style={{ animationDelay: "0.6s" }}
          >
            <div className="flex items-center gap-1.5 text-white/30">
              <div className="flex -space-x-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-stone-900 bg-gradient-to-br from-stone-600 to-stone-700" />
                ))}
              </div>
              <span className="ml-1 text-[11px] sm:text-[12px]">多数導入</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-0.5 text-white/30">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="animate-twinkle" style={{ ["--twinkle-delay" as string]: `${i * 0.4}s`, ["--twinkle-duration" as string]: "2.5s" }}>
                    <StarIcon />
                  </span>
                ))}
              </div>
              <span className="ml-1 text-[11px] sm:text-[12px]">高評価</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ カテゴリタブ — snap scroll for mobile ═══ */}
      <ScrollReveal variant="fadeUp" delay={50}>
        <section className="mb-8 sm:mb-10 -mt-6 sm:-mt-10 flex gap-2 sm:gap-2.5 overflow-x-auto px-1 pb-3 scrollbar-hide scroll-snap-x">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(cat.label)}
              className={`category-tab group flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-full px-4 sm:px-5 py-2.5 text-[12px] sm:text-[13px] font-semibold transition-all duration-400 touch-ripple active:scale-95 ${
                activeCategory === cat.label
                  ? "active bg-stone-900 text-white shadow-lg shadow-stone-900/25"
                  : "border border-stone-200/80 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-800"
              }`}
            >
              {cat.label === "すべて" ? (
                <span className={`text-[11px] transition-transform duration-500 ${activeCategory === cat.label ? "rotate-[270deg]" : ""}`}>✦</span>
              ) : (
                <CategoryIcon label={cat.label} />
              )}
              {cat.label}
              {/* Active indicator dot */}
              {activeCategory === cat.label && (
                <span className="relative ml-0.5 flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-400" />
                </span>
              )}
            </button>
          ))}
        </section>
      </ScrollReveal>

      {/* ═══ 件数 ═══ */}
      {!loading && (
        <ScrollReveal variant="fadeIn">
          <div className="mb-6 sm:mb-8 flex items-center justify-between">
            <p className="text-[13px] sm:text-sm font-medium text-stone-400">
              <span className="text-lg sm:text-xl font-bold text-stone-800 tabular-nums">{tenants.length}</span>
              <span className="ml-1 sm:ml-1.5">件の導入企業</span>
            </p>
            <div className="flex items-center gap-1 text-[11px] sm:text-[12px] text-stone-400">
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-3L16.5 18m0 0L12 13.5m4.5 4.5V4.5" />
              </svg>
              おすすめ順
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* ═══ テナント一覧 ═══ */}
      {loading ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-premium overflow-hidden p-0">
              <div className="aspect-[16/10] sm:aspect-[4/3] animate-shimmer" />
              <div className="space-y-3 p-4 sm:p-5">
                <div className="h-5 w-2/3 rounded-lg animate-shimmer" />
                <div className="h-3 w-full rounded animate-shimmer" />
                <div className="h-3 w-1/2 rounded animate-shimmer" />
                <div className="mt-4 h-11 w-full rounded-xl animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <ScrollReveal variant="scale">
          <div className="py-20 sm:py-28 text-center">
            <div className="mx-auto mb-5 sm:mb-6 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-stone-100 animate-breathe" style={{ ["--breathe-duration" as string]: "3s" }}>
              <SearchIcon className="h-7 w-7 sm:h-8 sm:w-8 text-stone-300" />
            </div>
            <p className="mb-2 text-lg sm:text-xl font-bold text-stone-700">該当する企業が見つかりませんでした</p>
            <p className="mb-6 sm:mb-8 text-[13px] sm:text-sm text-stone-400">検索条件を変更してお試しください</p>
            <button
              onClick={() => {
                setSearchText("");
                setActiveCategory("すべて");
              }}
              className="group inline-flex items-center gap-2 rounded-full border border-stone-200 px-6 sm:px-7 py-3 text-[13px] sm:text-sm font-semibold text-stone-600 transition-all duration-300 hover:border-rose-300 hover:text-rose-600 hover:shadow-md active:scale-95 touch-target"
            >
              <svg className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-180 group-active:-rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.012 14.339V19.331" />
              </svg>
              条件をリセット
            </button>
          </div>
        </ScrollReveal>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t, idx) => (
            <ScrollReveal key={t.slug} variant="fadeUp" delay={idx * 60}>
              <div
                className="animate-breathe"
                style={{
                  ["--breathe-delay" as string]: `${idx * 0.8}s`,
                  ["--breathe-duration" as string]: `${4 + (idx % 3) * 0.5}s`,
                }}
              >
                <TenantCard tenant={t} />
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}

      {/* ═══ ボトム案内 ═══ */}
      <ScrollReveal variant="scale" delay={80}>
        <section className="mt-16 sm:mt-24 overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] border border-stone-800/50 bg-gradient-to-br from-stone-950 via-stone-900 to-rose-950 p-8 sm:p-12 lg:p-16 text-center relative">
          {/* 装飾 — 常時浮遊 */}
          <div className="absolute -right-16 sm:-right-24 -top-16 sm:-top-24 h-60 sm:h-80 w-60 sm:w-80 rounded-full bg-rose-500/[0.07] blur-[80px] sm:blur-[100px] animate-orb-1" />
          <div className="absolute -bottom-12 sm:-bottom-16 -left-12 sm:-left-16 h-48 sm:h-64 w-48 sm:w-64 rounded-full bg-amber-500/[0.05] blur-[60px] sm:blur-[80px] animate-orb-2" />
          {/* パーティクル */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/[0.04] animate-ambient-float"
              style={{
                width: 3 + i * 2,
                height: 3 + i * 2,
                left: `${20 + i * 20}%`,
                top: `${25 + (i % 2) * 40}%`,
                ["--float-duration" as string]: `${9 + i * 2}s`,
                ["--float-delay" as string]: `${i}s`,
              }}
            />
          ))}

          <div className="relative">
            <span className="mb-4 sm:mb-6 inline-flex items-center gap-2 sm:gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-[13px] font-medium text-white/50 backdrop-blur-sm animate-shimmer-slide">
              <SparkleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-300/70 animate-twinkle" />
              パートナー募集中
            </span>
            <h2 className="mb-3 sm:mb-4 text-section-title font-bold text-white tracking-tight">
              あなたのお店も
              <br className="sm:hidden" />
              <span className="bg-gradient-to-r from-rose-300 to-amber-200 bg-clip-text text-transparent animate-text-gradient bg-[length:200%_auto]"> 掲載しませんか？</span>
            </h2>
            <p className="mx-auto mb-8 sm:mb-10 max-w-lg text-[13px] sm:text-[15px] leading-relaxed text-white/40">
              Web予約システムを導入して、24時間予約受付を始めましょう。
              <br className="hidden sm:block" />
              初期費用無料で簡単に始められます。
            </p>
            <span className="group inline-flex items-center gap-2.5 sm:gap-3 rounded-full bg-white px-7 sm:px-9 py-3.5 sm:py-4 text-[13px] sm:text-sm font-bold text-stone-900 shadow-2xl shadow-black/15 transition-all duration-300 hover:shadow-3xl hover:shadow-black/25 hover:scale-[1.03] active:scale-[0.97] cursor-pointer touch-target animate-pulse-glow">
              お問い合わせはこちら
              <ArrowRightIcon className="h-4 w-4" />
            </span>
          </div>
        </section>
      </ScrollReveal>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   テナントカード — Mobile-first + Continuous micro-interactions
   ════════════════════════════════════════════════════════════ */
function TenantCard({ tenant }: { tenant: Tenant }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <a
      href={`/t/${tenant.slug}`}
      className="group card-premium touch-ripple flex flex-col overflow-hidden"
    >
      {/* 写真 */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] overflow-hidden bg-stone-100">
        {tenant.photoUrl ? (
          <img
            src={tenant.photoUrl}
            alt={tenant.name}
            onLoad={() => setImgLoaded(true)}
            className={`h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.06] group-active:scale-[1.03] ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100">
            <BuildingIcon />
          </div>
        )}
        {/* Hover overlay */}
        <div className="card-overlay absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        {/* カテゴリバッジ — 常に軽く揺れる */}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/85 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold text-stone-700 shadow-sm backdrop-blur-md animate-sway">
          <CategoryIcon label={tenant.category} />
          {tenant.category}
        </span>
        {/* CTA hint circle — fade in on hover/touch */}
        <div className="absolute bottom-3 right-3 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/90 shadow-lg opacity-0 transition-all duration-300 group-hover:opacity-100 group-active:opacity-100 group-hover:scale-100 group-active:scale-100 scale-75 backdrop-blur-sm">
          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>

      {/* テキスト */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="mb-1 sm:mb-1.5 text-[15px] sm:text-base font-bold text-stone-900 transition-colors duration-300 group-hover:text-rose-600 group-active:text-rose-600 line-clamp-1">
          {tenant.name}
        </h2>

        {tenant.catchCopy && (
          <p className="mb-3 sm:mb-4 text-[12px] sm:text-[13px] leading-relaxed text-stone-400 line-clamp-2">
            {tenant.catchCopy}
          </p>
        )}

        {/* メニュープレビュー */}
        {tenant.menus && tenant.menus.length > 0 && (
          <div className="mb-3 sm:mb-4 rounded-xl border border-stone-100 bg-stone-50/60 p-3 sm:p-3.5 space-y-2 sm:space-y-2.5 transition-colors duration-300 group-hover:bg-rose-50/40 group-hover:border-rose-100/80">
            {tenant.menus.slice(0, 2).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-[12px] sm:text-[13px]">
                <span className="text-stone-600 truncate">{m.name}</span>
                <span className="ml-2 font-bold text-rose-600 whitespace-nowrap">{m.price}</span>
              </div>
            ))}
          </div>
        )}

        {/* タグ */}
        {tenant.tags && tenant.tags.length > 0 && (
          <div className="mb-3 sm:mb-4 flex flex-wrap gap-1 sm:gap-1.5">
            {tenant.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-stone-100 bg-stone-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-stone-500">
                <CheckIcon />
                {tag}
              </span>
            ))}
            {tenant.tags.length > 3 && (
              <span className="rounded-md bg-stone-50 px-2 py-0.5 text-[9px] sm:text-[10px] text-stone-400">+{tenant.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto">
          <span className="btn-premium flex items-center justify-center gap-2 py-3 text-[12px] sm:text-[13px] group touch-target animate-pulse-glow">
            <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            詳細・予約はこちら
            <ArrowRightIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </span>
        </div>
      </div>
    </a>
  );
}
