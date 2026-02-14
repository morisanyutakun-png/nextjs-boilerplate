-- =====================================================
-- tenants テーブル
-- ポータルサイト (paging_app) のテナント情報を管理する。
-- GAS テナントアプリから Admin API 経由で upsert される。
-- =====================================================

CREATE TABLE IF NOT EXISTS tenants (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category    TEXT DEFAULT '',
  booking_url TEXT DEFAULT '',
  is_public   BOOLEAN DEFAULT TRUE,
  updated_at  TIMESTAMPTZ DEFAULT now(),

  -- 拡張フィールド（ポータル表示用）
  photo_url      TEXT,
  catch_copy     TEXT,
  description    TEXT,
  address        TEXT,
  phone          TEXT,
  business_hours TEXT,
  closed_days    TEXT,
  menus          JSONB DEFAULT '[]'::jsonb,
  tags           JSONB DEFAULT '[]'::jsonb
);

-- slug で高速検索
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);

-- 公開テナント一覧の取得を高速化
CREATE INDEX IF NOT EXISTS idx_tenants_public ON tenants (is_public) WHERE is_public = TRUE;

-- RLS (Row Level Security)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- サービスロールは全操作可能
CREATE POLICY "service_role_full_access" ON tenants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- anon / authenticated は公開テナントの SELECT のみ
CREATE POLICY "public_read_only" ON tenants
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);
