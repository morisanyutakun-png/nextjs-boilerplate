/**
 * テナント情報の型定義
 *
 * このインターフェースはテナントレジストリで使用されます。
 * 将来DB化する際も、この型を維持してください。
 */
export interface Tenant {
  /** URL-safe な一意識別子 (例: "acme-corp") */
  slug: string;
  /** テナント表示名 */
  name: string;
  /** カテゴリ（任意） */
  category?: string;
  /** GAS Web アプリの予約URL */
  bookingUrl: string;
  /** 公開フラグ — false のテナントは一覧にも遷移先にも表示しない */
  isPublic: boolean;
  /** 最終更新日時 (ISO 8601) */
  updatedAtISO: string;
  /** 将来用: 稼働指標など */
  metrics?: Record<string, unknown>;
}
