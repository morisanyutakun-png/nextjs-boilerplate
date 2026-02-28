"use client";

/**
 * EndRollBackground — 映画エンドロール風の背景テキストアニメーション
 *
 * 画面全体に超薄いキーワードが下から上へ永遠に流れ続ける。
 * 3列構成で異なる速度・遅延を持ち、奥行き感を演出。
 * pointer-events: none で操作を妨げない。
 * prefers-reduced-motion で停止。
 *
 * 心理学的効果:
 * - 動きのある背景は「活気」「最新」の印象を与える (mere exposure effect)
 * - 関連キーワードの反復表示がサービス理解を深める (priming)
 * - 緩やかな動きは安心感を与える (slow motion = premium perception)
 */

const KEYWORDS_COL1 = [
  "Beauty", "サロン", "Wellness", "予約",
  "Premium", "ヘアカット", "リラクゼーション", "Booking",
  "スパ", "Care", "トリートメント", "健康",
  "ネイル", "Therapy", "カウンセリング", "まつげ",
  "Beauty", "サロン", "Wellness", "予約",
  "Premium", "ヘアカット", "リラクゼーション", "Booking",
];

const KEYWORDS_COL2 = [
  "Clinic", "教育", "スクール", "Web予約",
  "24時間", "Studio", "フィットネス", "相談",
  "Review", "口コミ", "おすすめ", "人気",
  "安心", "Reserve", "選ぶ", "新規",
  "Clinic", "教育", "スクール", "Web予約",
  "24時間", "Studio", "フィットネス", "相談",
];

const KEYWORDS_COL3 = [
  "Salon", "厳選", "Online", "簡単",
  "Quality", "プロ", "体験", "Special",
  "Menu", "お得", "コース", "Today",
  "初回", "限定", "Style", "新着",
  "Salon", "厳選", "Online", "簡単",
  "Quality", "プロ", "体験", "Special",
];

interface ColumnProps {
  keywords: string[];
  duration: string;
  opacity: string;
  left: string;
  fontSize: string;
  delay?: string;
}

function ScrollColumn({ keywords, duration, opacity, left, fontSize, delay = "0s" }: ColumnProps) {
  return (
    <div
      className="endroll-column absolute top-0 flex flex-col gap-[3vh] whitespace-nowrap"
      style={{
        left,
        opacity,
        fontSize,
        animationDuration: duration,
        animationDelay: delay,
      }}
    >
      {keywords.map((word, i) => (
        <span
          key={i}
          className="block font-extralight tracking-[0.2em] text-stone-400 select-none"
        >
          {word}
        </span>
      ))}
    </div>
  );
}

export default function EndRollBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      aria-hidden="true"
    >
      {/* 左列 — 遅め・大きめ */}
      <ScrollColumn
        keywords={KEYWORDS_COL1}
        duration="45s"
        opacity="0.07"
        left="8%"
        fontSize="clamp(14px, 2vw, 22px)"
      />
      {/* 中列 — 普通速度 */}
      <ScrollColumn
        keywords={KEYWORDS_COL2}
        duration="35s"
        opacity="0.055"
        left="45%"
        fontSize="clamp(12px, 1.5vw, 18px)"
        delay="-12s"
      />
      {/* 右列 — 速め・小さめ */}
      <ScrollColumn
        keywords={KEYWORDS_COL3}
        duration="40s"
        opacity="0.045"
        left="78%"
        fontSize="clamp(11px, 1.3vw, 16px)"
        delay="-8s"
      />
    </div>
  );
}
