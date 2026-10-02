# Protly クラウド保存のセットアップ手順（Supabase）

Protly のクラウド機能は **Supabase**（無料枠あり）を使います。  
一度設定すれば、スマホとPCなど複数端末でデータを共有できます。

> 設定が面倒な場合は、設定画面の **エクスポート** だけでもバックアップできます。

---

## 所要時間の目安

約10〜15分

---

## 手順

### 1. Supabase アカウントを作る

1. [https://supabase.com](https://supabase.com) を開く
2. 「Start your project」で GitHub などから登録
3. **New project** でプロジェクトを作成
   - Name: `protly` など自由
   - Database Password: 控えておく（アプリでは直接使いません）
   - Region: `Northeast Asia (Tokyo)` がおすすめ

作成完了まで1〜2分待ちます。

### 2. データベースのテーブルを作る

1. 左メニュー **SQL Editor** を開く
2. **New query**
3. このプロジェクトの `supabase/schema.sql` の中身をすべてコピーして貼り付け
4. **Run** を押す
5. Success と出ればOK

### 3. URL とキーを控える（画面の名前が新しくなっています）

新しいダッシュボードでは「Project URL」と出てこないことがあります。次のどれかで探せます。

#### URL（どちらか）

1. 左下の **歯車（Project Settings）** → **Data API**  
   → `https://xxxxx.supabase.co` の形の URL があるのでコピー  
2. または画面上部の **Connect** を開くと、URL が表示されます

#### キー

1. **Project Settings** → **API Keys**  
2. **Publishable key** をコピー（`sb_publishable_...` や長い文字列）  
3. **Secret key は使わない**

（古い画面なら `anon` / `Legacy API keys` の public キーでもOKです）

### 4. アプリに設定を書く

1. プロジェクト直下の `.env.local.example` をコピーして `.env.local` を作る
2. 中身を自分の URL / キーに書き換える

```bash
cp .env.local.example .env.local
```

例:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...（または anon キー）
```

### 5. 開発サーバーを再起動

```bash
npm run dev
```

### 6. アプリで使う

1. ブラウザで http://localhost:3000/settings を開く
2. **クラウド自動同期** にログイン／新規登録フォームが出ていることを確認
3. メール＋パスワードで登録 → ログイン
4. これ以降、食事を記録すると **約1.5秒後に自動でクラウドへ保存** されます
5. 別端末では同じアカウントでログイン → 起動時に自動で取り込みます
6. 必要なら「今すぐ同期」「クラウドから強制復元」も使えます

---

## メール確認について

Supabase の設定によっては、登録後に確認メールが必要です。

- 開発中に確認メールを飛ばしたい場合:  
  Authentication → Providers → Email → **Confirm email** を OFF

---

## トラブルシューティング

| 症状 | 確認すること |
|------|----------------|
| クラウド欄が「設定が必要」のまま | `.env.local` があるか、`npm run dev` を再起動したか |
| ログインできない | メール確認が ON ならメール内リンクを開いたか |
| 保存でエラー | `schema.sql` を実行したか |

---

## スマホ公開について

インターネットに公開してスマホから使う手順は `docs/DEPLOY.md` を参照してください。
公開後は Supabase の **Site URL** を Vercel の URL に合わせてください。

---

## セキュリティの注意

- `.env.local` は Git にコミットしない（`.gitignore` 済み）
- `service_role` / Secret key は絶対にフロントエンドに書かない
