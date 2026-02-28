"use client";

import { useState, useEffect } from "react";

/**
 * モバイル向け固定予約バー
 *
 * スクロールするとフェードインして画面下部に常時表示される。
 * メインCTAが画面外になったときにユーザーの予約導線を確保する。
 */
export default function StickyBookingBar({ bookingUrl }: { bookingUrl: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShow(window.scrollY > 400);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sticky-bottom-bar transition-all duration-500 lg:hidden ${
        show ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
    >
      <a
        href={bookingUrl}
        rel="noopener noreferrer"
        className="btn-premium flex w-full items-center justify-center gap-2.5 py-3.5 text-[14px] font-bold tracking-wide animate-pulse-glow touch-target"
      >
        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        今すぐ予約する
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </a>
    </div>
  );
}
