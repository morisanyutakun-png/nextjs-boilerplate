/**
 * テナント詳細ページ（ポータル表示）
 *
 * 店舗の詳細情報を表示し、予約ボタンで外部GASへ遷移させる。
 * サーバコンポーネントで slug → DB 検索 → 表示。
 * モバイルファースト + 常時アニメーション + スティッキー予約CTA
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTenantBySlug } from "@/lib/tenantRegistry";
import { validateBookingUrl } from "@/lib/urlGuard";
import ScrollReveal from "@/app/components/ScrollReveal";
import StickyBookingBar from "@/app/components/StickyBookingBar";

/* ── SVG Icons ── */
const CalendarIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const PenIcon = () => (
  <svg className="h-4.5 w-4.5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);
const MenuIcon = () => (
  <svg className="h-4.5 w-4.5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
);
const MapPinIcon = () => (
  <svg className="h-4.5 w-4.5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);
const CameraIcon = () => (
  <svg className="h-10 w-10 sm:h-12 sm:w-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);
const CheckBadgeIcon = () => (
  <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
  </svg>
);
const ClockIcon = () => (
  <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const PhoneIcon = () => (
  <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);
const MapIcon = () => (
  <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);
const CalendarDaysIcon = () => (
  <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

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
    <div className="pb-20 sm:pb-16 lg:pb-16">
      {/* パンくず — モバイルコンパクト */}
      <ScrollReveal variant="fadeIn">
        <nav className="mb-5 sm:mb-8 flex items-center gap-1.5 sm:gap-2 text-[13px] sm:text-sm text-stone-400">
          <Link href="/" className="transition-colors duration-200 hover:text-rose-500 active:text-rose-500 touch-target flex items-center justify-center">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </Link>
          <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="font-medium text-stone-600 line-clamp-1">{tenant.name}</span>
        </nav>
      </ScrollReveal>

      {/* ヒーロー写真 — Apple-style clean */}
      <ScrollReveal variant="scale">
        <div className="group/hero relative mb-6 sm:mb-10 overflow-hidden rounded-2xl sm:rounded-3xl bg-stone-100 aspect-[4/3] sm:aspect-[16/7] shadow-lg shadow-stone-200/40">
          {tenant.photoUrl ? (
            <img
              src={tenant.photoUrl}
              alt={tenant.name}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/hero:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100">
              <CameraIcon />
            </div>
          )}
          {/* グラデーションオーバーレイ */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-white/90 backdrop-blur-md">
                {tenant.category}
              </span>
              {bookingAvailable && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-emerald-300 backdrop-blur-md">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  予約受付中
                </span>
              )}
            </div>
            <h1 className="text-[22px] sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">{tenant.name}</h1>
            {tenant.catchCopy && (
              <p className="mt-1.5 sm:mt-2 text-[13px] sm:text-base text-white/70 max-w-xl line-clamp-2 font-light">{tenant.catchCopy}</p>
            )}
          </div>
        </div>
      </ScrollReveal>

      {/* モバイル: インラインCTA (スクロール前に見える) */}
      {bookingAvailable && (
        <ScrollReveal variant="fadeUp" delay={50}>
          <div className="mb-6 sm:mb-8 lg:hidden">
            <a
              href={tenant.bookingUrl}
              rel="noopener noreferrer"
              className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-stone-900 py-4 text-[14px] font-semibold text-white transition-all duration-300 hover:bg-rose-600 active:scale-[0.98] touch-target"
            >
              <CalendarIcon className="h-4.5 w-4.5" />
              予約ページへ進む
              <ArrowRightIcon />
            </a>
            <p className="mt-2.5 flex items-center justify-center gap-1 text-[11px] text-stone-400">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              外部の予約システムへ移動します
            </p>
          </div>
        </ScrollReveal>
      )}

      <div className="grid gap-5 sm:gap-8 lg:grid-cols-3">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-8">
          {/* 紹介文 */}
          {tenant.description && (
            <ScrollReveal variant="fadeUp" delay={100}>
              <section className="rounded-2xl bg-white p-5 sm:p-7 shadow-sm shadow-stone-200/60">
                <h2 className="mb-4 flex items-center gap-2.5 text-[15px] sm:text-base font-semibold text-stone-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                    <PenIcon />
                  </span>
                  お店の紹介
                </h2>
                <p className="whitespace-pre-line text-[14px] sm:text-[15px] leading-[1.85] text-stone-500 font-light">{tenant.description}</p>
              </section>
            </ScrollReveal>
          )}

          {/* メニュー */}
          {tenant.menus && tenant.menus.length > 0 && (
            <ScrollReveal variant="fadeUp" delay={200}>
              <section className="rounded-2xl bg-white p-5 sm:p-7 shadow-sm shadow-stone-200/60">
                <h2 className="mb-4 flex items-center gap-2.5 text-[15px] sm:text-base font-semibold text-stone-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <MenuIcon />
                  </span>
                  メニュー概要
                </h2>
                <div className="divide-y divide-stone-100">
                  {tenant.menus.map((menu, i) => (
                    <div key={i} className="group/menu flex items-start justify-between py-4 sm:py-5 first:pt-0 last:pb-0 transition-all duration-300 hover:bg-rose-50/30 active:bg-rose-50/40 hover:px-3 active:px-3 rounded-xl -mx-1">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[14px] sm:text-base text-stone-900 transition-colors duration-200 group-hover/menu:text-rose-700 group-active/menu:text-rose-700">{menu.name}</p>
                        {menu.description && (
                          <p className="mt-0.5 sm:mt-1 text-[12px] sm:text-sm text-stone-400 leading-relaxed line-clamp-2">{menu.description}</p>
                        )}
                      </div>
                      <span className="ml-3 sm:ml-4 whitespace-nowrap rounded-lg bg-rose-50 px-2.5 sm:px-3 py-1 text-[13px] sm:text-sm font-bold text-rose-600 transition-all duration-200 group-hover/menu:bg-rose-100 group-active/menu:bg-rose-100">{menu.price}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 sm:mt-6 flex items-center gap-2 rounded-xl bg-stone-50 px-3 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs text-stone-400">
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  詳しいメニューは予約ページでご確認ください
                </div>
              </section>
            </ScrollReveal>
          )}

          {/* タグ */}
          {tenant.tags && tenant.tags.length > 0 && (
            <ScrollReveal variant="fadeUp" delay={300}>
              <section className="flex flex-wrap gap-1.5 sm:gap-2">
                {tenant.tags.map((tag, i) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-stone-50 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-stone-500 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <CheckBadgeIcon />
                    {tag}
                  </span>
                ))}
              </section>
            </ScrollReveal>
          )}
        </div>

        {/* サイドバー */}
        <aside className="space-y-5 sm:space-y-6">
          {/* 予約ボタン（CTA） — デスクトップ向け */}
          <ScrollReveal variant="slideLeft" delay={150}>
            <div className="rounded-2xl bg-white p-5 sm:p-7 text-center hidden lg:block shadow-sm shadow-stone-200/60">
              <div className="mb-3 sm:mb-4 flex items-center justify-center gap-2">
                <CalendarIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-rose-500" />
                <p className="text-[13px] sm:text-sm font-bold text-stone-700">Webで簡単予約</p>
              </div>
              {bookingAvailable ? (
                <a
                  href={tenant.bookingUrl}
                  rel="noopener noreferrer"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3.5 text-[13px] sm:text-sm font-medium text-white transition-all duration-300 hover:bg-rose-600 active:scale-[0.98] touch-target"
                >
                  <CalendarIcon className="h-4 w-4" />
                  予約ページへ進む
                  <ArrowRightIcon />
                </a>
              ) : (
                <div className="rounded-xl border border-stone-100 bg-stone-50 py-3.5 text-center text-[13px] sm:text-sm text-stone-400">
                  現在予約を受け付けていません
                </div>
              )}
              <p className="mt-3 sm:mt-4 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] text-stone-400">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                外部の予約システムへ移動します
              </p>
            </div>
          </ScrollReveal>

          {/* 店舗情報 */}
          <ScrollReveal variant="slideLeft" delay={250}>
            <div className="rounded-2xl bg-white p-5 sm:p-7 shadow-sm shadow-stone-200/60">
              <h3 className="mb-4 flex items-center gap-2.5 text-[13px] sm:text-sm font-semibold text-stone-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                  <MapPinIcon />
                </span>
                店舗情報
              </h3>
              <dl className="space-y-3.5 sm:space-y-4 text-[13px] sm:text-sm">
                {tenant.address && (
                  <div className="flex items-start gap-2.5 sm:gap-3 group/info transition-all duration-200 active:translate-x-1 hover:translate-x-1">
                    <MapIcon />
                    <div>
                      <dt className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-stone-400 uppercase">住所</dt>
                      <dd className="mt-0.5 text-stone-700">{tenant.address}</dd>
                    </div>
                  </div>
                )}
                {tenant.phone && (
                  <div className="flex items-start gap-2.5 sm:gap-3 group/info transition-all duration-200 active:translate-x-1 hover:translate-x-1">
                    <PhoneIcon />
                    <div>
                      <dt className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-stone-400 uppercase">電話番号</dt>
                      <dd className="mt-0.5 text-stone-700">{tenant.phone}</dd>
                    </div>
                  </div>
                )}
                {tenant.businessHours && (
                  <div className="flex items-start gap-2.5 sm:gap-3 group/info transition-all duration-200 active:translate-x-1 hover:translate-x-1">
                    <ClockIcon />
                    <div>
                      <dt className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-stone-400 uppercase">営業時間</dt>
                      <dd className="mt-0.5 text-stone-700">{tenant.businessHours}</dd>
                    </div>
                  </div>
                )}
                {tenant.closedDays && (
                  <div className="flex items-start gap-2.5 sm:gap-3 group/info transition-all duration-200 active:translate-x-1 hover:translate-x-1">
                    <CalendarDaysIcon />
                    <div>
                      <dt className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-stone-400 uppercase">定休日</dt>
                      <dd className="mt-0.5 text-stone-700">{tenant.closedDays}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>
          </ScrollReveal>

          {/* 更新日 */}
          <ScrollReveal variant="fadeIn" delay={350}>
            <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-stone-400">
              <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.012 14.339V19.331" />
              </svg>
              最終更新: {new Date(tenant.updatedAtISO).toLocaleDateString("ja-JP")}
            </div>
          </ScrollReveal>
        </aside>
      </div>

      {/* モバイル固定予約バー */}
      {bookingAvailable && <StickyBookingBar bookingUrl={tenant.bookingUrl} />}
    </div>
  );
}
