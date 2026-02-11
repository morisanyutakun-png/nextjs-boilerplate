/**
 * テナントレジストリ
 *
 * Supabase の tenants テーブルからデータを取得する。
 * 環境変数が未設定の場合はローカルのフォールバックデータを使用。
 * 公開インターフェース (getTenantBySlug / listPublicTenants) のシグネチャは安定。
 */
import type { Tenant } from "./types";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// ローカルフォールバック（Supabase 未接続時のデモデータ）
// ---------------------------------------------------------------------------
const LOCAL_TENANTS: Tenant[] = [
  {
    slug: "sakura-beauty",
    name: "さくらビューティーサロン",
    category: "美容・サロン",
    bookingUrl: "https://script.google.com/macros/s/EXAMPLE_SAKURA/exec",
    isPublic: true,
    updatedAtISO: "2026-01-20T12:30:00+09:00",
    photoUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop",
    catchCopy: "駅チカ徒歩3分。癒しの空間で最高のキレイを。",
    description:
      "さくらビューティーサロンは、最新の美容技術と心からのおもてなしで、あなたの「キレイ」をサポートします。カット・カラー・ネイル・エステまで幅広くご対応。完全個室でリラックスした時間をお過ごしください。",
    address: "東京都渋谷区神南1-2-3 サクラビル 2F",
    phone: "03-1234-5678",
    businessHours: "10:00〜21:00（最終受付 20:00）",
    closedDays: "毎週火曜日",
    menus: [
      { name: "カット", price: "¥4,400", description: "似合わせカット + ブロー" },
      { name: "カラー", price: "¥6,600〜", description: "トレンドカラー + トリートメント" },
      { name: "ネイル", price: "¥5,500〜", description: "ジェルネイル ワンカラー" },
    ],
    tags: ["駅チカ", "個室あり", "カード可", "当日予約OK"],
  },
  {
    slug: "yamato-clinic",
    name: "やまとクリニック",
    category: "医療・クリニック",
    bookingUrl: "https://script.google.com/macros/s/EXAMPLE_YAMATO/exec",
    isPublic: true,
    updatedAtISO: "2026-02-01T09:00:00+09:00",
    photoUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop",
    catchCopy: "地域密着型のかかりつけクリニック。Web予約で待ち時間ゼロへ。",
    description:
      "やまとクリニックは内科・皮膚科・小児科を中心に、地域の皆さまの健康をサポートする総合クリニックです。Web予約システムの導入で、待ち時間を大幅に削減しました。",
    address: "東京都新宿区西新宿5-6-7 メディカルプラザ 1F",
    phone: "03-9876-5432",
    businessHours: "9:00〜18:00（昼休み 12:30〜14:00）",
    closedDays: "日曜・祝日",
    menus: [
      { name: "一般内科", price: "保険適用", description: "風邪・生活習慣病など" },
      { name: "皮膚科", price: "保険適用", description: "アトピー・ニキビ治療" },
      { name: "健康診断", price: "¥8,800〜", description: "基本健診コース" },
    ],
    tags: ["駐車場あり", "バリアフリー", "Web予約", "保険適用"],
  },
  {
    slug: "acme-corp",
    name: "ACME株式会社",
    category: "IT・Web",
    bookingUrl: "https://script.google.com/macros/s/EXAMPLE_ACME/exec",
    isPublic: true,
    updatedAtISO: "2026-01-15T10:00:00+09:00",
    photoUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop",
    catchCopy: "DX推進のご相談はACMEへ。初回相談無料。",
    description:
      "ACME株式会社は中小企業のDX推進をサポートするITコンサルティング会社です。Webサイト制作・業務効率化ツール導入・クラウド移行まで、ワンストップでご対応します。",
    address: "東京都港区六本木4-5-6 ACMEタワー 10F",
    phone: "03-1111-2222",
    businessHours: "9:00〜18:00",
    closedDays: "土日祝",
    menus: [
      { name: "DX相談", price: "無料", description: "初回60分の無料ヒアリング" },
      { name: "Web制作", price: "¥330,000〜", description: "LP / コーポレートサイト" },
      { name: "業務改善", price: "¥110,000〜/月", description: "GAS / RPA による自動化" },
    ],
    tags: ["オンライン対応", "初回無料", "法人向け"],
  },
  {
    slug: "test-private",
    name: "非公開テスト企業",
    category: "テスト",
    bookingUrl: "https://script.google.com/macros/s/EXAMPLE_PRIVATE/exec",
    isPublic: false,
    updatedAtISO: "2026-02-05T00:00:00+09:00",
  },
];

// ---------------------------------------------------------------------------
// Supabase 接続判定
// ---------------------------------------------------------------------------
function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

// ---------------------------------------------------------------------------
// 公開 API（async — サーバコンポーネント / Route Handler から呼ぶ）
// ---------------------------------------------------------------------------

/**
 * slug からテナントを 1 件取得する。
 * 見つからない場合は undefined。
 */
export async function getTenantBySlug(
  slug: string,
): Promise<Tenant | undefined> {
  if (!isSupabaseConfigured()) {
    return LOCAL_TENANTS.find((t) => t.slug === slug);
  }

  const { data, error } = await supabase!
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return undefined;
  return mapRow(data);
}

/**
 * isPublic=true のテナント一覧を返す。
 * オプションで name / category による部分一致フィルタが可能。
 */
export async function listPublicTenants(filter?: {
  name?: string;
  category?: string;
}): Promise<Tenant[]> {
  if (!isSupabaseConfigured()) {
    return filterLocal(LOCAL_TENANTS, filter);
  }

  let query = supabase!
    .from("tenants")
    .select("*")
    .eq("is_public", true)
    .order("updated_at", { ascending: false });

  if (filter?.name) {
    query = query.ilike("name", `%${filter.name}%`);
  }
  if (filter?.category) {
    query = query.ilike("category", `%${filter.category}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map(mapRow);
}

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

/** ローカルデータのフィルタリング */
function filterLocal(
  tenants: Tenant[],
  filter?: { name?: string; category?: string },
): Tenant[] {
  let result = tenants.filter((t) => t.isPublic);

  if (filter?.name) {
    const q = filter.name.toLowerCase();
    result = result.filter((t) => t.name.toLowerCase().includes(q));
  }
  if (filter?.category) {
    const q = filter.category.toLowerCase();
    result = result.filter(
      (t) => t.category?.toLowerCase().includes(q) ?? false,
    );
  }

  return result;
}

/**
 * Supabase の snake_case 行を Tenant 型にマッピング
 * テーブルのカラム名に合わせて調整してください。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Tenant {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category ?? "",
    bookingUrl: row.booking_url ?? row.bookingUrl ?? "",
    isPublic: row.is_public ?? row.isPublic ?? false,
    updatedAtISO: row.updated_at ?? row.updatedAtISO ?? "",
    photoUrl: row.photo_url ?? row.photoUrl,
    description: row.description,
    catchCopy: row.catch_copy ?? row.catchCopy,
    address: row.address,
    phone: row.phone,
    businessHours: row.business_hours ?? row.businessHours,
    closedDays: row.closed_days ?? row.closedDays,
    menus: row.menus ? (typeof row.menus === "string" ? JSON.parse(row.menus) : row.menus) : undefined,
    tags: row.tags ? (typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags) : undefined,
  };
}
