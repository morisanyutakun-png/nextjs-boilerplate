import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import ScrollProgress from "./components/ScrollProgress";

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
        <Header />
        <ScrollProgress />

        {/* ヘッダー分のスペーサー */}
        <div className="h-[60px]" />

        <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>

        {/* ─── フッター ─── */}
        <footer className="relative overflow-hidden border-t border-stone-800 bg-stone-900">
          {/* 装飾オーブ */}
          <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-rose-500/5 blur-[100px]" />
          <div className="mx-auto max-w-6xl px-5 py-12">
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/15">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white/90">予約ポータル</span>
                  <span className="text-[10px] tracking-[0.2em] text-white/30">BOOKING PORTAL</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 sm:items-end">
                <div className="flex items-center gap-5">
                  <span className="text-[12px] text-stone-500 transition-colors duration-200 hover:text-stone-300 cursor-pointer">利用規約</span>
                  <span className="h-3 w-px bg-stone-700" />
                  <span className="text-[12px] text-stone-500 transition-colors duration-200 hover:text-stone-300 cursor-pointer">プライバシー</span>
                  <span className="h-3 w-px bg-stone-700" />
                  <span className="text-[12px] text-stone-500 transition-colors duration-200 hover:text-stone-300 cursor-pointer">お問い合わせ</span>
                </div>
                <p className="text-[11px] text-stone-600">
                  © 2026 予約ポータル — 各企業の予約ページへのご案内のみを行います
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
