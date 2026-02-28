import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "予約ポータル | 導入企業のWeb予約をまとめて検索",
  description:
    "提携企業の予約ページへ安全にご案内するポータルサイトです。サロン・クリニック・スクールなど多彩なジャンルから選べます。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="noise-bg min-h-screen bg-stone-50 text-stone-800 antialiased">
        {/* ─── ヘッダー ─── */}
        <header className="glass-dark sticky top-0 z-50 border-b border-white/[0.06]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
            <a href="/" className="group flex items-center gap-3">
              {/* ロゴマーク — グラデーションアイコン */}
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 shadow-lg shadow-rose-500/20 transition-transform duration-300 group-hover:scale-105">
                <svg className="h-[18px] w-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-stone-900 bg-emerald-400" />
              </span>
              <div className="flex flex-col">
                <span className="text-[15px] font-bold tracking-tight text-white">
                  予約ポータル
                </span>
                <span className="text-[10px] font-medium tracking-widest text-white/40">
                  BOOKING PORTAL
                </span>
              </div>
            </a>
            <nav className="flex items-center gap-5">
              <a href="/" className="text-[13px] font-medium text-white/60 transition-colors duration-200 hover:text-white">
                トップ
              </a>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                公式ポータル
              </span>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>

        {/* ─── フッター ─── */}
        <footer className="border-t border-stone-200/60 bg-stone-900">
          <div className="mx-auto max-w-6xl px-5 py-10">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 shadow-sm">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white/90">予約ポータル</span>
                  <span className="text-[10px] text-white/30">BOOKING PORTAL</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 sm:items-end">
                <p className="text-xs text-stone-500">
                  © 2026 予約ポータル — 各企業の予約ページへのご案内のみを行います
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-stone-600 hover:text-stone-400 transition-colors cursor-pointer">利用規約</span>
                  <span className="text-stone-700">·</span>
                  <span className="text-[11px] text-stone-600 hover:text-stone-400 transition-colors cursor-pointer">プライバシー</span>
                  <span className="text-stone-700">·</span>
                  <span className="text-[11px] text-stone-600 hover:text-stone-400 transition-colors cursor-pointer">お問い合わせ</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
