/**
 * URL 安全検証モジュール
 *
 * テナントの bookingUrl がリダイレクト先として安全かどうかを検証する。
 * - https のみ許可
 * - ホワイトリストに含まれるホストのみ許可
 */

/** 許可するホスト一覧 */
const ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  "script.google.com",
  "script.googleusercontent.com",
]);

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * bookingUrl を検証する。
 *
 * @param url - 検証対象の URL 文字列
 * @returns 検証結果。ok=false の場合は reason にエラー理由が入る。
 */
export function validateBookingUrl(url: string): ValidationResult {
  // 空文字チェック
  if (!url) {
    return { ok: false, reason: "URLが空です" };
  }

  // URL パース
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "不正なURL形式です" };
  }

  // プロトコルチェック
  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "httpsのみ許可されています" };
  }

  // ホストチェック
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return {
      ok: false,
      reason: `許可されていないホストです: ${parsed.hostname}`,
    };
  }

  return { ok: true };
}
