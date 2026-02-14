import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware — API ルートへの CORS プリフライト対応
 *
 * GAS (Google Apps Script) の UrlFetchApp は
 * サーバーサイドHTTPクライアントなので通常CORSプリフライトは不要だが、
 * 念のため OPTIONS リクエストを処理する。
 */
export function middleware(request: NextRequest) {
  // OPTIONS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-admin-secret",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
