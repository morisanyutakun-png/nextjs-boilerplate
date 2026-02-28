/**
 * カスタム 404 ページ
 */
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-fade-in">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-stone-100 to-stone-50 shadow-sm">
        <svg className="h-10 w-10 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <h1 className="mb-3 text-2xl font-bold tracking-tight text-stone-900">
        ページが見つかりません
      </h1>
      <p className="mb-10 max-w-sm text-sm leading-relaxed text-stone-500">
        指定された店舗は存在しないか、現在非公開に設定されています。<br />URLをご確認のうえ、再度お試しください。
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
