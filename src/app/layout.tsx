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
      <body className="min-h-screen bg-gray-50 text-gray-800 antialiased">
        {/* ─── ヘッダー ─── */}
        <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-rose-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-sm text-white shadow-sm">
                📅
              </span>
              <span>予約ポータル</span>
            </a>
            <nav className="flex items-center gap-4">
              <a href="/" className="text-xs font-medium text-gray-500 transition hover:text-rose-500">
                トップ
              </a>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-semibold text-rose-500">
                ポータルサイト
              </span>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

        {/* ─── フッター ─── */}
        <footer className="border-t border-gray-200/60 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-50 text-xs text-rose-500">📅</span>
                予約ポータル
              </div>
              <p className="text-xs text-gray-400">
                © 2026 予約ポータル — 各企業の予約ページへのご案内のみを行います
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
