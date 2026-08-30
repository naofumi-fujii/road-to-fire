# Road to FIRE - 積立投資シミュレーター

目標金額達成のための積立投資シミュレーションツールです。

## 機能

### 積立投資シミュレーター（`/`）

- 目標金額と毎月の積立額を設定
- 想定年利を考慮した複利計算
- 資産推移をグラフで可視化
- 目標達成までの期間と総投資額、運用益を表示

### 日米の金利と為替（`/rates`）

- 米国・日本の政策金利と米ドル/円の推移を2000年からグラフで表示
- 表示期間の切り替え（3年 / 5年 / 10年 / 全期間）
- 「上下に分ける」（金利と為替を2段に並べ、カーソルを合わせると同じ月が連動）と
  「重ねて表示」（左右2軸で1つのグラフに重ね、金利差と為替の連動を確認）を切り替え可能

#### データの更新

データは `app/data/rates.ts` に静的に持っています（ページ自体は静的なまま保ち、
外部APIの障害が画面に波及しないようにするため）。

更新は GitHub Actions で自動化しています。

- `.github/workflows/update-rates.yml` が毎月2日に `scripts/update-rates.mjs` を実行し、
  前月までのデータを追記したプルリクエストを作ります
- Actions タブの "Run workflow" から手動実行もできます。`dry_run` を有効にすると
  取得結果を表示するだけでプルリクエストは作りません
- 手元で確認する場合は `node scripts/update-rates.mjs --dry-run`

取得元はいずれもAPIキーの要らない公開エンドポイントです。

| データ | 取得元 |
| --- | --- |
| 米国の政策金利 | FRED `DFEDTARU`（FF金利の誘導目標レンジ上限） |
| 米ドル/円 | Frankfurter API（ECB参照レートの各月最終営業日） |
| 日本の政策金利 | 日銀の基準貸付利率（= 政策金利 + 0.25%）から推定し、FRED `IRSTCI01JPM156N`（無担保コールレートの月中平均）で裏を取る |

日本の政策金利だけは誘導目標を直接返す公開APIがないため推定値です。
プルリクエストには「要確認」の注記が付くので、日銀の公表値と照らして確認してください。

手で更新する場合は `app/data/rates.ts` の以下を編集します。

- `US_POLICY_RATE_CHANGES` / `JP_POLICY_RATE_CHANGES`: 政策金利が変わった月とその値
- `USD_JPY_MONTH_END`: 米ドル/円の月末値（2000年1月から1ヶ月刻みで連続）
- `DATA_END_MONTH`: データの最終月（画面の「データ最終更新」に表示される）

数値は米連邦準備制度理事会（FRB）・日本銀行の公表値をもとにした参考値です。

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

### GitHub Actions の設定

`update-rates.yml` がプルリクエストを作れるように、リポジトリの
Settings > Actions > General > Workflow permissions で
"Allow GitHub Actions to create and approve pull requests" を有効にしてください。

## ライセンス

MIT
