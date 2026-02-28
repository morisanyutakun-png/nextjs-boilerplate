"use client";

/**
 * MarqueeBackground — ラグジュアリーブランド風の水平スクロールテキスト
 *
 * 画面全体に超大きなキーワードが水平に流れ続ける。
 * ファッションハウスのWebサイトのような高級感。
 * 3行の異なる速度・方向・サイズで奥行きのあるパララックス。
 */

const ROW1 =
  "YOYAKU · PREMIUM · BEAUTY · WELLNESS · BOOKING · SALON · QUALITY · CARE · STYLE · RESERVE · ";
const ROW2 =
  "サロン · 予約 · 厳選 · ビューティー · プレミアム · ケア · ウェルネス · スタジオ · リラックス · ";
const ROW3 =
  "LUXURY · TREATMENT · CLINIC · RELAX · ONLINE · PROFESSIONAL · EXPERIENCE · SPECIAL · ";

function MarqueeRow({
  text,
  speed,
  direction,
  fontSize,
  top,
}: {
  text: string;
  speed: string;
  direction: "normal" | "reverse";
  fontSize: string;
  top: string;
}) {
  const repeated = text.repeat(4);
  return (
    <div
      className="absolute left-0 right-0 flex whitespace-nowrap overflow-hidden"
      style={{ top }}
    >
      <div
        className="marquee-track flex shrink-0"
        style={{
          animationDuration: speed,
          animationDirection: direction,
        }}
      >
        <span
          className="block shrink-0 font-black tracking-[0.15em] text-white/[0.03] select-none leading-none"
          style={{ fontSize }}
        >
          {repeated}
        </span>
        <span
          className="block shrink-0 font-black tracking-[0.15em] text-white/[0.03] select-none leading-none"
          style={{ fontSize }}
        >
          {repeated}
        </span>
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
      {/* 上段: 大きく遅い → 右方向 */}
      <MarqueeRow
        text={ROW1}
        speed="60s"
        direction="normal"
        fontSize="clamp(60px, 12vw, 140px)"
        top="10%"
      />
      {/* 中段: 中サイズ ← 逆方向 */}
      <MarqueeRow
        text={ROW2}
        speed="45s"
        direction="reverse"
        fontSize="clamp(40px, 8vw, 100px)"
        top="42%"
      />
      {/* 下段: やや大きく → 右方向 */}
      <MarqueeRow
        text={ROW3}
        speed="50s"
        direction="normal"
        fontSize="clamp(50px, 10vw, 120px)"
        top="72%"
      />
    </div>
  );
}
