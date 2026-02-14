# 📅 予約ポータル（Paging App）

> **テナント予約ページ（Google Apps Script Web アプリ）への安全な案内ポータルサイトです。**
> 予約の作成・閲覧・変更などのデータ操作は一切行いません。各テナントの詳細表示 + 予約ボタンで外部サイトへ安全に遷移します。

---

## 📖 概要

提携企業（テナント）の店舗情報を表示し、予約ページへ安全に案内するポータルです。

| ページ | URL | 役割 |
|--------|-----|------|
| トップ | `/` | テナント一覧（検索・カテゴリフィルタ付き） |
| 店舗詳細 | `/t/{slug}` | 写真・説明・メニュー概要・予約ボタン |
| エラー | `/error?code=...` | URL検証エラー等の表示 |

### データの流れ

```
別アプリ（テナント登録用）→ Supabase DB → このポータル（表示のみ）
                                          ↓
                                     予約ボタン → GAS Web アプリ（外部）
```

- **Supabase 未接続時**: ローカルのフォールバックデータが表示されます（開発用）
- **Supabase 接続時**: DB からテナント情報を取得して表示

## 🛡️ セキュリティ設計

### オープンリダイレクト対策

| 対策 | 詳細 |
|------|------|
| **URL 内部解決のみ** | ユーザー入力の URL をそのまま使わない。`slug` → DB/レジストリ内の `bookingUrl` を解決 |
| **https 強制** | `http://` のリダイレクト先は拒否 |
| **許可ホストリスト** | `script.google.com` / `script.googleusercontent.com` のみ |

許可ホストの変更は `src/lib/urlGuard.ts` の `ALLOWED_HOSTS` を編集してください。

## 🗂️ ファイル構成

```
src/
├── __tests__/
│   └── urlGuard.test.ts          # URL 検証のユニットテスト（10ケース）
├── app/
│   ├── api/tenants/route.ts      # テナント一覧 API（GET, 検索対応）
│   ├── error/page.tsx            # エラー画面
│   ├── t/[slug]/page.tsx         # 店舗詳細（写真・メニュー・予約ボタン）
│   ├── not-found.tsx             # 404 画面
│   ├── layout.tsx                # 共通レイアウト
│   ├── page.tsx                  # トップ（一覧 + 検索 + カテゴリフィルタ）
│   └── globals.css               # グローバルCSS
└── lib/
    ├── types.ts                  # Tenant / MenuItem 型定義
    ├── supabase.ts               # Supabase クライアント初期化
    ├── tenantRegistry.ts         # テナント取得（Supabase or ローカルフォールバック）
    └── urlGuard.ts               # URL 安全検証
```

## 🚀 起動方法

### 前提条件

- Node.js 18 以上
- npm

### インストール & 起動

```bash
npm install
npm run dev          # 開発サーバー（http://localhost:3000）
npm run build        # 本番ビルド
npm start            # 本番起動
```

### テスト

```bash
npm test             # テスト実行
npm run test:watch   # ウォッチモード
```

## � 環境変数

`.env.local.example` をコピーして `.env.local` を作成してください。

```bash
cp .env.local.example .env.local
```

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase使用時 | Supabase プロジェクト URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase使用時 | サービスロールキー（サーバ専用） |

> **未設定でも動作します**（ローカルのデモデータが使われます）。

## 🗄️ Supabase テーブル設計

別アプリからテナント情報を登録する場合、以下のテーブルを Supabase に作成してください：

```sql
CREATE TABLE tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  booking_url TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  photo_url TEXT,
  description TEXT,
  catch_copy TEXT,
  address TEXT,
  phone TEXT,
  business_hours TEXT,
  closed_days TEXT,
  menus JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_is_public ON tenants (is_public);
```

### menus カラムの JSON 形式

```json
[
  { "name": "カット", "price": "¥4,400", "description": "似合わせカット" },
  { "name": "カラー", "price": "¥6,600〜" }
]
```

### tags カラムの JSON 形式

```json
["駅チカ", "カード可", "当日予約OK"]
```

## 📝 テナントの追加方法

### 方法 1: Supabase（推奨 — 別アプリから登録）

別のテナント管理アプリから Supabase の `tenants` テーブルに INSERT するだけです。
このポータルは自動的にデータを取得して表示します。

### 方法 2: ローカルフォールバック（開発用）

`src/lib/tenantRegistry.ts` の `LOCAL_TENANTS` 配列を編集してください。

## 📄 ライセンス

MIT










gitにpush必要なし。tenantapp排除してからpushね。