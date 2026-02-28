"use client";

import { useState, useEffect, useCallback } from "react";
import type { Tenant } from "@/lib/types";

/* ── SVG Icon Components ─────────────────────────────────── */
const SearchIcon = () => (
  <svg className="h-5 w-5 shrink-0 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const CalendarIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const BuildingIcon = () => (
  <svg className="h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const SparkleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);
const CheckIcon = () => (
  <svg className="h-3 w-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

// カテゴリプリセット — アイコン付き
const CATEGORIES = [
  { label: "すべて", icon: "✦" },
  { label: "美容・サロン", icon: "" },
  { label: "医療・クリニック", icon: "" },
  { label: "IT・Web", icon: "" },
  { label: "飲食", icon: "" },
  { label: "教育・スクール", icon: "" },
  { label: "その他", icon: "" },
];

// カテゴリ別SVGアイコン
function CategoryIcon({ label }: { label: string }) {
  const cls = "h-3.5 w-3.5";
  switch (label) {
    case "美容・サロン":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>;
    case "医療・クリニック":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>;
    case "IT・Web":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" /></svg>;
    case "飲食":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37" /></svg>;
    case "教育・スクール":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>;
    default:
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
  }
}

export default function PortalTopPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState("すべて");
  const [loading, setLoading] = useState(true);

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
      {/* ─── ヒーロー ─── */}
      <section className="relative -mx-5 -mt-10 mb-12 overflow-hidden px-5 pb-16 pt-20 sm:rounded-b-[2.5rem]">
        {/* 背景グラデーション */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-rose-950" />
        {/* 装飾パターン */}
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px"}} />
        {/* グロー装飾 */}
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-rose-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-amber-500/8 blur-[100px]" />
        
        <div className="relative mx-auto max-w-3xl text-center">
          {/* バッジ */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 backdrop-blur-sm animate-fade-in">
            <SparkleIcon />
            <span className="text-xs font-medium text-white/70">信頼できるサロン・クリニックを厳選</span>
          </div>
          
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl animate-fade-in-up">
            あなたにぴったりの
            <br />
            <span className="bg-gradient-to-r from-rose-300 via-pink-300 to-amber-200 bg-clip-text text-transparent">
              予約先を見つけよう
            </span>
          </h1>
          <p className="mb-10 text-sm leading-relaxed text-white/50 sm:text-base animate-fade-in-up" style={{animationDelay: "0.1s"}}>
            導入企業のサービスを比較して、Webで簡単に予約できます
          </p>

          {/* 検索バー — Premium Glass */}
          <div className="animate-fade-in-up mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-3.5 shadow-2xl shadow-black/20 backdrop-blur-xl transition-all duration-300 focus-within:border-white/20 focus-within:bg-white/[0.12]" style={{animationDelay: "0.2s"}}>
            <SearchIcon />
            <input
              type="text"
              placeholder="サロン名・クリニック名で検索…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-transparent py-0.5 text-sm text-white placeholder-white/30 outline-none"
            />
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 transition hover:bg-white/20 hover:text-white"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── カテゴリタブ ─── */}
      <section className="mb-10 -mt-8 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() => setActiveCategory(cat.label)}
            className={`group flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all duration-300 ${
              activeCategory === cat.label
                ? "bg-stone-900 text-white shadow-lg shadow-stone-900/20"
                : "border border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-700 hover:shadow-sm"
            }`}
          >
            {cat.label === "すべて" ? (
              <span className="text-[11px] opacity-70">{cat.icon}</span>
            ) : (
              <CategoryIcon label={cat.label} />
            )}
            {cat.label}
          </button>
        ))}
      </section>

      {/* ─── 件数 ─── */}
      {!loading && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-medium text-stone-400">
            <span className="text-lg font-bold text-stone-800">{tenants.length}</span>
            <span className="ml-1">件の導入企業</span>
          </p>
        </div>
      )}

      {/* ─── テナント一覧 ─── */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-premium overflow-hidden p-0">
              <div className="aspect-[4/3] animate-shimmer" />
              <div className="p-5">
                <div className="mb-3 h-5 w-2/3 rounded-lg bg-stone-100" />
                <div className="mb-2 h-3 w-full rounded bg-stone-50" />
                <div className="h-3 w-1/2 rounded bg-stone-50" />
              </div>
            </div>
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <div className="animate-fade-in py-24 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-stone-100">
            <SearchIcon />
          </div>
          <p className="mb-2 text-lg font-bold text-stone-700">該当する企業が見つかりませんでした</p>
          <p className="mb-6 text-sm text-stone-400">検索条件を変更してお試しください</p>
          <button
            onClick={() => {
              setSearchText("");
              setActiveCategory("すべて");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-6 py-2.5 text-sm font-medium text-stone-600 transition hover:border-rose-200 hover:text-rose-600"
          >
            条件をリセット
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t, idx) => (
            <TenantCard key={t.slug} tenant={t} index={idx} />
          ))}
        </div>
      )}

      {/* ─── ボトム案内 ─── */}
      <section className="mt-20 overflow-hidden rounded-3xl border border-stone-200/60 bg-gradient-to-br from-stone-900 via-stone-800 to-rose-950 p-10 text-center sm:p-14">
        <div className="relative">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-[80px]" />
          <div className="relative">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-medium text-white/60 backdrop-blur-sm">
              <SparkleIcon />
              パートナー募集中
            </span>
            <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl">あなたのお店も掲載しませんか？</h2>
            <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-white/50">
              Web予約システムを導入して、24時間予約受付を始めましょう。
              <br />初期費用無料で簡単に始められます。
            </p>
            <span className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-stone-900 shadow-xl shadow-black/10 transition hover:shadow-2xl hover:shadow-black/20 cursor-pointer">
              お問い合わせはこちら
              <ArrowRightIcon />
            </span>
          </div>
        </div>
      </section>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   テナントカード — Premium Design
   ════════════════════════════════════════════════════════════ */
function TenantCard({ tenant, index }: { tenant: Tenant; index: number }) {
  return (
    <a
      href={`/t/${tenant.slug}`}
      className={`group card-premium flex flex-col overflow-hidden animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}
    >
      {/* 写真 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {tenant.photoUrl ? (
          <img
            src={tenant.photoUrl}
            alt={tenant.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100">
            <BuildingIcon />
          </div>
        )}
        {/* グラデーションオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {/* カテゴリバッジ */}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/85 px-3 py-1 text-[11px] font-semibold text-stone-700 shadow-sm backdrop-blur-md">
          <CategoryIcon label={tenant.category} />
          {tenant.category}
        </span>
      </div>

      {/* テキスト */}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="mb-1.5 text-base font-bold text-stone-900 transition-colors duration-200 group-hover:text-rose-600 line-clamp-1">
          {tenant.name}
        </h2>

        {tenant.catchCopy && (
          <p className="mb-4 text-[13px] leading-relaxed text-stone-400 line-clamp-2">
            {tenant.catchCopy}
          </p>
        )}

        {/* メニュープレビュー */}
        {tenant.menus && tenant.menus.length > 0 && (
          <div className="mb-4 rounded-xl bg-stone-50/80 p-3 space-y-2">
            {tenant.menus.slice(0, 2).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-[13px]">
                <span className="text-stone-600 truncate">{m.name}</span>
                <span className="ml-2 font-bold text-rose-600 whitespace-nowrap">{m.price}</span>
              </div>
            ))}
          </div>
        )}

        {/* タグ */}
        {tenant.tags && tenant.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {tenant.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-stone-100 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                <CheckIcon />
                {tag}
              </span>
            ))}
            {tenant.tags.length > 3 && (
              <span className="rounded-md bg-stone-50 px-2 py-0.5 text-[10px] text-stone-400">+{tenant.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto">
          <span className="btn-premium flex items-center justify-center gap-2 py-3 text-[13px]">
            <CalendarIcon />
            詳細・予約はこちら
            <ArrowRightIcon />
          </span>
        </div>
      </div>
    </a>
  );
}
