import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import ScrollProgress from "./components/ScrollProgress";
import AmbientBackground from "./components/AmbientBackground";
import EndRollBackground from "./components/EndRollBackground";

export const metadata: Metadata = {
  title: "Yoyaku | 導入企業のWeb予約をまとめて検索",
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
      <body className="noise-bg min-h-screen bg-stone-950 text-stone-200 antialiased">
        {/* ── 常時背景アニメーション ── */}
        <AmbientBackground />
        <EndRollBackground />

        <Header />
        <ScrollProgress />

        {/* ヘッダー分のスペーサー */}
        <div className="h-[52px] sm:h-[64px]" />

        <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">{children}</main>

        {/* ─── フッター ─── */}
        <footer className="relative z-10 overflow-hidden border-t border-white/[0.06] bg-white/[0.03] backdrop-blur-xl safe-bottom">
          {/* 装飾グロー */}
          <div className="absolute -left-32 top-0 h-48 w-48 rounded-full bg-rose-500/[0.06] blur-[80px]" />
          <div className="absolute -right-24 -bottom-12 h-40 w-40 rounded-full bg-amber-500/[0.04] blur-[60px]" />

          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">
            <div className="flex flex-col items-center gap-6 sm:gap-8 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, #e11d48 0%, #be123c 40%, #9f1239 100%)",
                    boxShadow: "0 4px 16px rgba(225,29,72,0.2)",
                  }}
                >
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white">Yoyaku</span>
                  <span className="text-[10px] tracking-[0.15em] text-stone-500">BOOKING PORTAL</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 sm:items-end">
                <div className="flex items-center gap-4 sm:gap-5">
                  <span className="text-[12px] text-stone-500 transition-colors duration-200 hover:text-stone-300 active:text-white cursor-pointer touch-target flex items-center justify-center">利用規約</span>
                  <span className="h-3 w-px bg-white/[0.08]" />
                  <span className="text-[12px] text-stone-500 transition-colors duration-200 hover:text-stone-300 active:text-white cursor-pointer touch-target flex items-center justify-center">プライバシー</span>
                  <span className="h-3 w-px bg-white/[0.08]" />
                  <span className="text-[12px] text-stone-500 transition-colors duration-200 hover:text-stone-300 active:text-white cursor-pointer touch-target flex items-center justify-center">お問い合わせ</span>
                </div>
                <p className="text-[11px] text-stone-600">
                  © 2026 Yoyaku — 各企業の予約ページへのご案内のみを行います
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
