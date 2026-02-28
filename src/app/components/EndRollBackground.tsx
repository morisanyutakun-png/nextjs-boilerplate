"use client";

/**
 * EndRollBackground — 映画エンドロール風の縦スクロールテキスト
 *
 * 画面全体にキーワードが下から上へ静かに流れ続ける。
 * ウォームクリーム背景に溶け込む淡いストーン色。
 * 3列の異なる速度で奥行きのあるパララックスを演出。
 */

const COL1 = [
  "Yoyaku", "Beauty", "Salon", "予約",
  "Wellness", "Premium", "Care", "サロン",
  "Booking", "Quality", "Style", "厳選",
  "Reserve", "Relax", "ビューティー",
];

const COL2 = [
  "Treatment", "Clinic", "リラックス",
  "Online", "Professional", "ケア",
  "Experience", "Special", "ウェルネス",
  "Luxury", "Studio", "プレミアム",
  "Health", "Comfort", "スタジオ",
];

const COL3 = [
  "予約", "Yoyaku", "スタイル",
  "Healing", "Beauty", "サロン",
  "Natural", "Organic", "厳選",
  "Glow", "Refresh", "ケア",
  "Balance", "Harmony", "癒し",
];

function EndRollColumn({
  words,
  speed,
  left,
  fontSize,
  opacity,
}: {
  words: string[];
  speed: string;
  left: string;
  fontSize: string;
  opacity: string;
}) {
  // 2セット分繰り返して無限ループ
  const doubled = [...words, ...words];
  return (
    <div
      className="absolute top-0 bottom-0 overflow-hidden"
      style={{ left, width: "max-content" }}
    >
      <div
        className="endroll-column flex flex-col"
        style={{ animationDuration: speed }}
      >
        {doubled.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="block font-extralight tracking-[0.2em] select-none leading-[2.2]"
            style={{ fontSize, opacity, color: "#c4b5a4" }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EndRollBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      aria-hidden="true"
    >
      {/* 左列: ゆっくり上昇 */}
      <EndRollColumn
        words={COL1}
        speed="80s"
        left="8%"
        fontSize="clamp(28px, 4vw, 48px)"
        opacity="0.06"
      />
      {/* 中央列: 中速 */}
      <EndRollColumn
        words={COL2}
        speed="60s"
        left="45%"
        fontSize="clamp(24px, 3.5vw, 42px)"
        opacity="0.045"
      />
      {/* 右列: やや速い */}
      <EndRollColumn
        words={COL3}
        speed="70s"
        left="78%"
        fontSize="clamp(26px, 3.8vw, 45px)"
        opacity="0.05"
      />
    </div>
  );
}
