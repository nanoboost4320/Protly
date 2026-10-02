# Protly を特定の人だけに使う（コード非公開）

この手順では次を守ります。

- **ソースコードは GitHub Private（非公開）** → 他人から見られない
- **アプリは Vercel でインターネット公開** → 別の家のスマホから使える
- **食事データはログインした人だけ** → Supabase で分離

一般向けに宣伝する公開ではなく、「URLを伝えた人 + アカウントを持った人」向けです。

## 所要時間の目安

約20〜30分

---

## 全体像

```text
GitHub（Private）  ← コード置き場。外から見えない
      ↓ 連携
Vercel             ← アプリの画面をインターネットに出す
      ↓
Supabase           ← ログインと食事データの倉庫
```

---

## 1. 最初のコミット（ローカル）

プロジェクト直下で、すでにコミット済みならスキップ。

```bash
cd "/Users/yuya/Projects/食事管理ツール"
git status
```

`.env.local` が一覧に出てこないことを確認（出てきたらコミットしない）。

---

## 2. GitHub に Private リポジトリを作る

1. [https://github.com](https://github.com) にログイン
2. 右上 **+** → **New repository**
3. 設定:
   - Repository name: `protly` など
   - **Private** を必ず選ぶ（Public にしない）
   - README の追加は不要（すでにローカルにあるため）
4. **Create repository**

作成後に出る「push 用コマンド」を控える。だいたい次の形です。

```bash
git remote add origin https://github.com/あなたのユーザー名/protly.git
git branch -M main
git push -u origin main
```

（GitHub にログインを求められたら、画面の案内に従う）

---

## 3. Vercel でデプロイ

1. [https://vercel.com](https://vercel.com) にログイン（GitHub 連携が簡単）
2. **Add New… → Project**
3. Private の `protly` リポジトリを選ぶ  
   （初回は GitHub 連携で Private リポジトリへのアクセス許可が必要な場合あり）
4. **Environment Variables** に追加（Production / Preview 両方）

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | 今の `.env.local` と同じ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 今の `.env.local` と同じ Publishable key |

5. **Deploy**
6. 完了後の URL（例: `https://protly-xxxx.vercel.app`）を控える

---

## 4. Supabase の URL 設定（必須）

1. Supabase → **Authentication** → **URL Configuration**
2. **Site URL** を Vercel の URL にする  
   例: `https://protly-xxxx.vercel.app`
3. **Redirect URLs** に追加:
   - `https://protly-xxxx.vercel.app/**`
   - （自分のPC開発用）`http://localhost:3000/**`

---

## 5. 使う人を限定する

### 最低限（これだけでもOK）

- URL は信頼できる人にだけ教える
- 各自が **自分のメールで新規登録 → ログイン**
- 他人のデータは見えない（アカウントごとに分離）

### さらに厳しくする（おすすめ）

友達が登録し終わったら、新規登録を止める:

1. Supabase → **Authentication** → **Providers** → **Email**
2. **Allow new users to sign up** を OFF

これ以後は、すでに登録済みの人だけログインできます。  
（新しい人を足すときは、一時的に ON に戻す）

---

## 6. 相手に伝えること

相手には次だけ伝えれば足ります。

1. Protly の URL（Vercel のアドレス）
2. 設定画面で **新規登録**（自分のメール）して使う
3. あなたのアカウントとは別になること

コードの見方や GitHub の話は不要です。

---

## よくある不安

| 不安 | 実態 |
|------|------|
| コードがネットに晒される？ | **Private なら GitHub 上は非公開** |
| 知らない人に食事が見られる？ | **ログインしないと自分のデータは見えない** |
| URL を知られたら？ | 画面は開けるが、登録を OFF にすれば入れない／入っても空の自分用アカウントになるだけ |

---

## トラブルシューティング

| 症状 | 確認 |
|------|------|
| Vercel でクラウド設定が出ない | Environment Variables を入れたか、再デプロイしたか |
| ログインできない | Supabase の Site URL / Redirect URLs |
| GitHub に `.env.local` が上がりそう | 上がっていないか GitHub のファイル一覧で確認。上がっていたらすぐ消してキーを再発行 |
