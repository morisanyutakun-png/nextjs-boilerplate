"use client";

import { useState, useEffect, useCallback } from "react";
import type { Tenant } from "@/lib/types";
import ScrollReveal from "./components/ScrollReveal";

/* ── SVG Icon Components ─────────────────────────────────── */
const SearchIcon = ({ className = "h-5 w-5 shrink-0 text-stone-400" }: { className?: string }) => (
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

export default function PortalTopPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState("すべて");
  const [loading, setLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);

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

  return (
    <>
      {/* ═══ ヒーロー — ブランド + エルゴノミクス検索 ═══ */}
      <section className="relative -mx-4 sm:-mx-6 -mt-6 sm:-mt-10 mb-12 sm:mb-16 overflow-hidden px-4 sm:px-6 pb-24 sm:pb-32 pt-16 sm:pt-24">
        {/* 背景 */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950" />
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-rose-500/[0.03] blur-[160px]" />

        {/* ── ブランドセクション ── */}
        <div className="relative mx-auto max-w-3xl text-center">
          {/* ブランドロゴ */}
          <div className="mb-6 sm:mb-8 animate-fade-in">
            <p
              className="text-[clamp(2.5rem,10vw,5rem)] font-black tracking-tighter leading-none select-none"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #fda4af 35%, #fb7185 55%, #e879f9 75%, #fbbf24 100%)",
                backgroundSize: "300% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "text-gradient-flow 8s ease infinite",
              }}
            >
              Yoyaku
            </p>
            <p className="mt-1 text-[10px] sm:text-[12px] font-medium tracking-[0.35em] text-white/20 uppercase">
              Booking Portal
            </p>
          </div>

          {/* タイトル */}
          <h1 className="mb-4 sm:mb-5 text-[clamp(1.5rem,4.5vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-white animate-fade-in-up">
            あなたにぴったりの
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #fda4af 0%, #fb7185 30%, #e879f9 60%, #fbbf24 100%)",
                backgroundSize: "200% auto",
                animation: "text-gradient-flow 6s linear infinite",
              }}
            >
              予約先を見つけよう
            </span>
          </h1>

          <p className="mx-auto mb-10 sm:mb-12 max-w-md text-[14px] sm:text-[16px] leading-relaxed text-white/35 font-light animate-fade-in-up" style={{ animationDelay: "0.12s" }}>
            厳選されたサロン・クリニックから、あなたに最適な一店を。
          </p>

          {/*
            検索バー — 人間工学・心理学ベース設計
            ───────────────────────────────
            フィッツの法則: 大きなターゲット分面で素早くクリック可能
            フォン・レストルフ効果: 周囲との視覚的差別化で注目を引く
            ゲシュタルト近接性: 検索バー直下にカテゴリショートカット
            色彩心理: フォーカス時の暖色グローで「歓迎感」
            アフォーダンス: アイコン+テキストで「検索できる」ことを明示
          */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.24s" }}>
            <div
              className={`search-container mx-auto max-w-xl rounded-[1.25rem] border-2 p-1 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                searchFocused
                  ? "border-rose-400/40 bg-white/[0.12] shadow-[0_0_0_4px_rgba(251,113,133,0.08),0_12px_48px_rgba(225,29,72,0.12)] scale-[1.02]"
                  : "border-white/[0.08] bg-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.15)]"
              }`}
              style={{ backdropFilter: "blur(24px) saturate(160%)" }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* 検索アイコン — アフォーダンス明示 */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-400 ${
                  searchFocused
                    ? "bg-rose-500/20 shadow-[0_0_20px_rgba(251,113,133,0.2)]"
                    : "bg-white/[0.06]"
                }`}>
                  <SearchIcon className={`h-5 w-5 transition-all duration-300 ${
                    searchFocused ? "text-rose-300 scale-110" : "text-white/30"
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  {/* ラベル — 何ができるか明示 (アフォーダンス) */}
                  <label className={`block text-[10px] font-medium tracking-wider uppercase transition-all duration-300 mb-0.5 ${
                    searchFocused ? "text-rose-300/70" : "text-white/20"
                  }`}>
                    キーワード検索
                  </label>
                  <input
                    type="text"
                    placeholder="サロン名・エリア・ジャンルで探す…"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className="w-full bg-transparent text-[16px] text-white placeholder-white/25 outline-none font-light leading-tight"
                  />
                </div>

                {/* クリアボタン or 検索ボタン */}
                {searchText ? (
                  <button
                    onClick={() => setSearchText("")}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/60 transition-all duration-200 active:scale-90 hover:bg-white/20 touch-target"
                    aria-label="検索をクリア"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                    searchFocused ? "bg-rose-500/25" : "bg-white/[0.04]"
                  }`}>
                    <svg className={`h-4 w-4 transition-colors duration-300 ${searchFocused ? "text-rose-300" : "text-white/15"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M3 8h18M3 12h12" />
                    </svg>
                  </div>
                )}
              </div>

              {/* クイックフィルター — ゲシュタルト近接性: 検索とカテゴリの近接配置 */}
              <div className="flex gap-1.5 px-2 pb-2 overflow-x-auto scrollbar-hide">
                {["人気サロン", "クリニック", "初回割引", "駅近"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchText(tag)}
                    className="whitespace-nowrap rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/35 transition-all duration-200 hover:bg-white/[0.12] hover:text-white/60 active:scale-95"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 信頼指標 — 社会的証明 (social proof) */}
          <div className="mt-10 sm:mt-12 flex items-center justify-center gap-5 sm:gap-8 animate-fade-in" style={{ animationDelay: "0.45s" }}>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[20px] sm:text-[24px] font-bold text-white/80 tabular-nums">150+</span>
              <span className="text-[10px] sm:text-[11px] text-white/25 tracking-wider">導入店舗</span>
            </div>
            <div className="h-8 w-px bg-white/[0.06]" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[20px] sm:text-[24px] font-bold text-white/80 tabular-nums">4.8</span>
              <span className="text-[10px] sm:text-[11px] text-white/25 tracking-wider">平均評価</span>
            </div>
            <div className="h-8 w-px bg-white/[0.06]" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[20px] sm:text-[24px] font-bold text-white/80 tabular-nums">24h</span>
              <span className="text-[10px] sm:text-[11px] text-white/25 tracking-wider">予約可能</span>
            </div>
          </div>
        </div>

        {/* ボトムフェード */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-stone-50 to-transparent" />
      </section>

      {/* ═══ カテゴリタブ — Apple-style pill ═══ */}
      <ScrollReveal variant="fadeUp" delay={50}>
        <section className="mb-8 sm:mb-10 -mt-8 sm:-mt-12 flex gap-2 overflow-x-auto px-1 pb-3 scrollbar-hide scroll-snap-x">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(cat.label)}
              className={`group flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[12px] sm:text-[13px] font-medium transition-all duration-300 active:scale-95 ${
                activeCategory === cat.label
                  ? "bg-stone-900 text-white shadow-md shadow-stone-900/20"
                  : "bg-white text-stone-500 shadow-sm shadow-stone-200/50 hover:text-stone-800 hover:shadow-md"
              }`}
            >
              {cat.label !== "すべて" && <CategoryIcon label={cat.label} />}
              {cat.label}
            </button>
          ))}
        </section>
      </ScrollReveal>

      {/* ═══ 件数 ═══ */}
      {!loading && (
        <ScrollReveal variant="fadeIn">
          <div className="mb-6 sm:mb-8 flex items-center justify-between">
            <p className="text-[13px] sm:text-sm text-stone-400">
              <span className="text-lg sm:text-xl font-semibold text-stone-800 tabular-nums">{tenants.length}</span>
              <span className="ml-1">件</span>
            </p>
            <span className="text-[11px] sm:text-[12px] text-stone-400">おすすめ順</span>
          </div>
        </ScrollReveal>
      )}

      {/* ═══ テナント一覧 ═══ */}
      {loading ? (
        <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="aspect-[16/10] sm:aspect-[4/3] animate-shimmer" />
              <div className="space-y-3 p-5">
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
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-stone-100">
              <SearchIcon className="h-7 w-7 text-stone-300" />
            </div>
            <p className="mb-2 text-lg font-semibold text-stone-700">見つかりませんでした</p>
            <p className="mb-8 text-[13px] text-stone-400">検索条件を変更してお試しください</p>
            <button
              onClick={() => {
                setSearchText("");
                setActiveCategory("すべて");
              }}
              className="group inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-2.5 text-[13px] font-medium text-white transition-all duration-300 hover:bg-stone-800 active:scale-95 touch-target"
            >
              条件をリセット
            </button>
          </div>
        </ScrollReveal>
      ) : (
        <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t, idx) => (
            <ScrollReveal key={t.slug} variant="fadeUp" delay={idx * 60}>
              <TenantCard tenant={t} />
            </ScrollReveal>
          ))}
        </div>
      )}

      {/* ═══ ボトムCTA — Apple風ミニマルダーク ═══ */}
      <ScrollReveal variant="scale" delay={80}>
        <section className="mt-20 sm:mt-28 overflow-hidden rounded-3xl bg-stone-950 p-10 sm:p-16 text-center relative">
          {/* ソフトグロー背景 */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-rose-500/[0.04] blur-[120px]" />

          <div className="relative">
            <p className="mb-3 text-[12px] font-medium tracking-widest text-white/30 uppercase">Partner Program</p>
            <h2 className="mb-4 text-[clamp(1.5rem,4vw,2.5rem)] font-bold leading-tight tracking-tight text-white">
              あなたのお店も
              <br className="sm:hidden" />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(135deg, #fda4af, #fb7185, #fbbf24)",
                }}
              >
                掲載しませんか？
              </span>
            </h2>
            <p className="mx-auto mb-10 max-w-md text-[14px] sm:text-[15px] leading-relaxed text-white/35 font-light">
              Web予約システムを導入して、
              <br className="hidden sm:block" />
              24時間予約受付を始めましょう。
            </p>
            <span className="group inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-[14px] font-semibold text-stone-900 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer touch-target">
              お問い合わせ
              <ArrowRightIcon className="h-4 w-4" />
            </span>
          </div>
        </section>
      </ScrollReveal>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   テナントカード — Apple-inspired clean design
   ════════════════════════════════════════════════════════════ */
function TenantCard({ tenant }: { tenant: Tenant }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <a
      href={`/t/${tenant.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm shadow-stone-200/60 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-xl hover:shadow-stone-200/80 hover:-translate-y-1 active:scale-[0.98]"
    >
      {/* 写真 */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] overflow-hidden bg-stone-100">
        {tenant.photoUrl ? (
          <img
            src={tenant.photoUrl}
            alt={tenant.name}
            onLoad={() => setImgLoaded(true)}
            className={`h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100">
            <BuildingIcon />
          </div>
        )}
        {/* カテゴリバッジ */}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] sm:text-[11px] font-medium text-stone-600 shadow-sm backdrop-blur-md">
          <CategoryIcon label={tenant.category} />
          {tenant.category}
        </span>
      </div>

      {/* テキスト */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="mb-1 text-[15px] sm:text-base font-semibold text-stone-900 transition-colors duration-300 group-hover:text-rose-600 line-clamp-1">
          {tenant.name}
        </h2>

        {tenant.catchCopy && (
          <p className="mb-3 text-[12px] sm:text-[13px] leading-relaxed text-stone-400 line-clamp-2 font-light">
            {tenant.catchCopy}
          </p>
        )}

        {/* メニュープレビュー */}
        {tenant.menus && tenant.menus.length > 0 && (
          <div className="mb-3 rounded-xl bg-stone-50 p-3 space-y-2 transition-colors duration-300 group-hover:bg-rose-50/50">
            {tenant.menus.slice(0, 2).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-[12px] sm:text-[13px]">
                <span className="text-stone-600 truncate">{m.name}</span>
                <span className="ml-2 font-semibold text-rose-600 whitespace-nowrap">{m.price}</span>
              </div>
            ))}
          </div>
        )}

        {/* タグ */}
        {tenant.tags && tenant.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {tenant.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-stone-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-stone-500">
                <CheckIcon />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-1">
          <span className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-[12px] sm:text-[13px] font-medium text-white transition-all duration-300 group-hover:bg-rose-600 group">
            <CalendarIcon className="h-3.5 w-3.5" />
            詳細・予約はこちら
            <ArrowRightIcon className="h-3 w-3" />
          </span>
        </div>
      </div>
    </a>
  );
}
