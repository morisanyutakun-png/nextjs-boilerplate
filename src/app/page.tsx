"use client";

import { useState, useEffect, useCallback } from "react";
import type { Tenant } from "@/lib/types";

// カテゴリプリセット
const CATEGORIES = [
  "すべて",
  "美容・サロン",
  "医療・クリニック",
  "IT・Web",
  "飲食",
  "教育・スクール",
  "その他",
];

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
      <section className="relative -mx-4 -mt-8 mb-10 overflow-hidden bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 px-4 pb-14 pt-16 text-white sm:rounded-b-[2rem]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-60" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            あなたにぴったりの予約先を見つけよう
          </h1>
          <p className="mb-8 text-sm text-white/80">
            導入企業のサービスを比較して、Webで簡単に予約できます。
          </p>

          {/* 検索バー */}
          <div className="mx-auto flex max-w-xl items-center gap-2 rounded-2xl bg-white/95 px-4 py-2.5 shadow-xl shadow-rose-600/20 backdrop-blur">
            <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="サロン名・クリニック名で検索…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-transparent py-1 text-sm text-gray-800 placeholder-gray-400 outline-none"
            />
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── カテゴリタブ ─── */}
      <section className="mb-8 -mt-7 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
              activeCategory === cat
                ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* ─── 件数 ─── */}
      {!loading && (
        <p className="mb-4 text-xs text-gray-400">
          {tenants.length}件の導入企業が見つかりました
        </p>
      )}

      {/* ─── テナント一覧 ─── */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 h-40 rounded-xl bg-gray-200" />
              <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mb-4 text-5xl">🔍</div>
          <p className="text-sm text-gray-400">該当する企業が見つかりませんでした</p>
          <button
            onClick={() => {
              setSearchText("");
              setActiveCategory("すべて");
            }}
            className="mt-4 text-xs text-rose-500 underline underline-offset-2 hover:text-rose-600"
          >
            条件をリセット
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t) => (
            <TenantCard key={t.slug} tenant={t} />
          ))}
        </div>
      )}

      {/* ─── ボトム案内 ─── */}
      <section className="mt-16 rounded-2xl bg-gradient-to-r from-gray-50 to-rose-50 p-8 text-center">
        <h2 className="mb-2 text-lg font-bold text-gray-800">あなたのお店も掲載しませんか？</h2>
        <p className="mb-4 text-sm text-gray-500">
          Web予約システムを導入して、24時間予約受付を始めましょう。
        </p>
        <span className="inline-block rounded-full bg-white px-6 py-2 text-sm font-medium text-rose-600 shadow-sm">
          お問い合わせはこちら →
        </span>
      </section>
    </>
  );
}

/* ============================================================
   テナントカード — ホットペッパー風デザイン
   ============================================================ */
function TenantCard({ tenant }: { tenant: Tenant }) {
  return (
    <a
      href={`/t/${tenant.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* 写真 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {tenant.photoUrl ? (
          <img
            src={tenant.photoUrl}
            alt={tenant.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-gray-200">🏢</div>
        )}
        {/* カテゴリバッジ */}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 shadow-sm backdrop-blur-sm">
          {tenant.category}
        </span>
      </div>

      {/* テキスト */}
      <div className="flex flex-1 flex-col p-4">
        <h2 className="mb-1 text-[15px] font-bold text-gray-900 group-hover:text-rose-600 transition line-clamp-1">
          {tenant.name}
        </h2>

        {tenant.catchCopy && (
          <p className="mb-3 text-xs leading-relaxed text-gray-500 line-clamp-2">
            {tenant.catchCopy}
          </p>
        )}

        {/* メニュープレビュー */}
        {tenant.menus && tenant.menus.length > 0 && (
          <div className="mb-3 space-y-1">
            {tenant.menus.slice(0, 2).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate">{m.name}</span>
                <span className="ml-2 font-semibold text-rose-500 whitespace-nowrap">{m.price}</span>
              </div>
            ))}
          </div>
        )}

        {/* タグ */}
        {tenant.tags && tenant.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {tenant.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500">
                {tag}
              </span>
            ))}
            {tenant.tags.length > 3 && (
              <span className="text-[10px] text-gray-400">+{tenant.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto">
          <span className="flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 py-2.5 text-xs font-bold text-white shadow-sm transition group-hover:from-rose-600 group-hover:to-pink-600 group-hover:shadow-md">
            🗓️ 詳細・予約はこちら
          </span>
        </div>
      </div>
    </a>
  );
}
