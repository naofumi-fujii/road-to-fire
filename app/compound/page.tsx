'use client';

import { useMemo, useState } from 'react';
import NextLink from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from 'next-themes';
import {
  Box,
  Container,
  Heading,
  Text,
  Input,
  Button,
  Flex,
  SimpleGrid,
  Card,
  VStack,
  HStack,
  Link,
  useBreakpointValue,
} from '@chakra-ui/react';
import { ThemeToggle } from '../components/ThemeToggle';

// 系列の色（app/compound/page.tsx）
// 元本と運用益の積み上げなので、app/page.tsx のグラフと同じ2色を使って
// ページ間で「青系＝元本」「緑系＝増えた分」の印象を揃える
const COLORS = {
  principal: '#8884d8',
  profit: '#38A169',
} as const;

// 入力の初期値（app/compound/page.tsx）
// 「初期化」ボタンで戻す値でもある
const DEFAULTS = {
  initialAmount: 0, // 初期投資額（円）
  annualAmount: 3600000, // 年間投資額（円・月30万円相当）
  annualRate: 5, // 年あたりの利率（%）
  years: 20, // 運用年数
} as const;

// 積み立てのタイミング（app/compound/page.tsx）
// begin: 年初にまとめて投資する（その年から利息が付く＝期首積立）
// end:   年末にまとめて投資する（その年は利息が付かない＝期末積立）
type Timing = 'begin' | 'end';

/** グラフ・表で使う1年分の計算結果（app/compound/page.tsx） */
type YearPoint = {
  /** 経過年数（0 = 運用開始時点） */
  year: number;
  /** その年末までに投じた元本の累計（円） */
  principal: number;
  /** その年末時点の運用益（円） */
  profit: number;
  /** その年末時点の資産評価額（円） */
  total: number;
  /** その年の1年間で付いた利息（円・積立分は含まない） */
  interest: number;
};

/**
 * 複利で資産が増えていく様子を1年ごとに計算する（app/compound/page.tsx）
 * 年初に initialAmount があり、毎年 annualAmount を timing のタイミングで追加しながら
 * 年あたり annualRate（%）で運用した場合の、0年目〜years年目の推移を返す。
 */
function simulate(
  initialAmount: number,
  annualAmount: number,
  annualRate: number,
  years: number,
  timing: Timing,
): YearPoint[] {
  const rate = annualRate / 100;
  const points: YearPoint[] = [
    { year: 0, principal: initialAmount, profit: 0, total: initialAmount, interest: 0 },
  ];

  let total = initialAmount;
  for (let year = 1; year <= years; year++) {
    // 期首積立は積立額にもその年の利息が付き、期末積立は付かない
    const base = timing === 'begin' ? total + annualAmount : total;
    const interest = base * rate;
    total = total + annualAmount + interest;
    const principal = initialAmount + annualAmount * year;
    points.push({ year, principal, profit: total - principal, total, interest });
  }
  return points;
}

/** 円を「◯億◯万円」の読みやすい表記にする（app/compound/page.tsx の大きな数値表示用） */
function formatJpy(amount: number): string {
  const rounded = Math.round(amount);
  const oku = Math.floor(rounded / 100000000);
  const man = Math.floor((rounded - oku * 100000000) / 10000);
  if (oku > 0) return man > 0 ? `${oku}億${man.toLocaleString()}万円` : `${oku}億円`;
  if (man > 0) return `${man.toLocaleString()}万円`;
  return `${rounded.toLocaleString()}円`;
}

export default function CompoundPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

  const [initialAmount, setInitialAmount] = useState<number>(DEFAULTS.initialAmount);
  const [annualAmount, setAnnualAmount] = useState<number>(DEFAULTS.annualAmount);
  const [annualRate, setAnnualRate] = useState<number>(DEFAULTS.annualRate);
  const [years, setYears] = useState<number>(DEFAULTS.years);
  const [timing, setTiming] = useState<Timing>('begin');

  const points = useMemo(
    () => simulate(initialAmount, annualAmount, annualRate, years, timing),
    [initialAmount, annualAmount, annualRate, years, timing],
  );

  const last = points[points.length - 1];

  const handleReset = () => {
    setInitialAmount(DEFAULTS.initialAmount);
    setAnnualAmount(DEFAULTS.annualAmount);
    setAnnualRate(DEFAULTS.annualRate);
    setYears(DEFAULTS.years);
    setTiming('begin');
  };

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

  return (
    <Box
      minH="100vh"
      p={{ base: 3, md: 4 }}
      bgGradient="linear(to-br, blue.50, purple.100)"
      _dark={{ bgGradient: 'linear(to-br, gray.900, gray.800)' }}
    >
      <Container maxW="container.xl">
        {/* ヘッダー（app/compound/page.tsx）
            app/page.tsx・app/rates/page.tsx と同じ構成にして、ページ間で見た目を揃えている */}
        <Flex justify="space-between" align="center" mb={3}>
          <Flex
            flex={1}
            direction={{ base: 'column', md: 'row' }}
            justify="center"
            align={{ base: 'flex-start', md: 'baseline' }}
            gap={{ base: 0, md: 3 }}
          >
            <Heading as="h1" size={{ base: 'lg', md: 'xl' }} whiteSpace="nowrap">
              複利計算機
            </Heading>
            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500" whiteSpace="nowrap">
              年間投資額 × 年あたりの利率
            </Text>
          </Flex>
          <HStack gap={2}>
            <Link
              asChild
              fontSize="sm"
              color="blue.600"
              _dark={{ color: 'blue.300' }}
              _hover={{ opacity: 0.7 }}
              whiteSpace="nowrap"
            >
              <NextLink href="/">← シミュレーター</NextLink>
            </Link>
            <ThemeToggle />
          </HStack>
        </Flex>

        <Card.Root>
          <Card.Body p={{ base: 4, md: 5 }}>
            {/* スマホでは column-reverse で結果を入力より先に表示する（app/page.tsx と同じ方針） */}
            <Flex direction={{ base: 'column-reverse', lg: 'row' }} gap={6} align="stretch">
              {/* 左カラム: 入力パネル */}
              <Box w={{ base: '100%', lg: '460px' }} flexShrink={0}>
                <Flex justify="space-between" align="center" mb={3}>
                  <Heading as="h2" size="md">入力</Heading>
                  <Button
                    onClick={handleReset}
                    size="xs"
                    variant="outline"
                    colorScheme="gray"
                    _dark={{ borderColor: 'gray.600', color: 'gray.300', _hover: { bg: 'gray.700' } }}
                  >
                    初期化
                  </Button>
                </Flex>

                {/* ファーストビューに収めるため、入力欄は2列グリッドで高さを圧縮する */}
                <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                  <NumberField
                    label="年間投資額（円）"
                    value={annualAmount}
                    onChange={setAnnualAmount}
                    steps={[-1000000, -100000, 100000, 1000000]}
                    stepLabels={['-100万', '-10万', '+10万', '+100万']}
                    hint={`毎月 ${Math.round(annualAmount / 12).toLocaleString()}円`}
                  />

                  <NumberField
                    label="年あたりの利率（%）"
                    value={annualRate}
                    onChange={setAnnualRate}
                    decimals={2}
                    steps={[-1, -0.1, 0.1, 1]}
                    stepLabels={['-1%', '-0.1%', '+0.1%', '+1%']}
                    max={100}
                    hint="税・手数料は考慮していません"
                  />

                  <NumberField
                    label="初期投資額（円）"
                    value={initialAmount}
                    onChange={setInitialAmount}
                    steps={[-10000000, -1000000, 1000000, 10000000]}
                    stepLabels={['-1000万', '-100万', '+100万', '+1000万']}
                    hint="運用開始時点の資産"
                  />

                  <NumberField
                    label="運用年数（年）"
                    value={years}
                    onChange={(v) => setYears(Math.min(80, Math.max(1, Math.round(v))))}
                    steps={[-10, -1, 1, 10]}
                    stepLabels={['-10年', '-1年', '+1年', '+10年']}
                    min={1}
                    max={80}
                    hint={`${years}年後まで計算`}
                  />

                  <VStack align="stretch" gap={1}>
                    <Text fontSize="sm" fontWeight="medium">積み立てのタイミング</Text>
                    <HStack gap={1}>
                      {([
                        { key: 'begin', label: '年初' },
                        { key: 'end', label: '年末' },
                      ] as const).map((t) => {
                        const isActive = timing === t.key;
                        return (
                          <Button
                            key={t.key}
                            onClick={() => setTiming(t.key)}
                            size="xs"
                            flex={1}
                            colorScheme="purple"
                            variant={isActive ? 'solid' : 'outline'}
                            _dark={
                              isActive
                                ? { bg: 'purple.600', color: 'white', _hover: { bg: 'purple.500' } }
                                : { borderColor: 'gray.600', color: 'gray.300', _hover: { bg: 'gray.700' } }
                            }
                          >
                            {t.label}
                          </Button>
                        );
                      })}
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                      {timing === 'begin' ? 'その年の分にも利息が付く' : 'その年の分には利息が付かない'}
                    </Text>
                  </VStack>
                </SimpleGrid>

                {/* 年ごとの推移（app/compound/page.tsx）
                    グラフだけでは正確な値が読めないため、節目の年だけ数値でも並べる */}
                <Box mt={4}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    節目の年
                  </Text>
                  <SimpleGrid columns={2} gap={1}>
                    {milestoneYears(years).map((y) => {
                      const p = points[y];
                      return (
                        <HStack
                          key={y}
                          justify="space-between"
                          bg="gray.50"
                          _dark={{ bg: 'gray.700' }}
                          px={2}
                          py={1}
                          borderRadius="md"
                        >
                          <Text fontSize="xs" color="gray.500">{y}年後</Text>
                          <Text fontSize="xs" fontWeight="bold">{formatJpy(p.total)}</Text>
                        </HStack>
                      );
                    })}
                  </SimpleGrid>
                </Box>
              </Box>

              {/* 右カラム: 計算結果 */}
              <Box flex={1} minW={0}>
                <Heading as="h2" size="md" mb={3}>計算結果</Heading>

                <Box
                  bg="yellow.50"
                  _dark={{ bg: 'yellow.900' }}
                  p={{ base: 3, md: 4 }}
                  borderRadius="lg"
                  mb={4}
                  textAlign="center"
                >
                  <HStack justify="center" align="baseline" gap={2} flexWrap="wrap">
                    <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.300' }}>
                      {years}年後の資産
                    </Text>
                    <Text
                      fontSize={{ base: '3xl', md: '4xl' }}
                      fontWeight="bold"
                      color="orange.600"
                      _dark={{ color: 'orange.300' }}
                      lineHeight="1"
                    >
                      {formatJpy(last.total)}
                    </Text>
                    <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.300' }} ml={2}>
                      元本の{' '}
                      <Text as="span" fontWeight="bold" color="orange.700" _dark={{ color: 'orange.200' }}>
                        {last.principal > 0 ? (last.total / last.principal).toFixed(2) : '—'}倍
                      </Text>
                    </Text>
                  </HStack>
                </Box>

                {/* 元本と運用益の積み上げグラフ（app/compound/page.tsx）
                    複利は後半になるほど運用益の層が厚くなるので、積み上げ面で見せる */}
                <Box h={{ base: '280px', md: '360px' }} mb={2} fontSize={{ base: '11px', md: 'md' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={points}
                      margin={isMobile ? { top: 8, right: 8, left: 0, bottom: 0 } : { top: 8, right: 16, left: 8, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="principalFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.principal} stopOpacity={0.55} />
                          <stop offset="100%" stopColor={COLORS.principal} stopOpacity={0.15} />
                        </linearGradient>
                        <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.profit} stopOpacity={0.55} />
                          <stop offset="100%" stopColor={COLORS.profit} stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2D3748' : '#E2E8F0'} />
                      <XAxis
                        dataKey="year"
                        stroke={isDark ? '#A0AEC0' : '#4A5568'}
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        tickFormatter={(y: number) => `${y}年`}
                        interval="preserveStartEnd"
                        minTickGap={isMobile ? 20 : 12}
                      />
                      <YAxis
                        width={isMobile ? 48 : 60}
                        stroke={isDark ? '#A0AEC0' : '#4A5568'}
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        // 目盛りは「◯億／◯万」で表示する（app/compound/page.tsx）
                        // スマホは軸の幅が狭くラベルが切れるため、3桁区切りのカンマを省く
                        tickFormatter={(v: number) =>
                          v >= 100000000
                            ? `${(v / 100000000).toFixed(1)}億`
                            : `${isMobile ? Math.round(v / 10000) : Math.round(v / 10000).toLocaleString()}万`
                        }
                      />
                      <Tooltip
                        formatter={(value: unknown, name: unknown) => [`${Math.round(Number(value ?? 0)).toLocaleString()}円`, String(name)] as [string, string]}
                        labelFormatter={(y: unknown) => `${y}年後`}
                        {...tooltipStyles}
                      />
                      <Area
                        type="monotone"
                        dataKey="principal"
                        stackId="asset"
                        stroke={COLORS.principal}
                        strokeWidth={2}
                        fill="url(#principalFill)"
                        name="元本"
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stackId="asset"
                        stroke={COLORS.profit}
                        strokeWidth={2}
                        fill="url(#profitFill)"
                        name="運用益"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>

                {/* 凡例（app/compound/page.tsx）
                    面グラフの色と対応させる。recharts の Legend は高さの制御がしにくいため自前で描く */}
                <HStack justify="center" gap={4} mb={4}>
                  {[
                    { label: '元本', color: COLORS.principal },
                    { label: '運用益', color: COLORS.profit },
                  ].map((item) => (
                    <HStack key={item.label} gap={1.5}>
                      <Box w="14px" h="10px" bg={item.color} opacity={0.5} borderRadius="sm" flexShrink={0} />
                      <Text fontSize={{ base: '11px', md: '12px' }} color="gray.600" _dark={{ color: 'gray.300' }}>
                        {item.label}
                      </Text>
                    </HStack>
                  ))}
                </HStack>

                <SimpleGrid columns={{ base: 2, xl: 4 }} gap={3}>
                  <ResultCard
                    label="元本合計"
                    value={formatJpy(last.principal)}
                    note={`初期 ${formatJpy(initialAmount)}＋年${formatJpy(annualAmount)}×${years}年`}
                    bg="blue.50"
                    darkBg="blue.900"
                    color="blue.600"
                    darkColor="blue.300"
                  />
                  <ResultCard
                    label="運用益"
                    value={formatJpy(last.profit)}
                    note={last.total > 0 ? `資産の ${Math.round((last.profit / last.total) * 100)}%` : '—'}
                    bg="green.50"
                    darkBg="green.900"
                    color="green.600"
                    darkColor="green.300"
                  />
                  <ResultCard
                    label="最終年の利息"
                    value={formatJpy(last.interest)}
                    note={`${years}年目の1年間で増えた分（積立を除く）`}
                    bg="purple.50"
                    darkBg="purple.900"
                    color="purple.600"
                    darkColor="purple.300"
                  />
                  <ResultCard
                    label="最終年の利息（月あたり）"
                    value={formatJpy(last.interest / 12)}
                    note="最終年の利息 ÷ 12ヶ月"
                    bg="orange.50"
                    darkBg="orange.900"
                    color="orange.600"
                    darkColor="orange.300"
                  />
                </SimpleGrid>

                <Text fontSize="xs" color="gray.500" mt={3}>
                  年1回の複利で計算しています。税金・手数料・インフレは考慮していません。
                </Text>
              </Box>
            </Flex>
          </Card.Body>
        </Card.Root>
      </Container>
    </Box>
  );
}

/**
 * 「節目の年」に並べる年数を選ぶ（app/compound/page.tsx）
 * 運用年数を4等分した年（重複と0年は除く）を返し、最後は必ず最終年にする。
 */
function milestoneYears(years: number): number[] {
  const candidates = [1, 2, 3, 4].map((i) => Math.round((years * i) / 4));
  return Array.from(new Set(candidates.filter((y) => y > 0)));
}

/**
 * 数値入力欄（app/compound/page.tsx）
 * 入力ボックスと増減ボタンをまとめたもの。円のように桁が大きい値でも読めるよう
 * 表示は3桁区切りにし、入力時はカンマを取り除いてから数値として扱う。
 */
function NumberField({
  label,
  value,
  onChange,
  steps,
  stepLabels,
  hint,
  decimals = 0,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  steps: number[];
  stepLabels: string[];
  hint?: string;
  /** 利率のように小数を扱う欄で、増減後の丸め桁数に使う */
  decimals?: number;
  min?: number;
  max?: number;
}) {
  const clamp = (v: number) => {
    const factor = 10 ** decimals;
    return Math.min(max, Math.max(min, Math.round(v * factor) / factor));
  };

  return (
    <VStack align="stretch" gap={1}>
      <Text fontSize="sm" fontWeight="medium">{label}</Text>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        size="sm"
        value={value.toLocaleString(undefined, { maximumFractionDigits: decimals })}
        onChange={(e) => {
          const raw = e.target.value.replace(/,/g, '');
          if (raw === '') {
            onChange(min);
            return;
          }
          const num = Number(raw);
          if (!isNaN(num)) onChange(clamp(num));
        }}
      />
      <HStack gap={1}>
        {steps.map((step, i) => (
          <Button
            key={step}
            onClick={() => onChange(clamp(value + step))}
            colorScheme="blue"
            size="xs"
            flex={1}
            _dark={{ bg: 'gray.700', color: 'blue.300', _hover: { bg: 'gray.600' } }}
          >
            {stepLabels[i]}
          </Button>
        ))}
      </HStack>
      {hint && (
        <Text fontSize="xs" color="gray.500">
          {hint}
        </Text>
      )}
    </VStack>
  );
}

/**
 * 計算結果のカード（app/compound/page.tsx）
 * 元本・運用益などの内訳を、値と補足の2行で表示する。
 */
function ResultCard({
  label,
  value,
  note,
  bg,
  darkBg,
  color,
  darkColor,
}: {
  label: string;
  value: string;
  note: string;
  bg: string;
  darkBg: string;
  color: string;
  darkColor: string;
}) {
  return (
    <Box bg={bg} _dark={{ bg: darkBg }} p={3} borderRadius="lg">
      <Text fontSize="xs" mb={1}>{label}</Text>
      <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color={color} _dark={{ color: darkColor }}>
        {value}
      </Text>
      <Text fontSize="xs" color="gray.500">{note}</Text>
    </Box>
  );
}
