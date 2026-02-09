"use client";

import { useState, useEffect } from "react";
import type { Tenant } from "@/lib/types";

/**
 * ポータルトップ — 公開テナント一覧 + 検索フィルタ
 */
export default function PortalTopPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [nameQuery, setNameQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (nameQuery) params.set("name", nameQuery);
    if (categoryQuery) params.set("category", categoryQuery);

    setLoading(true);
    fetch(`/api/tenants?${params.toString()}`)
      .then((res) => res.json())
      .then((data: Tenant[]) => {
        setTenants(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [nameQuery, categoryQuery]);

  return (
    <>
      {/* ヒーローセクション */}
      <section className="mb-10 text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          導入企業の予約ページ一覧
        </h1>
        <p className="text-sm text-gray-500">
          各企業の予約ページへ安全にご案内します。カードをクリックすると予約サイトへ移動します。
        </p>
      </section>

      {/* 検索フィルタ */}
      <section className="mb-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="🔍 企業名で検索…"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
        />
        <input
          type="text"
          placeholder="🏷️ カテゴリで絞り込み…"
          value={categoryQuery}
          onChange={(e) => setCategoryQuery(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
        />
      </section>

      {/* テナント一覧 */}
      {loading ? (
        <p className="text-center text-sm text-gray-400">読み込み中…</p>
      ) : tenants.length === 0 ? (
        <p className="text-center text-sm text-gray-400">
          該当する企業が見つかりませんでした
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t) => (
            <TenantCard key={t.slug} tenant={t} />
          ))}
        </div>
      )}

      {/* 注意書き */}
      <p className="mt-12 text-center text-xs text-gray-400">
        ※ 本サイトは予約ページへのリダイレクトのみを提供しています。予約データの管理は各企業のシステムで行われます。
      </p>
    </>
  );
}

/** テナントカード */
function TenantCard({ tenant }: { tenant: Tenant }) {
  return (
    <a
      href={`/t/${tenant.slug}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-rose-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 group-hover:text-rose-600">
          {tenant.name}
        </h2>
        <svg
          className="h-4 w-4 text-gray-300 transition group-hover:translate-x-1 group-hover:text-rose-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>

      {tenant.category && (
        <span className="inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-600">
          {tenant.category}
        </span>
      )}

      <p className="mt-3 text-xs text-gray-400">
        更新: {new Date(tenant.updatedAtISO).toLocaleDateString("ja-JP")}
      </p>
    </a>
  );
}
