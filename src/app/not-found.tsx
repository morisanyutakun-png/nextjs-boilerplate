/**
 * カスタム 404 ページ
 */
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-4xl">
        🔍
      </div>
      <h1 className="mb-3 text-2xl font-extrabold text-gray-900">
        ページが見つかりません
      </h1>
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-gray-500">
        指定された店舗は存在しないか、現在非公開に設定されています。URLをご確認のうえ、再度お試しください。
      </p>
      <Link
        href="/"
        className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:from-rose-600 hover:to-pink-600 hover:shadow-xl"
      >
        トップに戻る
      </Link>
    </div>
  );
}
