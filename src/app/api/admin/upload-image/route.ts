/**
 * Admin API — 画像アップロード
 *
 * テナントアプリから画像をBase64形式で受け取り、Supabase Storageに保存。
 * 公開URLを返す。
 *
 * 認証: リクエストヘッダ x-admin-secret が環境変数 ADMIN_SHARED_SECRET と一致すること。
 *
 * POST /api/admin/upload-image
 * Body: { image: "data:image/jpeg;base64,..." }
 * Response: { ok: true, url: "https://..." }
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Vercel の制限: Hobby プランは 4.5MB まで、Pro プランは無制限
// Base64 エンコードで約33%増加するため、実質的な画像サイズは約3MBまで
export const runtime = "nodejs";
export const maxDuration = 30; // 最大30秒

// ---------------------------------------------------------------------------
// CORS ヘッダー
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-secret",
};

// ---------------------------------------------------------------------------
// OPTIONS ハンドラー（CORS プリフライト）
// ---------------------------------------------------------------------------
export async function OPTIONS() {
  console.log("[admin/upload-image] OPTIONS request received");
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// ---------------------------------------------------------------------------
// GET ハンドラー（デバッグ用）
// ---------------------------------------------------------------------------
export async function GET() {
  console.log("[admin/upload-image] GET request received (debug endpoint)");
  return NextResponse.json(
    {
      message: "Image upload endpoint is working",
      methods: ["POST", "OPTIONS"],
      cors: CORS_HEADERS,
    },
    { headers: CORS_HEADERS },
  );
}

// ---------------------------------------------------------------------------
// 認証ヘルパー
// ---------------------------------------------------------------------------
function authorize(request: NextRequest): boolean {
  const secret = (process.env.ADMIN_SHARED_SECRET ?? "").trim();
  if (!secret) {
    console.error("[admin/upload-image] ADMIN_SHARED_SECRET env var is not set");
    return false;
  }
  const provided = (request.headers.get("x-admin-secret") ?? "").trim();
  if (provided !== secret) {
    console.error(
      `[admin/upload-image] auth mismatch: provided length=${provided.length}, expected length=${secret.length}`,
    );
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// POST — 画像アップロード
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  console.log("[admin/upload-image] POST request received");
  console.log("[admin/upload-image] Headers:", Object.fromEntries(request.headers.entries()));

  if (!authorize(request)) {
    console.error("[admin/upload-image] Authorization failed");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  console.log("[admin/upload-image] Authorization successful");

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase が設定されていません" },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON パースに失敗しました" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "リクエストボディが空です" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const b = body as Record<string, unknown>;
  const imageData = String(b.image ?? "").trim();

  if (!imageData) {
    return NextResponse.json(
      { error: "image フィールドが必要です" },
      { status: 422, headers: CORS_HEADERS },
    );
  }

  // Base64 データの検証と変換
  let base64Data: string;
  let contentType: string;

  // data:image/xxx;base64,... 形式の場合
  const dataUrlMatch = imageData.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
  if (dataUrlMatch) {
    const fileType = dataUrlMatch[1];
    contentType = `image/${fileType === "jpg" ? "jpeg" : fileType}`;
    base64Data = dataUrlMatch[2];
  } else {
    // 生のBase64の場合（デフォルトでJPEG扱い）
    base64Data = imageData;
    contentType = "image/jpeg";
  }

  // Base64をBufferに変換
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, "base64");
  } catch {
    return NextResponse.json(
      { error: "Base64 デコードに失敗しました" },
      { status: 422, headers: CORS_HEADERS },
    );
  }

  // ファイルサイズチェック（3MB制限）
  // Base64エンコードで約33%増加するため、デコード後のサイズで制限
  // Vercel Hobby プランの制限（4.5MB）を考慮
  const MAX_SIZE = 3 * 1024 * 1024; // 3MB
  if (buffer.length > MAX_SIZE) {
    return NextResponse.json(
      { error: "画像サイズが大きすぎます（最大3MB）" },
      { status: 422, headers: CORS_HEADERS },
    );
  }

  // ファイル名生成（タイムスタンプ + ランダム文字列）
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = contentType.split("/")[1];
  const fileName = `tenant-images/${timestamp}-${random}.${extension}`;

  // Supabase Storage にアップロード
  try {
    const { data, error } = await supabase.storage
      .from("tenant-images") // バケット名（事前に作成しておく必要あり）
      .upload(fileName, buffer, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("[admin/upload-image] upload error:", error);
      return NextResponse.json(
        { error: `アップロードに失敗しました: ${error.message}` },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from("tenant-images")
      .getPublicUrl(data.path);

    return NextResponse.json(
      { ok: true, url: urlData.publicUrl },
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (e: unknown) {
    console.error("[admin/upload-image] unexpected error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `予期しないエラー: ${message}` },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
