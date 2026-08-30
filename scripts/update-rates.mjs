#!/usr/bin/env node
// 政策金利・為替データの自動更新スクリプト（scripts/update-rates.mjs）
//
// app/data/rates.ts の末尾に、まだ入っていない完了済みの月のデータを追記する。
// APIキーが要らない公開エンドポイントだけを使うため、README の「環境変数を使わない」
// 方針を崩さない。GitHub Actions（.github/workflows/update-rates.yml）から
// 月次で実行し、差分が出たらプルリクエストを作る想定。
//
// 使い方:
//   node scripts/update-rates.mjs            # app/data/rates.ts を書き換える
//   node scripts/update-rates.mjs --dry-run  # 書き換えず、取得結果だけ表示する
//
// データソース:
//   - 米政策金利: FRED DFEDTARU（FF金利の誘導目標レンジ上限・日次）
//   - 米ドル/円 : Frankfurter API（ECB参照レート・営業日次）
//   - 日本の政策金利: 直接取れる公開APIがないため、下記2つから推定して
//     「候補」として提示する。値の確定はプルリクエストのレビューで人間が行う
//       - 日銀 基準貸付利率（月次）… 現行の金融政策では 政策金利 + 0.25%
//       - FRED IRSTCI01JPM156N（無担保コールレート O/N の月中平均・約2ヶ月遅れ）
//
// 注意（米ドル/円の出典の差）:
//   2025年12月までの既存データは東京市場の月末値をもとにした参考値で、
//   ここで追記する ECB 参照レートとは 1円前後ずれることがある。
//   グラフの用途（金利差と為替の関係を眺める）では許容範囲として扱っている。

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = join(ROOT, 'app/data/rates.ts');
const DRY_RUN = process.argv.includes('--dry-run');

/** 日本の政策金利の推定に使う許容差（scripts/update-rates.mjs）
 *  月の途中で変更があると月中平均は中間の値になるため、0.3% までのずれは許容する */
const JP_RATE_TOLERANCE = 0.3;

// ---------------------------------------------------------------- 汎用ユーティリティ

/** タイムアウトとリトライ付きの fetch（scripts/update-rates.mjs） */
async function fetchText(url, { retries = 2, timeoutMs = 20000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': 'road-to-fire-rates-updater' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt >= retries) throw new Error(`${url} の取得に失敗しました: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
}

/** 'YYYY-MM' を通し番号に変換する（scripts/update-rates.mjs） */
function monthIndex(month) {
  const [year, mon] = month.split('-').map(Number);
  return year * 12 + (mon - 1);
}

/** 通し番号を 'YYYY-MM' に戻す（scripts/update-rates.mjs） */
function indexToMonth(index) {
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** 直近で「終わっている」月を返す（scripts/update-rates.mjs）
 *  進行中の月は月末値が確定していないため対象にしない */
function lastCompletedMonth(now = new Date()) {
  return indexToMonth(monthIndex(`${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`) - 1);
}

// ---------------------------------------------------------------- データ取得

/** FRED の CSV を 日付→値 の配列で取得する（scripts/update-rates.mjs） */
async function fetchFredCsv(seriesId) {
  const csv = await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`);
  const rows = [];
  for (const line of csv.trim().split('\n').slice(1)) {
    const [date, raw] = line.trim().split(',');
    const value = Number(raw);
    // 欠測は '.' で入るため Number() が NaN になる。そのまま捨てる
    if (date && Number.isFinite(value)) rows.push([date, value]);
  }
  if (rows.length === 0) throw new Error(`FRED ${seriesId} から有効な値が取れませんでした`);
  return rows;
}

/** 米政策金利（誘導目標レンジ上限）の「月末時点の値」を月ごとに返す（scripts/update-rates.mjs） */
async function fetchUsPolicyRateByMonth() {
  const rows = await fetchFredCsv('DFEDTARU');
  // 日次系列なので、各月の最後の観測値をその月の月末値とする
  const byMonth = new Map();
  for (const [date, value] of rows) byMonth.set(date.slice(0, 7), value);
  return byMonth;
}

/** 無担保コールレート O/N の月中平均を返す（scripts/update-rates.mjs）
 *  日本の政策金利の裏取りに使う。取れなくても処理は続ける */
async function fetchJpCallRateByMonth() {
  try {
    const rows = await fetchFredCsv('IRSTCI01JPM156N');
    return new Map(rows.map(([date, value]) => [date.slice(0, 7), value]));
  } catch (err) {
    console.warn(`警告: 無担保コールレートの取得に失敗しました（${err.message}）`);
    return new Map();
  }
}

/** 日銀の基準貸付利率（月次）を返す（scripts/update-rates.mjs）
 *  Shift_JIS の HTML 表なので、行を素朴に拾う。構造が変わったら空を返して警告する */
async function fetchBojBasicLoanRateByMonth() {
  try {
    const res = await fetch('https://www.stat-search.boj.or.jp/ssi/mtshtml/ir01_m_1.html', {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = new TextDecoder('shift_jis').decode(await res.arrayBuffer());
    const text = html.replace(/<[^>]*>/g, ' ');
    const byMonth = new Map();
    for (const [, year, mon, value] of text.matchAll(/(\d{4})\/(\d{2})\s+(\d+(?:\.\d+)?)\s/g)) {
      byMonth.set(`${year}-${mon}`, Number(value));
    }
    if (byMonth.size === 0) throw new Error('表を読み取れませんでした');
    return byMonth;
  } catch (err) {
    console.warn(`警告: 日銀の基準貸付利率の取得に失敗しました（${err.message}）`);
    return new Map();
  }
}

/** 米ドル/円の月末値（対象期間の各月の最終営業日）を返す（scripts/update-rates.mjs） */
async function fetchUsdJpyMonthEnd(fromMonth, toMonth) {
  const url = `https://api.frankfurter.dev/v1/${fromMonth}-01..${toMonth}-31?base=USD&symbols=JPY`;
  const json = JSON.parse(await fetchText(url));
  const byMonth = new Map();
  // 日付順に上書きしていくことで、各月の最後の営業日の値が残る
  for (const date of Object.keys(json.rates ?? {}).sort()) {
    const value = json.rates[date]?.JPY;
    if (Number.isFinite(value)) byMonth.set(date.slice(0, 7), Math.round(value * 10) / 10);
  }
  return byMonth;
}

// ---------------------------------------------------------------- app/data/rates.ts の読み書き

/** 定数の配列リテラル部分（[ ... ]）を切り出す（scripts/update-rates.mjs） */
function sliceArrayLiteral(source, constName) {
  const start = source.indexOf(`const ${constName}`);
  if (start === -1) throw new Error(`${constName} が見つかりません`);
  const open = source.indexOf('[', source.indexOf('=', start));
  const close = source.indexOf('\n];', open);
  if (open === -1 || close === -1) throw new Error(`${constName} の配列を読み取れません`);
  return { open, close: close + 1, body: source.slice(open + 1, close) };
}

/** 金利変更イベント配列の最後の [月, 値] を返す（scripts/update-rates.mjs） */
function lastRateChange(source, constName) {
  const { body } = sliceArrayLiteral(source, constName);
  const entries = [...body.matchAll(/\['(\d{4}-\d{2})',\s*(-?\d+(?:\.\d+)?)\]/g)];
  if (entries.length === 0) throw new Error(`${constName} に要素がありません`);
  const [, month, value] = entries[entries.length - 1];
  return { month, value: Number(value) };
}

/** USD_JPY_MONTH_END を「年ごとのコメント」と「値の並び」に分解する（scripts/update-rates.mjs） */
function parseUsdJpyArray(source) {
  const { body } = sliceArrayLiteral(source, 'USD_JPY_MONTH_END');
  const values = [];
  const yearComments = new Map();
  for (const line of body.split('\n')) {
    const comment = line.match(/^\s*\/\/\s*(\d{4}.*)$/);
    if (comment) {
      // 「2013（アベノミクス…）」のような手書きの補足はそのまま引き継ぐ
      yearComments.set(comment[1].slice(0, 4), comment[1]);
      continue;
    }
    // 値の行に補足コメントが付いても数値だけを拾えるようにする
    for (const [, raw] of line.replace(/\/\/.*$/, '').matchAll(/(-?\d+(?:\.\d+)?)/g)) values.push(Number(raw));
  }
  return { values, yearComments };
}

/** USD_JPY_MONTH_END の中身を組み立て直す（scripts/update-rates.mjs）
 *  値は 2000年1月から連続しているため、12個ごとに年で改行する */
function renderUsdJpyArray(values, yearComments) {
  const lines = [];
  for (let i = 0; i < values.length; i += 12) {
    const year = String(2000 + i / 12);
    lines.push(`  // ${yearComments.get(year) ?? year}`);
    // 既存データと同じ表記に揃えるため、小数第1位まで必ず書く（118.0 が 118 にならないように）
    lines.push(`  ${values.slice(i, i + 12).map((v) => v.toFixed(1)).join(', ')},`);
  }
  return `\n${lines.join('\n')}\n`;
}

/** 金利変更イベントを配列リテラルの末尾に追記する（scripts/update-rates.mjs） */
function appendRateChanges(source, constName, changes) {
  if (changes.length === 0) return source;
  const { close } = sliceArrayLiteral(source, constName);
  const added = changes
    .map(({ month, value, comment }) =>
      `  ['${month}', ${value.toFixed(2)}],${comment ? ` // ${comment}` : ''}\n`)
    .join('');
  return `${source.slice(0, close)}${added}${source.slice(close)}`;
}

// ---------------------------------------------------------------- 更新処理

/** 取得した月次値から、まだ記録されていない変更イベントだけを抜き出す（scripts/update-rates.mjs） */
function diffRateChanges(byMonth, lastKnown, months) {
  const changes = [];
  let current = lastKnown.value;
  for (const month of months) {
    const value = byMonth.get(month);
    if (value === undefined) continue;
    if (value !== current) {
      changes.push({ month, value });
      current = value;
    }
  }
  return changes;
}

/**
 * 日本の政策金利の変更候補を求める（scripts/update-rates.mjs）
 * 基準貸付利率（= 政策金利 + 0.25%）から候補を出し、無担保コールレートの
 * 月中平均で裏を取る。裏が取れないものは候補から外し、警告として返す。
 */
function estimateJpRateChanges(basicLoanByMonth, callRateByMonth, lastKnown, months) {
  const changes = [];
  const warnings = [];
  let current = lastKnown.value;

  for (const month of months) {
    const basicLoan = basicLoanByMonth.get(month);
    // マイナス金利期や量的緩和期は「基準貸付利率 − 0.25%」の関係が成り立たない
    if (basicLoan === undefined || basicLoan < 0.5) continue;

    const candidate = Math.round((basicLoan - 0.25) * 100) / 100;
    if (candidate === current) continue;

    const callRate = callRateByMonth.get(month);
    if (callRate !== undefined && Math.abs(callRate - candidate) > JP_RATE_TOLERANCE) {
      warnings.push(
        `${month}: 日本の政策金利が ${current}% → ${candidate}% に変わった可能性がありますが、` +
        `無担保コールレートの月中平均 ${callRate}% と ${JP_RATE_TOLERANCE}% 以上離れているため追記しませんでした。手動で確認してください`,
      );
      continue;
    }
    changes.push({ month, value: candidate });
    current = candidate;
  }
  return { changes, warnings };
}

async function main() {
  const source = readFileSync(DATA_FILE, 'utf8');

  const endMonthMatch = source.match(/DATA_END_MONTH = '(\d{4}-\d{2})'/);
  if (!endMonthMatch) throw new Error('DATA_END_MONTH を読み取れません');
  const currentEnd = endMonthMatch[1];
  const targetEnd = lastCompletedMonth();

  if (monthIndex(targetEnd) <= monthIndex(currentEnd)) {
    console.log(`更新はありません（データ最終月 ${currentEnd} / 直近の完了月 ${targetEnd}）`);
    return { updated: false, summary: [], warnings: [] };
  }

  const months = [];
  for (let i = monthIndex(currentEnd) + 1; i <= monthIndex(targetEnd); i++) months.push(indexToMonth(i));

  const [usRateByMonth, usdJpyByMonth, basicLoanByMonth, callRateByMonth] = await Promise.all([
    fetchUsPolicyRateByMonth(),
    fetchUsdJpyMonthEnd(months[0], targetEnd),
    fetchBojBasicLoanRateByMonth(),
    fetchJpCallRateByMonth(),
  ]);

  // 為替は1ヶ月でも欠けると配列の添字と月がずれるため、揃わない月以降は更新しない
  const warnings = [];
  let usableEnd = targetEnd;
  for (const month of months) {
    if (!usdJpyByMonth.has(month)) {
      warnings.push(`${month}: 米ドル/円の月末値が取得できなかったため、この月以降は更新を見送りました`);
      usableEnd = indexToMonth(monthIndex(month) - 1);
      break;
    }
  }
  if (monthIndex(usableEnd) <= monthIndex(currentEnd)) {
    console.log('追記できる月がありませんでした');
    return { updated: false, summary: [], warnings };
  }
  const targetMonths = months.filter((month) => monthIndex(month) <= monthIndex(usableEnd));

  const usChanges = diffRateChanges(usRateByMonth, lastRateChange(source, 'US_POLICY_RATE_CHANGES'), targetMonths);
  const jp = estimateJpRateChanges(
    basicLoanByMonth,
    callRateByMonth,
    lastRateChange(source, 'JP_POLICY_RATE_CHANGES'),
    targetMonths,
  );
  warnings.push(...jp.warnings);

  const { values, yearComments } = parseUsdJpyArray(source);
  if (values.length !== monthIndex(currentEnd) - monthIndex('2000-01') + 1) {
    throw new Error(`USD_JPY_MONTH_END の要素数(${values.length})が DATA_END_MONTH(${currentEnd})と合いません`);
  }
  const appendedFx = targetMonths.map((month) => usdJpyByMonth.get(month));

  let updated = source;
  updated = appendRateChanges(updated, 'US_POLICY_RATE_CHANGES', usChanges);
  updated = appendRateChanges(updated, 'JP_POLICY_RATE_CHANGES', jp.changes);
  const fxSlice = sliceArrayLiteral(updated, 'USD_JPY_MONTH_END');
  updated =
    updated.slice(0, fxSlice.open + 1) +
    renderUsdJpyArray([...values, ...appendedFx], yearComments) +
    updated.slice(fxSlice.close);
  updated = updated.replace(
    /DATA_END_MONTH = '\d{4}-\d{2}'/,
    `DATA_END_MONTH = '${usableEnd}'`,
  );

  const summary = [
    `データ最終月: ${currentEnd} → ${usableEnd}`,
    `米ドル/円: ${targetMonths.length}ヶ月分を追記（${targetMonths[0]} 〜 ${usableEnd}）`,
    usChanges.length > 0
      ? `米政策金利: ${usChanges.map((c) => `${c.month} ${c.value.toFixed(2)}%`).join(', ')}`
      : '米政策金利: 変更なし',
    jp.changes.length > 0
      ? `日本の政策金利（推定・要確認）: ${jp.changes.map((c) => `${c.month} ${c.value.toFixed(2)}%`).join(', ')}`
      : '日本の政策金利: 変更なし',
  ];

  if (DRY_RUN) {
    console.log('--dry-run のためファイルは書き換えません');
  } else {
    writeFileSync(DATA_FILE, updated);
  }
  return { updated: true, summary, warnings, needsReview: jp.changes.length > 0 };
}

const result = await main();
for (const line of result.summary) console.log(line);
for (const line of result.warnings) console.warn(`警告: ${line}`);

// GitHub Actions では、実行サマリとプルリクエストの本文にそのまま流用する
// （PR_BODY_FILE はリポジトリ外のパスを渡す。作業ツリーを汚さないため）
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `updated=${result.updated}\n`);
}
if (result.summary.length > 0) {
  const body = [
    ...result.summary.map((line) => `- ${line}`),
    ...result.warnings.map((line) => `- :warning: ${line}`),
    ...(result.needsReview
      ? ['', '> 日本の政策金利は公開APIから直接取れないため推定値です。日銀の公表値と照らして確認してください。']
      : []),
  ].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${body}\n`);
  if (process.env.PR_BODY_FILE) writeFileSync(process.env.PR_BODY_FILE, `${body}\n`);
}
