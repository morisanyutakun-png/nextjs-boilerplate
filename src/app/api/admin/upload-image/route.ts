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
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
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
  if (!authorize(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS },
    );
  }

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

  // ファイルサイズチェック（5MB制限）
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (buffer.length > MAX_SIZE) {
    return NextResponse.json(
      { error: "画像サイズが大きすぎます（最大5MB）" },
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
