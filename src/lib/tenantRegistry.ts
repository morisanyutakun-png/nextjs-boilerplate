/**
 * テナントレジストリ
 *
 * 現在はインメモリ JSON で管理。
 * 将来 DB に置き換える場合はこのファイルの実装だけ差し替えればOK。
 * 公開インターフェース (getTenantBySlug / listPublicTenants) は変えない。
 */
import type { Tenant } from "./types";

// ---------------------------------------------------------------------------
// データソース（ここを DB クエリに差し替え可能）
// ---------------------------------------------------------------------------
const tenants: Tenant[] = [
  {
    slug: "acme-corp",
    name: "ACME株式会社",
    category: "IT・Web",
    bookingUrl:
      "https://script.google.com/macros/s/EXAMPLE_ACME/exec",
    isPublic: true,
    updatedAtISO: "2026-01-15T10:00:00+09:00",
  },
  {
    slug: "sakura-beauty",
    name: "さくらビューティーサロン",
    category: "美容・サロン",
    bookingUrl:
      "https://script.google.com/macros/s/EXAMPLE_SAKURA/exec",
    isPublic: true,
    updatedAtISO: "2026-01-20T12:30:00+09:00",
  },
  {
    slug: "yamato-clinic",
    name: "やまとクリニック",
    category: "医療・クリニック",
    bookingUrl:
      "https://script.google.com/macros/s/EXAMPLE_YAMATO/exec",
    isPublic: true,
    updatedAtISO: "2026-02-01T09:00:00+09:00",
  },
  {
    slug: "test-private",
    name: "非公開テスト企業",
    category: "テスト",
    bookingUrl:
      "https://script.google.com/macros/s/EXAMPLE_PRIVATE/exec",
    isPublic: false,
    updatedAtISO: "2026-02-05T00:00:00+09:00",
  },
];

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/**
 * slug からテナントを 1 件取得する。
 * 見つからない場合は undefined。
 */
export function getTenantBySlug(slug: string): Tenant | undefined {
  return tenants.find((t) => t.slug === slug);
}

/**
 * isPublic=true のテナント一覧を返す。
 * オプションで name / category による部分一致フィルタが可能。
 */
export function listPublicTenants(filter?: {
  name?: string;
  category?: string;
}): Tenant[] {
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
