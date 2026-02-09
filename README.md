# 📅 予約ポータル（Paging App）

> **このアプリは「テナント予約ページ（Google Apps Script Web アプリ）への安全なリダイレクト」だけを提供するポータルサイトです。**
> 予約の作成・閲覧・変更などのデータ操作は一切行いません。

---

## 📖 概要

提携企業（テナント）の予約ページへ、安全に遷移させるためのポータルです。

- ユーザーはトップページ `/` で企業一覧を閲覧・検索
- 企業カードをクリックすると `/t/{slug}` でサーバ側検証後にリダイレクト
- iframe 埋め込みは行わず、`redirect()` のみ

## 🛡️ セキュリティ設計

### オープンリダイレクト対策

| 対策 | 詳細 |
|------|------|
| **URL 内部解決のみ** | ユーザー入力の URL をそのまま使わない。`slug` → レジストリ内の `bookingUrl` を解決 |
| **https 強制** | `http://` のリダイレクト先は拒否 |
| **許可ホストリスト** | 以下のホストのみ許容 |

### 許可ホスト一覧

```
script.google.com
script.googleusercontent.com
```

許可ホストの変更は `src/lib/urlGuard.ts` の `ALLOWED_HOSTS` を編集してください。

### 検証フロー

```
/t/[slug]
  ├─ slug が存在しない → 404
  ├─ isPublic = false  → 404
  ├─ URL 検証 NG       → /error?code=invalid_url
  └─ URL 検証 OK       → redirect(bookingUrl)
```

## 🗂️ ファイル構成

```
src/
├── __tests__/
│   └── urlGuard.test.ts          # URL 検証のユニットテスト
├── app/
│   ├── api/tenants/route.ts      # テナント一覧 API
│   ├── error/page.tsx            # エラー画面
│   ├── t/[slug]/page.tsx         # リダイレクト処理（サーバコンポーネント）
│   ├── not-found.tsx             # 404 画面
│   ├── layout.tsx                # 共通レイアウト
│   ├── page.tsx                  # トップ（テナント一覧）
│   └── globals.css               # グローバルCSS
└── lib/
    ├── types.ts                  # Tenant 型定義
    ├── tenantRegistry.ts         # テナントレジストリ（slug → URL 解決）
    └── urlGuard.ts               # URL 安全検証
```

## 🚀 起動方法

### 前提条件

- Node.js 18 以上
- npm

### インストール & 起動

```bash
# 依存パッケージのインストール
npm install

# 開発サーバー起動（http://localhost:3000）
npm run dev

# プロダクションビルド
npm run build

# プロダクション起動
npm start
```

### テスト実行

```bash
# テスト実行（1回）
npm test

# ウォッチモード
npm run test:watch
```

## 📝 テナントの追加方法

### 1. `src/lib/tenantRegistry.ts` を編集

`tenants` 配列に新しいオブジェクトを追加します：

```typescript
{
  slug: "new-company",          // URL に使う一意の ID（英数字・ハイフン）
  name: "新規カンパニー",         // 表示名
  category: "飲食",              // カテゴリ（任意）
  bookingUrl:                   // GAS Web アプリの URL
    "https://script.google.com/macros/s/ACTUAL_DEPLOY_ID/exec",
  isPublic: true,               // true: 公開 / false: 非公開
  updatedAtISO: "2026-02-09T00:00:00+09:00",
}
```

### 2. 確認事項

- `bookingUrl` は必ず `https://script.google.com/...` または `https://script.googleusercontent.com/...` であること
- `slug` は他のテナントと重複しないこと
- `isPublic: false` にすると一覧にも表示されず、直リンクでも 404 になります

## 🔮 将来のDB化ポイント

現在はテナントデータを `src/lib/tenantRegistry.ts` にハードコードしていますが、DB に移行する際は以下の方針で進めてください：

1. **型定義は変更不要**: `src/lib/types.ts` の `Tenant` インターフェースをそのまま使用
2. **変更するファイルは1つだけ**: `src/lib/tenantRegistry.ts` の内部実装を DB クエリに差し替え
3. **公開 API は維持**: `getTenantBySlug()` と `listPublicTenants()` のシグネチャは変えない
4. **DB 候補例**:
   - Supabase (PostgreSQL)
   - PlanetScale (MySQL)
   - Firestore
   - Vercel KV / Vercel Postgres

```typescript
// 例: Supabase に差し替えた場合
export async function getTenantBySlug(slug: string): Promise<Tenant | undefined> {
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();
  return data ?? undefined;
}
```

> **注意**: DB 化する場合は `getTenantBySlug` / `listPublicTenants` を `async` に変更し、
> 呼び出し元も `await` に対応させてください。
> `/t/[slug]/page.tsx` は既に `async` サーバコンポーネントなので変更は最小限です。

## 📄 ライセンス

MIT
