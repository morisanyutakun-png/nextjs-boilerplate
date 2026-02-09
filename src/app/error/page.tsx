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
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-6 text-5xl">⚠️</div>
      <h1 className="mb-4 text-xl font-bold text-gray-900">
        エラーが発生しました
      </h1>
      <p className="mb-2 text-sm text-gray-600">{message}</p>
      <p className="mb-8 text-xs text-gray-400">エラーコード: {errorCode}</p>
      <Link
        href="/"
        className="rounded-lg bg-rose-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
      >
        トップに戻る
      </Link>
    </div>
  );
}
