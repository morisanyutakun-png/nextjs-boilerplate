/**
 * カスタム 404 ページ
 */
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-6 text-5xl">🔍</div>
      <h1 className="mb-4 text-xl font-bold text-gray-900">
        ページが見つかりません
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        指定されたテナントは存在しないか、現在非公開に設定されています。
      </p>
      <Link
        href="/"
        className="rounded-lg bg-rose-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
      >
        トップに戻る
      </Link>
    </div>
  );
}
