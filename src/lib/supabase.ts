/**
 * Supabase クライアント（サーバサイド用）
 *
 * 環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL  — Supabase プロジェクト URL
 *   SUPABASE_SERVICE_ROLE_KEY — サービスロールキー（サーバ専用、クライアントに露出しない）
 *
 * 環境変数が未設定の場合は null を返し、ローカルフォールバックデータが使われる。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function initSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to local data.",
    );
    return null;
  }

  return createClient(url, key);
}

export const supabase = initSupabase();
