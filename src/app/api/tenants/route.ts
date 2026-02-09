/**
 * テナント一覧 API (GET /api/tenants)
 *
 * クエリパラメータ:
 *   - name: 会社名で部分一致検索
 *   - category: カテゴリで部分一致検索
 */
import { NextRequest, NextResponse } from "next/server";
import { listPublicTenants } from "@/lib/tenantRegistry";

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const name = searchParams.get("name") || undefined;
  const category = searchParams.get("category") || undefined;

  const tenants = listPublicTenants({ name, category });

  return NextResponse.json(tenants);
}
