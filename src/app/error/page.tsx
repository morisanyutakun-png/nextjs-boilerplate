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
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-fade-in">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
        <svg className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="mb-3 text-2xl font-bold tracking-tight text-stone-900">
        エラーが発生しました
      </h1>
      <p className="mb-3 max-w-md text-sm leading-relaxed text-stone-600">{message}</p>
      <p className="mb-10 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-1.5 text-xs text-stone-400">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        エラーコード: {errorCode}
      </p>
      <Link
        href="/"
        className="btn-premium inline-flex items-center gap-2 px-8 py-3.5 text-sm"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        トップに戻る
      </Link>
    </div>
  );
}
