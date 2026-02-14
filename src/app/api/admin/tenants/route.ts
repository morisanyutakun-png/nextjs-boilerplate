/**
 * Admin API — テナント登録 / 更新
 *
 * テナントアプリ（GAS）のセットアップ完了時に呼ばれ、
 * Supabase の tenants テーブルにレコードを upsert する。
 *
 * 認証: リクエストヘッダ x-admin-secret が環境変数 ADMIN_SHARED_SECRET と一致すること。
 *
 * POST /api/admin/tenants  — 新規作成 or slug 重複時は更新 (upsert)
 * PUT  /api/admin/tenants  — 既存更新（slug 必須）
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// 認証ヘルパー
// ---------------------------------------------------------------------------
function authorize(request: NextRequest): boolean {
  const secret = (process.env.ADMIN_SHARED_SECRET ?? "").trim();
  if (!secret) {
    console.error("[admin/tenants] ADMIN_SHARED_SECRET env var is not set");
    return false;
  }
  const provided = (request.headers.get("x-admin-secret") ?? "").trim();
  if (provided !== secret) {
    console.error(
      `[admin/tenants] auth mismatch: provided length=${provided.length}, expected length=${secret.length}`,
    );
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// バリデーション
// ---------------------------------------------------------------------------
const SLUG_RE = /^[a-z0-9][a-z0-9\-]{0,63}$/;

interface TenantPayload {
  slug: string;
  name: string;
  booking_url?: string;
  category?: string;
  catch_copy?: string;
  description?: string;
  photo_url?: string;
  address?: string;
  phone?: string;
  business_hours?: string;
  closed_days?: string;
  menus?: unknown[];
  tags?: string[];
  is_public?: boolean;
}

function validatePayload(body: unknown): { ok: true; data: TenantPayload } | { ok: false; reason: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, reason: "リクエストボディが空です" };
  }

  const b = body as Record<string, unknown>;

  // 必須フィールド
  const slug = String(b.slug ?? "").trim();
  if (!slug) return { ok: false, reason: "slug は必須です" };
  if (!SLUG_RE.test(slug)) return { ok: false, reason: "slug は英数字とハイフンのみ（先頭は英数字、1〜64文字）" };

  const name = String(b.name ?? "").trim();
  if (!name) return { ok: false, reason: "name は必須です" };

  const booking_url = String(b.booking_url ?? "").trim();

  // booking_url が提供された場合のみ形式チェック（https + 許可ホスト）
  if (booking_url) {
    try {
      const parsed = new URL(booking_url);
      if (parsed.protocol !== "https:") {
        return { ok: false, reason: "booking_url は https のみ許可されています" };
      }
      const ALLOWED = new Set(["script.google.com", "script.googleusercontent.com"]);
      if (!ALLOWED.has(parsed.hostname)) {
        return { ok: false, reason: `booking_url のホスト ${parsed.hostname} は許可されていません` };
      }
    } catch {
      return { ok: false, reason: "booking_url が不正な URL 形式です" };
    }
  }

  return {
    ok: true,
    data: {
      slug,
      name,
      booking_url: booking_url || undefined,
      category: b.category ? String(b.category) : undefined,
      catch_copy: b.catch_copy ? String(b.catch_copy) : undefined,
      description: b.description ? String(b.description) : undefined,
      photo_url: b.photo_url ? String(b.photo_url) : undefined,
      address: b.address ? String(b.address) : undefined,
      phone: b.phone ? String(b.phone) : undefined,
      business_hours: b.business_hours ? String(b.business_hours) : undefined,
      closed_days: b.closed_days ? String(b.closed_days) : undefined,
      menus: Array.isArray(b.menus) ? b.menus : undefined,
      tags: Array.isArray(b.tags) ? (b.tags as string[]) : undefined,
      is_public: typeof b.is_public === "boolean" ? b.is_public : true,
    },
  };
}

// ---------------------------------------------------------------------------
// POST — upsert（新規 or 更新）
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    const hasEnv = !!(process.env.ADMIN_SHARED_SECRET ?? "").trim();
    const hasHeader = !!(request.headers.get("x-admin-secret") ?? "").trim();
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint: !hasEnv
          ? "ADMIN_SHARED_SECRET environment variable is not set on the server"
          : !hasHeader
            ? "x-admin-secret header is missing from the request"
            : "x-admin-secret header value does not match ADMIN_SHARED_SECRET",
      },
      { status: 401 },
    );
  }

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase が設定されていません（NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を確認してください）" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON パースに失敗しました" }, { status: 400 });
  }

  const v = validatePayload(body);
  if (!v.ok) {
    return NextResponse.json({ error: v.reason }, { status: 422 });
  }

  const row = {
    ...v.data,
    // Supabase の NOT NULL 制約に対応: booking_url 未指定なら空文字
    booking_url: v.data.booking_url ?? "",
    updated_at: new Date().toISOString(),
  };

  // upsert by slug (ON CONFLICT slug → UPDATE)
  const { data, error } = await supabase
    .from("tenants")
    .upsert(row, { onConflict: "slug" })
    .select()
    .single();

  if (error) {
    console.error("[admin/tenants] upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tenant: data }, { status: 201 });
}

// ---------------------------------------------------------------------------
// PUT — 既存テナントの部分更新（slug 必須）
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase が設定されていません" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON パースに失敗しました" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "リクエストボディが空です" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const slug = String(b.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "slug は必須です" }, { status: 422 });
  }

  // slug 以外の値だけ更新対象にする
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { slug: _slug, ...updates } = b as Record<string, unknown>;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "更新フィールドがありません" }, { status: 422 });
  }

  // updated_at を自動付与
  (updates as Record<string, unknown>).updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("tenants")
    .update(updates)
    .eq("slug", slug)
    .select()
    .single();

  if (error) {
    console.error("[admin/tenants] update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tenant: data });
}
