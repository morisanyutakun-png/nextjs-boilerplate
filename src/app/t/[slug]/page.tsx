/**
 * テナント予約ページへのリダイレクト
 *
 * サーバコンポーネントで以下を行う:
 *   1. slug からテナントを検索
 *   2. isPublic チェック
 *   3. bookingUrl の安全検証
 *   4. redirect()
 */
import { notFound, redirect } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenantRegistry";
import { validateBookingUrl } from "@/lib/urlGuard";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantRedirectPage({ params }: PageProps) {
  const { slug } = await params;

  // 1. テナント検索
  const tenant = getTenantBySlug(slug);
  if (!tenant) {
    notFound();
  }

  // 2. 公開チェック（非公開は 404 扱い）
  if (!tenant.isPublic) {
    notFound();
  }

  // 3. URL 安全検証
  const validation = validateBookingUrl(tenant.bookingUrl);
  if (!validation.ok) {
    redirect(`/error?code=invalid_url`);
  }

  // 4. 安全な URL へリダイレクト
  redirect(tenant.bookingUrl);
}
