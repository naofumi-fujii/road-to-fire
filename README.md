# Road to FIRE - 積立投資シミュレーター

目標金額達成のための積立投資シミュレーションツールです。

## 機能

- 目標金額と毎月の積立額を設定
- 想定年利を考慮した複利計算
- 資産推移をグラフで可視化
- 目標達成までの期間と総投資額、運用益を表示

## 使い方

### 開発環境での実行

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### ビルド

```bash
pnpm run build
pnpm start
```

## Vercelへのデプロイ

このプロジェクトはVercelに簡単にデプロイできます。

### 方法1: Vercel CLIを使用

```bash
# Vercel CLIのインストール（初回のみ）
pnpm add -g vercel

# デプロイ
vercel
```

### 方法2: GitHub連携

1. GitHubリポジトリにプッシュ
2. [Vercel](https://vercel.com)にログイン
3. "Import Project"からGitHubリポジトリを選択
4. デプロイ設定を確認して"Deploy"をクリック

### 環境変数

このプロジェクトは環境変数を使用していないため、特別な設定は不要です。

## 技術スタック

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- Recharts（グラフ表示）

## ライセンス

MIT