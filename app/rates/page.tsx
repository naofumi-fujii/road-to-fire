'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from 'next-themes';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Flex,
  SimpleGrid,
  Card,
  VStack,
  HStack,
  Link as ChakraLink,
  useBreakpointValue,
} from '@chakra-ui/react';
import { ThemeToggle } from '../components/ThemeToggle';
import { RATE_SERIES, LATEST_POINT, DATA_END_MONTH, type RatePoint } from '../data/rates';

// 系列の色（app/rates/page.tsx）
// ライト／ダークどちらでも判別できるよう、彩度が高めで明度差のある3色を選んでいる
const COLORS = {
  us: '#E53E3E',
  jp: '#3182CE',
  spread: '#805AD5',
  fx: '#38A169',
} as const;

// 表示期間の選択肢（app/rates/page.tsx）
// months が null のときは全期間を表示する
const PERIODS = [
  { key: '3y', label: '3年', months: 36 },
  { key: '5y', label: '5年', months: 60 },
  { key: '10y', label: '10年', months: 120 },
  { key: 'all', label: '全期間', months: null },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];

// グラフの並べ方（app/rates/page.tsx）
// separate: 金利と為替を上下2段に分けて表示する（縦軸が1つずつなので値を読み違えにくい）
// combined: 1つのグラフに左右2軸で重ねる（金利差と為替の連動が一目で分かる）
type ChartMode = 'separate' | 'combined';

/**
 * X軸ラベルの間隔（月数）を決める（app/rates/page.tsx）
 * 目盛りが多すぎるとラベルが重なって読めなくなるため、
 * 「表示点数 ÷ 間隔」が maxTicks 以下になる最小の間隔を候補から選ぶ。
 */
function pickTickStride(pointCount: number, maxTicks: number): number {
  const candidates = [1, 2, 3, 6, 12, 24, 36, 48, 60, 84, 120, 180];
  return candidates.find((stride) => pointCount / stride <= maxTicks) ?? 180;
}

/** 'YYYY-MM' を軸ラベル用の短い文字列にする（app/rates/page.tsx） */
function formatAxisMonth(month: string, stride: number): string {
  const [year, mon] = month.split('-');
  // 1年以上の間隔なら年だけで十分。それより細かいときは「年下2桁/月」にして幅を抑える
  return stride >= 12 ? `${year}年` : `${year.slice(2)}/${Number(mon)}`;
}

export default function RatesPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

  const [period, setPeriod] = useState<PeriodKey>('10y');
  const [chartMode, setChartMode] = useState<ChartMode>('separate');

  // 選択期間に応じてデータを後ろから切り出す（app/rates/page.tsx）
  const chartData: RatePoint[] = useMemo(() => {
    const months = PERIODS.find((p) => p.key === period)?.months ?? null;
    if (months === null) return RATE_SERIES;
    return RATE_SERIES.slice(Math.max(0, RATE_SERIES.length - months));
  }, [period]);

  // X軸の目盛り位置（app/rates/page.tsx）
  // 最新月を必ず含めたいので、末尾から stride ヶ月ずつさかのぼって作る
  const xTicks = useMemo(() => {
    const stride = pickTickStride(chartData.length, isMobile ? 5 : 10);
    const ticks: string[] = [];
    for (let i = chartData.length - 1; i >= 0; i -= stride) {
      ticks.unshift(chartData[i].month);
    }
    return { ticks, stride };
  }, [chartData, isMobile]);

  // 縦軸の範囲（app/rates/page.tsx）
  // recharts の自動スケールは余白を大きく取りがちで、金利0〜6%のデータに対して
  // -3〜9% のような軸になりプロット領域が半分ほど無駄になる。
  // データの実際の最小・最大からキリの良い値に丸めた範囲を自分で渡す。
  const domains = useMemo(() => {
    let rateMin = Infinity;
    let rateMax = -Infinity;
    let fxMin = Infinity;
    let fxMax = -Infinity;
    for (const p of chartData) {
      rateMin = Math.min(rateMin, p.jpRate, p.usRate, p.spread, 0);
      rateMax = Math.max(rateMax, p.jpRate, p.usRate, p.spread);
      fxMin = Math.min(fxMin, p.usdJpy);
      fxMax = Math.max(fxMax, p.usdJpy);
    }
    return {
      // 金利は1%刻み、為替は10円刻みで外側に丸める
      rate: [Math.floor(rateMin - 0.5), Math.ceil(rateMax + 0.5)] as [number, number],
      fx: [Math.floor((fxMin - 3) / 10) * 10, Math.ceil((fxMax + 3) / 10) * 10] as [number, number],
    };
  }, [chartData]);

  // 期間の始点と比較した変化量（app/rates/page.tsx 統計カード）
  const change = useMemo(() => {
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    return {
      us: last.usRate - first.usRate,
      jp: last.jpRate - first.jpRate,
      spread: Math.round((last.spread - first.spread) * 100) / 100,
      fx: last.usdJpy - first.usdJpy,
      fromLabel: first.label,
    };
  }, [chartData]);

  // recharts のツールチップ共通スタイル（app/page.tsx と同じ配色に揃える）
  const tooltipStyles = {
    contentStyle: {
      backgroundColor: isDark ? '#1A202C' : '#FFFFFF',
      borderColor: isDark ? '#4A5568' : '#E2E8F0',
      color: isDark ? '#E2E8F0' : '#1A202C',
      borderRadius: '8px',
      fontSize: isMobile ? '11px' : '13px',
    },
    labelStyle: { color: isDark ? '#A0AEC0' : '#4A5568' },
    itemStyle: { color: isDark ? '#E2E8F0' : '#1A202C' },
  };

  const gridStroke = isDark ? '#2D3748' : '#E2E8F0';
  const axisStroke = isDark ? '#A0AEC0' : '#4A5568';

  // 金利(%)と為替(円)で単位が違うため、dataKey を見て単位を切り替える（app/rates/page.tsx）
  const tooltipFormatter = (value: unknown, name: unknown, item: { dataKey?: unknown }) => {
    const num = Number(value ?? 0);
    const unit = item?.dataKey === 'usdJpy' ? '円' : '%';
    return [`${num.toFixed(2)}${unit}`, String(name)] as [string, string];
  };

  // ツールチップ内の並び順（app/rates/page.tsx）
  // 凡例と同じ「米国 → 日本 → 補助系列」の順に揃える
  const tooltipItemSorter = (item: { dataKey?: unknown }) => {
    const order = ['usRate', 'jpRate', 'spread', 'usdJpy'];
    const index = order.indexOf(String(item?.dataKey));
    return index === -1 ? order.length : index;
  };

  const tooltipLabelFormatter = (month: unknown) => {
    const point = chartData.find((p) => p.month === month);
    return point?.label ?? String(month);
  };

  // 各グラフで共通の軸設定（app/rates/page.tsx）
  const commonXAxis = (
    <XAxis
      dataKey="month"
      ticks={xTicks.ticks}
      tickFormatter={(month: string) => formatAxisMonth(month, xTicks.stride)}
      stroke={axisStroke}
      tick={{ fontSize: isMobile ? 10 : 12 }}
      minTickGap={0}
    />
  );

  // 凡例の項目（app/rates/page.tsx）
  // 「米国 → 日本 → 補助系列」の順で読めるよう、表示する項目を自分で並べる。
  // スマホでは横幅が足りず2段に折り返して次のグラフに重なるため、ラベルを短くする
  // （省略した内容はグラフのキャプションに書いてある）
  const rateLegendItems: LegendItem[] = [
    { id: 'usRate', label: isMobile ? '米国' : '米国 政策金利', color: COLORS.us, shape: 'line' },
    { id: 'jpRate', label: isMobile ? '日本' : '日本 政策金利', color: COLORS.jp, shape: 'line' },
    { id: 'spread', label: isMobile ? '金利差' : '日米金利差（米国 − 日本）', color: COLORS.spread, shape: 'area' },
  ];

  const fxLegendItems: LegendItem[] = [
    { id: 'usdJpy', label: '米ドル/円', color: COLORS.fx, shape: 'area' },
  ];

  const combinedLegendItems: LegendItem[] = [
    { id: 'usRate', label: isMobile ? '米国（左）' : '米国 政策金利（左軸）', color: COLORS.us, shape: 'line' },
    { id: 'jpRate', label: isMobile ? '日本（左）' : '日本 政策金利（左軸）', color: COLORS.jp, shape: 'line' },
    { id: 'usdJpy', label: isMobile ? '米ドル/円（右）' : '米ドル/円（右軸）', color: COLORS.fx, shape: 'line' },
  ];

  // 折り返しても次の要素に重ならないよう、スマホでは2段分の高さを確保しておく
  const legendHeight = isMobile ? 44 : 28;

  const chartMargin = isMobile
    ? { top: 8, right: 8, left: 0, bottom: 0 }
    : { top: 8, right: 8, left: 8, bottom: 0 };

  return (
    <Box
      minH="100vh"
      p={{ base: 3, md: 4 }}
      bgGradient="linear(to-br, blue.50, purple.100)"
      _dark={{ bgGradient: 'linear(to-br, gray.900, gray.800)' }}
    >
      <Container maxW="container.xl">
        {/* ヘッダー（app/rates/page.tsx）
            app/page.tsx と同じ構成にして、ページ間で見た目が変わらないようにしている */}
        <Flex justify="space-between" align="center" mb={3}>
          <Flex
            flex={1}
            direction={{ base: 'column', md: 'row' }}
            justify="center"
            align={{ base: 'flex-start', md: 'baseline' }}
            gap={{ base: 0, md: 3 }}
          >
            <Heading as="h1" size={{ base: 'lg', md: 'xl' }} whiteSpace="nowrap">
              日米の金利と為替
            </Heading>
            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500" whiteSpace="nowrap">
              政策金利・米ドル/円の推移
            </Text>
          </Flex>
          <HStack gap={2}>
            <ChakraLink
              asChild
              fontSize="sm"
              color="blue.600"
              _dark={{ color: 'blue.300' }}
              _hover={{ opacity: 0.7 }}
              whiteSpace="nowrap"
            >
              <Link href="/">← シミュレーター</Link>
            </ChakraLink>
            <ThemeToggle />
          </HStack>
        </Flex>

        <Card.Root>
          <Card.Body p={{ base: 4, md: 5 }}>
            {/* 操作パネル（app/rates/page.tsx）
                期間と並べ方の2つだけに絞り、スマホでは折り返して2段に収める */}
            <Flex
              direction={{ base: 'column', sm: 'row' }}
              justify="space-between"
              align={{ base: 'stretch', sm: 'center' }}
              gap={3}
              mb={4}
            >
              <VStack align="stretch" gap={1}>
                <Text fontSize="xs" fontWeight="medium" color="gray.500">
                  表示期間
                </Text>
                <HStack gap={1}>
                  {PERIODS.map((p) => {
                    const isActive = period === p.key;
                    return (
                      <Button
                        key={p.key}
                        onClick={() => setPeriod(p.key)}
                        size="xs"
                        colorScheme="blue"
                        variant={isActive ? 'solid' : 'outline'}
                        _dark={
                          isActive
                            ? { bg: 'blue.600', color: 'white', _hover: { bg: 'blue.500' } }
                            : { borderColor: 'gray.600', color: 'gray.300', _hover: { bg: 'gray.700' } }
                        }
                      >
                        {p.label}
                      </Button>
                    );
                  })}
                </HStack>
              </VStack>

              <VStack align="stretch" gap={1}>
                <Text fontSize="xs" fontWeight="medium" color="gray.500">
                  グラフの並べ方
                </Text>
                <HStack gap={1}>
                  {([
                    { key: 'separate', label: '上下に分ける' },
                    { key: 'combined', label: '重ねて表示' },
                  ] as const).map((m) => {
                    const isActive = chartMode === m.key;
                    return (
                      <Button
                        key={m.key}
                        onClick={() => setChartMode(m.key)}
                        size="xs"
                        colorScheme="purple"
                        variant={isActive ? 'solid' : 'outline'}
                        _dark={
                          isActive
                            ? { bg: 'purple.600', color: 'white', _hover: { bg: 'purple.500' } }
                            : { borderColor: 'gray.600', color: 'gray.300', _hover: { bg: 'gray.700' } }
                        }
                      >
                        {m.label}
                      </Button>
                    );
                  })}
                </HStack>
              </VStack>
            </Flex>

            {/* 現在値カード（app/rates/page.tsx）
                グラフを読む前に「今どこにいるか」が分かるよう、最新月の値と期間中の変化量を並べる */}
            <SimpleGrid columns={{ base: 2, lg: 4 }} gap={3} mb={5}>
              <StatCard
                label="米国 政策金利"
                value={`${LATEST_POINT.usRate.toFixed(2)}%`}
                delta={change.us}
                deltaUnit="%"
                bg="red.50"
                darkBg="red.900"
                color="red.600"
                darkColor="red.300"
                note={`${change.fromLabel}比`}
              />
              <StatCard
                label="日本 政策金利"
                value={`${LATEST_POINT.jpRate.toFixed(2)}%`}
                delta={change.jp}
                deltaUnit="%"
                bg="blue.50"
                darkBg="blue.900"
                color="blue.600"
                darkColor="blue.300"
                note={`${change.fromLabel}比`}
              />
              <StatCard
                label="日米金利差（米 − 日）"
                value={`${LATEST_POINT.spread.toFixed(2)}%`}
                delta={change.spread}
                deltaUnit="%"
                bg="purple.50"
                darkBg="purple.900"
                color="purple.600"
                darkColor="purple.300"
                note={`${change.fromLabel}比`}
              />
              <StatCard
                label="米ドル/円"
                value={`${LATEST_POINT.usdJpy.toFixed(2)}円`}
                delta={change.fx}
                deltaUnit="円"
                bg="green.50"
                darkBg="green.900"
                color="green.600"
                darkColor="green.300"
                note={`${change.fromLabel}比`}
              />
            </SimpleGrid>

            {chartMode === 'separate' ? (
              // 上下2段（app/rates/page.tsx）
              // syncId を揃えることで、片方のグラフにカーソルを合わせると
              // もう片方の同じ月にも縦線とツールチップが出る（同時点の比較がしやすい）
              <VStack align="stretch" gap={5}>
                <ChartFrame
                  title="政策金利（%）"
                  caption="米国はFF金利誘導目標（2008年12月以降は上限）、日本は無担保コール翌日物。薄い面は日米金利差"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={chartMargin} syncId="jp-us-rates">
                      <defs>
                        <linearGradient id="spreadFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.spread} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={COLORS.spread} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      {commonXAxis}
                      <YAxis
                        width={isMobile ? 34 : 48}
                        stroke={axisStroke}
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        domain={domains.rate}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <Tooltip
                        formatter={tooltipFormatter}
                        labelFormatter={tooltipLabelFormatter}
                        itemSorter={tooltipItemSorter}
                        {...tooltipStyles}
                      />
                      <Legend height={legendHeight} content={() => <ChartLegend items={rateLegendItems} height={legendHeight} />} />
                      {/* マイナス金利（日本）を読み取れるようゼロ線を明示する */}
                      <ReferenceLine y={0} stroke={axisStroke} strokeOpacity={0.5} />
                      <Area
                        type="stepAfter"
                        dataKey="spread"
                        name="日米金利差"
                        stroke="none"
                        fill="url(#spreadFill)"
                        isAnimationActive={false}
                      />
                      {/* 政策金利は決定会合のたびに階段状に動くため stepAfter で描く
                          （直線で結ぶと、実際にはなかった連続的な変化に見えてしまう） */}
                      <Line
                        type="stepAfter"
                        dataKey="usRate"
                        name="米国"
                        stroke={COLORS.us}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="stepAfter"
                        dataKey="jpRate"
                        name="日本"
                        stroke={COLORS.jp}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartFrame>

                <ChartFrame title="為替レート 米ドル/円（円）" caption="各月末の値。上に行くほど円安ドル高">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={chartMargin} syncId="jp-us-rates">
                      <defs>
                        <linearGradient id="fxFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.fx} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={COLORS.fx} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      {commonXAxis}
                      <YAxis
                        width={isMobile ? 34 : 48}
                        stroke={axisStroke}
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        domain={domains.fx}
                        tickFormatter={(v: number) => `${Math.round(v)}`}
                      />
                      <Tooltip
                        formatter={tooltipFormatter}
                        labelFormatter={tooltipLabelFormatter}
                        itemSorter={tooltipItemSorter}
                        {...tooltipStyles}
                      />
                      <Legend height={legendHeight} content={() => <ChartLegend items={fxLegendItems} height={legendHeight} />} />
                      <Area
                        type="monotone"
                        dataKey="usdJpy"
                        name="米ドル/円"
                        stroke={COLORS.fx}
                        strokeWidth={2}
                        fill="url(#fxFill)"
                        dot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartFrame>
              </VStack>
            ) : (
              // 重ねて表示（app/rates/page.tsx）
              // 金利(%)と為替(円)はスケールが違うため、左右2軸に振り分けている
              <ChartFrame
                title="政策金利と米ドル/円"
                caption="左軸＝政策金利（%）／右軸＝米ドル/円（円）"
                tall
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    {commonXAxis}
                    <YAxis
                      yAxisId="rate"
                      width={isMobile ? 34 : 48}
                      stroke={COLORS.us}
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      domain={domains.rate}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <YAxis
                      yAxisId="fx"
                      orientation="right"
                      width={isMobile ? 38 : 52}
                      stroke={COLORS.fx}
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      domain={domains.fx}
                      tickFormatter={(v: number) => `${Math.round(v)}`}
                    />
                    <Tooltip
                      formatter={tooltipFormatter}
                      labelFormatter={tooltipLabelFormatter}
                      itemSorter={tooltipItemSorter}
                      {...tooltipStyles}
                    />
                    <Legend height={legendHeight} content={() => <ChartLegend items={combinedLegendItems} height={legendHeight} />} />
                    <ReferenceLine yAxisId="rate" y={0} stroke={axisStroke} strokeOpacity={0.5} />
                    <Line
                      yAxisId="fx"
                      type="monotone"
                      dataKey="usdJpy"
                      name="米ドル/円（右軸）"
                      stroke={COLORS.fx}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="rate"
                      type="stepAfter"
                      dataKey="usRate"
                      name="米国 政策金利（左軸）"
                      stroke={COLORS.us}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="rate"
                      type="stepAfter"
                      dataKey="jpRate"
                      name="日本 政策金利（左軸）"
                      stroke={COLORS.jp}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}

            {/* 出典と注意書き（app/rates/page.tsx）
                データは静的に持っているため、いつ時点のものかを必ず明示する */}
            <Box mt={5} pt={4} borderTopWidth="1px" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }}>
              <Text fontSize="xs" color="gray.500" mb={1}>
                データ最終更新: {DATA_END_MONTH.replace('-', '年')}月末時点
              </Text>
              <Text fontSize="xs" color="gray.500">
                出典: 米連邦準備制度理事会（FRB）／日本銀行の公表値をもとにした参考値です。
                政策金利は米国がFF金利の誘導目標（2008年12月以降はレンジの上限）、
                日本が無担保コールレート（オーバーナイト物）の誘導目標です。
                為替は各月末値のため、月中の高値・安値は反映していません。
                正確な数値は各公式サイトをご確認ください。
              </Text>
            </Box>
          </Card.Body>
        </Card.Root>
      </Container>
    </Box>
  );
}

/** 凡例1項目分の定義（app/rates/page.tsx） */
type LegendItem = {
  id: string;
  label: string;
  color: string;
  /** line は折れ線、area は塗りつぶしの面。凡例の見本の形を変える */
  shape: 'line' | 'area';
};

/**
 * 凡例（app/rates/page.tsx）
 * recharts 3 の Legend は payload を受け付けず、既定の並び順も子要素の記述順とは
 * 限らないため、表示したい項目だけを指定した順に自分で描画する。
 * height は recharts に渡した値と同じにして、確保された領域からはみ出さないようにする。
 */
function ChartLegend({ items, height }: { items: LegendItem[]; height: number }) {
  return (
    <HStack justify="center" gap={{ base: 3, md: 4 }} flexWrap="wrap" h={`${height}px`} align="center">
      {items.map((item) => (
        <HStack key={item.id} gap={1.5}>
          <Box
            w="14px"
            h={item.shape === 'area' ? '10px' : '3px'}
            bg={item.color}
            opacity={item.shape === 'area' ? 0.45 : 1}
            borderRadius="sm"
            flexShrink={0}
          />
          <Text fontSize={{ base: '11px', md: '12px' }} color="gray.600" _dark={{ color: 'gray.300' }}>
            {item.label}
          </Text>
        </HStack>
      ))}
    </HStack>
  );
}

/**
 * グラフの外枠（app/rates/page.tsx）
 * タイトル・説明とグラフの高さ指定をまとめ、2段表示と重ね表示で見た目を揃える。
 */
function ChartFrame({
  title,
  caption,
  tall = false,
  children,
}: {
  title: string;
  caption: string;
  tall?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Text fontSize="sm" fontWeight="bold" mb={0.5}>
        {title}
      </Text>
      <Text fontSize="xs" color="gray.500" mb={2}>
        {caption}
      </Text>
      <Box h={tall ? { base: '340px', md: '480px' } : { base: '220px', md: '300px' }}>
        {children}
      </Box>
    </Box>
  );
}

/**
 * 現在値カード（app/rates/page.tsx）
 * 最新月の値と、選択中の期間の始点からの変化量を表示する。
 */
function StatCard({
  label,
  value,
  delta,
  deltaUnit,
  note,
  bg,
  darkBg,
  color,
  darkColor,
}: {
  label: string;
  value: string;
  delta: number;
  deltaUnit: string;
  note: string;
  bg: string;
  darkBg: string;
  color: string;
  darkColor: string;
}) {
  // 変化量は符号を付けて表示する（0 のときは「±0」）
  const sign = delta > 0 ? '+' : delta < 0 ? '' : '±';
  const deltaText = `${sign}${delta.toFixed(2)}${deltaUnit}`;

  return (
    <Box bg={bg} _dark={{ bg: darkBg }} p={3} borderRadius="lg">
      <Text fontSize="xs" mb={1}>
        {label}
      </Text>
      <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color={color} _dark={{ color: darkColor }}>
        {value}
      </Text>
      <Text fontSize="xs" color="gray.500">
        {note} {deltaText}
      </Text>
    </Box>
  );
}
