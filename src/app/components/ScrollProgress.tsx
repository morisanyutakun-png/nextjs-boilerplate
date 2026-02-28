"use client";

import { useEffect, useState } from "react";

/**
 * ScrollProgress — ページ読了率をヘッダー下部に表示するバー
 *
 * 心理学的効果:
 * - ゴールグラディエント効果: 完了に近づくほどモチベーションが上がる
 * - 視覚的フィードバック: ユーザーの位置を常にフィードバック
 */
export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(percent, 100));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed left-0 top-[48px] z-[49] h-[2px] transition-all duration-150 ease-out"
      style={{
        width: `${progress}%`,
        background: "linear-gradient(90deg, #be123c, #ec4899, #f59e0b)",
        opacity: progress > 1 ? 1 : 0,
      }}
    />
  );
}
