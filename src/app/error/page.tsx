/**
 * エラーページ
 *
 * クエリパラメータ code に応じてエラーメッセージを表示する。
 */

import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_url:
    "リダイレクト先のURLが安全性チェックを通過できませんでした。許可されたホスト（script.google.com）以外への遷移はブロックされます。",
  not_found: "指定されたテナントが見つかりませんでした。",
  unknown: "不明なエラーが発生しました。",
};

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function ErrorPage({ searchParams }: PageProps) {
  const { code } = await searchParams;
  const errorCode = code ?? "unknown";
  const message = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.unknown;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-4xl">
        ⚠️
      </div>
      <h1 className="mb-3 text-2xl font-extrabold text-gray-900">
        エラーが発生しました
      </h1>
      <p className="mb-2 max-w-md text-sm leading-relaxed text-gray-600">{message}</p>
      <p className="mb-8 rounded-full bg-gray-100 px-4 py-1 text-xs text-gray-400">
        エラーコード: {errorCode}
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
