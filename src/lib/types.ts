/**
 * テナント情報の型定義
 *
 * このインターフェースはテナントレジストリで使用されます。
 * Supabase の tenants テーブルと 1:1 で対応します。
 */

/** メニュー項目 */
export interface MenuItem {
  /** メニュー名 */
  name: string;
  /** 価格（税込表示用文字列） */
  price: string;
  /** 概要説明（1行程度） */
  description?: string;
}

export interface Tenant {
  /** URL-safe な一意識別子 (例: "acme-corp") */
  slug: string;
  /** テナント表示名 */
  name: string;
  /** カテゴリ */
  category: string;
  /** GAS Web アプリの予約URL */
  bookingUrl: string;
  /** 公開フラグ — false のテナントは一覧にも遷移先にも表示しない */
  isPublic: boolean;
  /** 最終更新日時 (ISO 8601) */
  updatedAtISO: string;

  // ─── 拡張フィールド（ポータル表示用）───
  /** 店舗写真URL（外部ホスト or Supabase Storage） */
  photoUrl?: string;
  /** 店舗の詳細説明（複数行可） */
  description?: string;
  /** 短い紹介文（一覧カードに表示、1〜2行） */
  catchCopy?: string;
  /** 住所 */
  address?: string;
  /** 電話番号 */
  phone?: string;
  /** 営業時間 */
  businessHours?: string;
  /** 定休日 */
  closedDays?: string;
  /** メニュー概要（トップ表示用、3〜5件程度） */
  menus?: MenuItem[];
  /** タグ（複数可: "駐車場あり", "カード可" など） */
  tags?: string[];

  /** 将来用: 稼働指標など */
  metrics?: Record<string, unknown>;
}
