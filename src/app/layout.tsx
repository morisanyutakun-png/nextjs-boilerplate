import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "予約ポータル | 導入企業一覧",
  description:
    "提携企業の予約ページへ安全にご案内するポータルサイトです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-800 antialiased">
        {/* ヘッダー */}
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <a href="/" className="text-lg font-bold text-rose-600">
              📅 予約ポータル
            </a>
            <span className="text-xs text-gray-400">
              リダイレクト専用ポータル
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

        {/* フッター */}
        <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400">
          <p>© 2026 予約ポータル — このサイトは予約ページへのご案内のみを行います</p>
        </footer>
      </body>
    </html>
  );
}
