/**
 * テナント詳細ページ（ポータル表示）
 *
 * 店舗の詳細情報を表示し、予約ボタンで外部GASへ遷移させる。
 * サーバコンポーネントで slug → DB 検索 → 表示。
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTenantBySlug } from "@/lib/tenantRegistry";
import { validateBookingUrl } from "@/lib/urlGuard";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const tenant = await getTenantBySlug(slug);
  if (!tenant || !tenant.isPublic) {
    notFound();
  }

  const validation = validateBookingUrl(tenant.bookingUrl);
  const bookingAvailable = validation.ok;

  return (
    <div className="pb-12">
      {/* パンくず */}
      <nav className="mb-6 text-sm text-gray-400">
        <Link href="/" className="hover:text-rose-500 transition">トップ</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">{tenant.name}</span>
      </nav>

      {/* ヒーロー写真 */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gray-200 aspect-[16/7]">
        {tenant.photoUrl ? (
          <img
            src={tenant.photoUrl}
            alt={tenant.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-gray-300">📷</div>
        )}
        {/* オーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 text-white">
          <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            {tenant.category}
          </span>
          <h1 className="text-2xl font-bold drop-shadow-lg sm:text-3xl">{tenant.name}</h1>
          {tenant.catchCopy && (
            <p className="mt-1 text-sm text-white/90 drop-shadow">{tenant.catchCopy}</p>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-8">
          {/* 紹介文 */}
          {tenant.description && (
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500">📝</span>
                お店の紹介
              </h2>
              <p className="whitespace-pre-line leading-relaxed text-gray-600">{tenant.description}</p>
            </section>
          )}

          {/* メニュー */}
          {tenant.menus && tenant.menus.length > 0 && (
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500">📋</span>
                メニュー概要
              </h2>
              <div className="divide-y divide-gray-100">
                {tenant.menus.map((menu, i) => (
                  <div key={i} className="flex items-start justify-between py-4 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-900">{menu.name}</p>
                      {menu.description && (
                        <p className="mt-0.5 text-sm text-gray-400">{menu.description}</p>
                      )}
                    </div>
                    <span className="ml-4 whitespace-nowrap font-bold text-rose-600">{menu.price}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-400">※ 詳しいメニューは予約ページでご確認ください</p>
            </section>
          )}

          {/* タグ */}
          {tenant.tags && tenant.tags.length > 0 && (
            <section className="flex flex-wrap gap-2">
              {tenant.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600"
                >
                  ✓ {tag}
                </span>
              ))}
            </section>
          )}
        </div>

        {/* サイドバー */}
        <aside className="space-y-6">
          {/* 予約ボタン（CTA） */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="mb-4 text-center text-sm font-medium text-gray-600">
              Webで簡単予約
            </p>
            {bookingAvailable ? (
              <a
                href={tenant.bookingUrl}
                rel="noopener noreferrer"
                className="block w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:from-rose-600 hover:to-pink-600 hover:shadow-xl hover:shadow-rose-300 active:scale-[0.98]"
              >
                🗓️ 予約ページへ進む
              </a>
            ) : (
              <div className="rounded-xl bg-gray-100 py-3 text-center text-sm text-gray-400">
                現在予約を受け付けていません
              </div>
            )}
            <p className="mt-3 text-center text-[10px] text-gray-400">
              外部の予約システムへ移動します
            </p>
          </div>

          {/* 店舗情報 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-500 text-xs">📍</span>
              店舗情報
            </h3>
            <dl className="space-y-3 text-sm">
              {tenant.address && (
                <div>
                  <dt className="text-xs font-medium text-gray-400">住所</dt>
                  <dd className="mt-0.5 text-gray-700">{tenant.address}</dd>
                </div>
              )}
              {tenant.phone && (
                <div>
                  <dt className="text-xs font-medium text-gray-400">電話番号</dt>
                  <dd className="mt-0.5 text-gray-700">{tenant.phone}</dd>
                </div>
              )}
              {tenant.businessHours && (
                <div>
                  <dt className="text-xs font-medium text-gray-400">営業時間</dt>
                  <dd className="mt-0.5 text-gray-700">{tenant.businessHours}</dd>
                </div>
              )}
              {tenant.closedDays && (
                <div>
                  <dt className="text-xs font-medium text-gray-400">定休日</dt>
                  <dd className="mt-0.5 text-gray-700">{tenant.closedDays}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* 更新日 */}
          <p className="text-center text-xs text-gray-400">
            最終更新: {new Date(tenant.updatedAtISO).toLocaleDateString("ja-JP")}
          </p>
        </aside>
      </div>
    </div>
  );
}
