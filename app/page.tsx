'use client';

import { useState, useMemo } from 'react';
import NextLink from 'next/link';
import { FaRocket, FaBalanceScale, FaShieldAlt, FaGlobe } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTheme } from 'next-themes';
import { ThemeToggle } from './components/ThemeToggle';
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
  Portal,
  // recharts の Tooltip と名前が衝突するため ChakraTooltip として読み込む（app/page.tsx）
  Tooltip as ChakraTooltip,
  useBreakpointValue,
} from '@chakra-ui/react';

// 投資先ごとの配当税率（app/page.tsx）
// 国内: 所得税15.315% + 住民税5% = 20.315%
// 海外（US）: 米国で10%源泉徴収された後、残りに国内20.315%が課税される
//   実効税率 = 1 - 0.9 × (1 - 0.20315) = 0.282835（外国税額控除・NISAは考慮しない）
const MARKETS = {
  domestic: { label: '国内', taxRate: 0.20315, taxRateLabel: '20.315%' },
  us: { label: '海外（US）', taxRate: 0.282835, taxRateLabel: '28.2835%' },
} as const;

type MarketKey = keyof typeof MARKETS;

// 譲渡益（取り崩し）に対する国内課税率（app/page.tsx）
// 所得税15.315% + 住民税5% = 20.315%。米国ETFでも売却益に米国源泉徴収はかからないため
// 投資先（MARKETS）に関係なくこの税率を使う
const CAPITAL_GAINS_TAX_RATE = 0.20315;

// 生活費の受け取り方（app/page.tsx）
// dividend: 配当でまかなう（配当利回り × 資産額）
// withdrawal: 資産を取り崩してまかなう（取り崩し率 × 資産額、いわゆる4%ルール）
type IncomeMode = 'dividend' | 'withdrawal';

// シナリオプリセット（app/page.tsx）
// 価格成長率・配当利回り・受け取り方の組み合わせを想定商品ごとにまとめたもの
// ボタンにはアイコンと設定値を表示し、label と products はホバー時のツールチップに表示する
// products は各シナリオの利回り・成長率の根拠となる代表的な商品（利回りは変動するため目安）
// インデックスは無分配で配当が出ない代わりに価格成長が大きいため、
// 配当ではなく取り崩し（4%ルール）で生活費をまかなう想定にする
const SCENARIOS = {
  aggressive: {
    label: '強気',
    icon: FaRocket,
    growthRate: 1,
    dividendYield: 7,
    incomeMode: 'dividend',
    withdrawalRate: 4,
    products: 'JEPI・JEPQ・QYLD などのカバードコールETF、ARCC などのBDC、東証のカバコETF（2865等）',
  },
  standard: {
    label: '標準',
    icon: FaBalanceScale,
    growthRate: 1,
    dividendYield: 5,
    incomeMode: 'dividend',
    withdrawalRate: 4,
    products: 'SPYD・PFF などの高配当/優先株ETF、1343（東証REIT指数）・1489（日経高配当50）',
  },
  conservative: {
    label: '保守',
    icon: FaShieldAlt,
    growthRate: 2,
    dividendYield: 4,
    incomeMode: 'dividend',
    withdrawalRate: 4,
    products: 'SCHD・HDV・VYM などの増配系ETF、商社・メガバンク・通信などの高配当株',
  },
  index: {
    label: 'インデックス',
    icon: FaGlobe,
    growthRate: 6,
    dividendYield: 0,
    incomeMode: 'withdrawal',
    withdrawalRate: 4,
    products: 'eMAXIS Slim 全世界株式（オルカン）、楽天・オールカントリー、SBI・V・全世界株式、eMAXIS Slim 米国株式（S&P500）',
  },
} as const satisfies Record<string, { label: string; icon: typeof FaRocket; growthRate: number; dividendYield: number; incomeMode: IncomeMode; withdrawalRate: number; products: string }>;

type ScenarioKey = keyof typeof SCENARIOS;

// 現在の年月（計算開始のデフォルト）
const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_MONTH = TODAY.getMonth() + 1; // 1-indexed

// 入力項目のデフォルト値（初期化ボタンで使用）
const DEFAULTS = {
  currentSavings: 14000000, // 現在の貯蓄額（1400万円）
  monthlyAmount: 300000, // 毎月の積立額（30万円）
  growthRate: 1, // 価格成長率（%）強気シナリオ（カバードコールETF・BDC等）と同じ値
  dividendYield: 7, // 配当利回り（%）強気シナリオを想定したデフォルト値
  incomeMode: 'dividend' as IncomeMode, // 生活費の受け取り方（配当 or 取り崩し）
  withdrawalRate: 4, // 取り崩し率（%）取り崩しモードで使用する。いわゆる4%ルール
  targetMonthlyDividend: 100000, // 目標の毎月配当額（10万円）
  startYear: CURRENT_YEAR, // 計算開始年
  startMonth: CURRENT_MONTH, // 計算開始月（1-12）
  market: 'us' as MarketKey, // 投資先（配当税率の切り替えに使用）
};

export default function Home() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // スマホ判定（app/page.tsx）
  // iPhone SE3 などの狭い画面ではグラフの軸ラベルや余白を削って表示領域を確保する
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

  const [currentSavings, setCurrentSavings] = useState(DEFAULTS.currentSavings);
  const [monthlyAmount, setMonthlyAmount] = useState(DEFAULTS.monthlyAmount);
  const [growthRate, setGrowthRate] = useState(DEFAULTS.growthRate);
  const [dividendYield, setDividendYield] = useState(DEFAULTS.dividendYield);
  const [incomeMode, setIncomeMode] = useState<IncomeMode>(DEFAULTS.incomeMode);
  const [withdrawalRate, setWithdrawalRate] = useState(DEFAULTS.withdrawalRate);
  const [targetMonthlyDividend, setTargetMonthlyDividend] = useState(DEFAULTS.targetMonthlyDividend);
  const [startYear, setStartYear] = useState(DEFAULTS.startYear);
  const [startMonth, setStartMonth] = useState(DEFAULTS.startMonth);
  const [market, setMarket] = useState<MarketKey>(DEFAULTS.market);

  // すべての入力値をデフォルトに戻す
  const handleReset = () => {
    setCurrentSavings(DEFAULTS.currentSavings);
    setMonthlyAmount(DEFAULTS.monthlyAmount);
    setGrowthRate(DEFAULTS.growthRate);
    setDividendYield(DEFAULTS.dividendYield);
    setIncomeMode(DEFAULTS.incomeMode);
    setWithdrawalRate(DEFAULTS.withdrawalRate);
    setTargetMonthlyDividend(DEFAULTS.targetMonthlyDividend);
    setStartYear(DEFAULTS.startYear);
    setStartMonth(DEFAULTS.startMonth);
    setMarket(DEFAULTS.market);
  };

  // 受け取り方に応じた表示ラベル・税率・年率（app/page.tsx）
  // 配当モードでは配当利回りと配当税率、取り崩しモードでは取り崩し率と譲渡益課税率を使う
  const incomeLabel = incomeMode === 'withdrawal' ? '取り崩し' : '配当';
  const incomeRate = incomeMode === 'withdrawal' ? withdrawalRate : dividendYield;
  const incomeTaxRate = incomeMode === 'withdrawal' ? CAPITAL_GAINS_TAX_RATE : MARKETS[market].taxRate;

  // 目標の毎月受取額（税引後）から必要な資産額を逆算（app/page.tsx requiredAmount）
  // 目標額は手取り（税引後）とみなし、(1 - 税率) で割り戻して税引前の受取額に換算してから
  // 配当利回り（または取り崩し率）で必要資産額を逆算する。積立シミュレーションの目標額として使用する
  // 取り崩しモードは本来は譲渡益部分にしか課税されないが、保守的に取り崩し額全体へ課税する前提で計算する
  const requiredAmount = useMemo(() => {
    const annualIncomeBeforeTax = (targetMonthlyDividend / (1 - incomeTaxRate)) * 12;
    return incomeRate > 0 ? annualIncomeBeforeTax / (incomeRate / 100) : 0;
  }, [targetMonthlyDividend, incomeRate, incomeTaxRate]);

  // 実効年利の計算（app/page.tsx effectiveAnnualReturn）
  // 価格成長率に、税引後の配当を再投資した分を加えたトータルリターン（%）
  // 実効年利 = 価格成長率 + 配当利回り × (1 − 配当税率)
  const effectiveAnnualReturn = useMemo(() => {
    const taxRate = MARKETS[market].taxRate;
    return growthRate + dividendYield * (1 - taxRate);
  }, [growthRate, dividendYield, market]);

  // 積立シミュレーションの計算（目標額は必要資産額を使用）
  const targetAmount = Math.round(requiredAmount);
  const simulationData = useMemo(() => {
    const data = [];
    let investmentAmount = 0; // 積立額と運用益（実効年利が適用される部分）
    const monthlyReturn = effectiveAnnualReturn / 100 / 12; // 月利
    let month = 0;

    // 計算開始日（startYear年startMonth月）
    const startDate = new Date(startYear, startMonth - 1);

    // 0ヶ月目（現在時点）のデータポイント
    // グラフを積立開始前の現在の状態（貯蓄額のみ）から始めるために追加する
    data.push({
      month: 0,
      monthLabel: `${startDate.getFullYear()}/${String(startDate.getMonth() + 1).padStart(2, '0')}`,
      amount: Math.round(currentSavings),
      contribution: currentSavings,
    });

    // 目標額に達するまで、または最大30年（360ヶ月）まで計算
    while (currentSavings + investmentAmount < targetAmount && month < 360) {
      // 利息は積立部分のみに適用（貯蓄額には適用しない）
      investmentAmount = investmentAmount * (1 + monthlyReturn) + monthlyAmount;
      month++;

      // 年月ラベルを計算
      const futureDate = new Date(startDate.getFullYear(), startDate.getMonth() + month);
      const yearStr = futureDate.getFullYear();
      const monthStr = String(futureDate.getMonth() + 1).padStart(2, '0');

      // 毎月データポイントを追加
      const totalAmount = currentSavings + investmentAmount;
      data.push({
        month: month,
        monthLabel: `${yearStr}/${monthStr}`,
        amount: Math.round(totalAmount),
        contribution: currentSavings + monthlyAmount * month,
      });
    }

    // 目標額到達予定日を計算
    const targetDate = new Date(startDate.getFullYear(), startDate.getMonth() + month);

    return { data, months: month, finalAmount: currentSavings + investmentAmount, targetDate };
  }, [targetAmount, currentSavings, monthlyAmount, effectiveAnnualReturn, startYear, startMonth]);

  // グラフ表示用データ（app/page.tsx chartData）
  // 半年（6ヶ月）ごとへ間引き（最終点＝目標達成月は必ず含める）、
  // 各時点の資産総額から月間の受取額＝配当額または取り崩し額（税引前・税引後）を算出する
  const chartData = useMemo(() => {
    const { data } = simulationData;
    if (data.length === 0) return [];
    const sampled = data.filter((point) => point.month % 6 === 0);
    const lastPoint = data[data.length - 1];
    if (sampled[sampled.length - 1]?.month !== lastPoint.month) {
      sampled.push(lastPoint);
    }
    return sampled.map((point) => {
      const monthlyIncome = point.amount * incomeRate / 100 / 12;
      return {
        ...point,
        monthlyIncome: Math.round(monthlyIncome),
        monthlyIncomeAfterTax: Math.round(monthlyIncome * (1 - incomeTaxRate)),
      };
    });
  }, [simulationData, incomeRate, incomeTaxRate]);

  // 年間積立額の計算
  const estimatedAnnualIncome = useMemo(() => {
    return monthlyAmount * 12;
  }, [monthlyAmount]);

  return (
    <Box minH="100vh" p={{ base: 3, md: 4 }} bgGradient="linear(to-br, blue.50, purple.100)" _dark={{ bgGradient: "linear(to-br, gray.900, gray.800)" }}>
      <Container maxW="container.xl">
        {/* ヘッダー（app/page.tsx）
            スマホではタイトルが折り返さないようサイズを落とし、サブタイトルを下に縦積みする */}
        <Flex justify="space-between" align="center" mb={3}>
          <Flex
            flex={1}
            direction={{ base: 'column', md: 'row' }}
            justify="center"
            align={{ base: 'flex-start', md: 'baseline' }}
            gap={{ base: 0, md: 3 }}
          >
            <Heading as="h1" size={{ base: 'lg', md: 'xl' }} whiteSpace="nowrap">
              Road to FIRE
            </Heading>
            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500" whiteSpace="nowrap">
              積立投資シミュレーター
            </Text>
          </Flex>
          <HStack gap={2}>
            {/* 金利・為替ページへの導線（app/page.tsx ヘッダー）
                スマホでは幅を取らないよう短いラベルにする */}
            <Link
              asChild
              fontSize="sm"
              color="blue.600"
              _dark={{ color: "blue.300" }}
              _hover={{ opacity: 0.7 }}
              whiteSpace="nowrap"
            >
              <NextLink href="/rates">金利・為替</NextLink>
            </Link>
            <Link
              href="https://github.com/naofumi-fujii/road-to-fire"
              target="_blank"
              rel="noopener noreferrer"
              _hover={{ opacity: 0.7 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </Link>
            <ThemeToggle />
          </HStack>
        </Flex>

        <Card.Root>
          <Card.Body p={{ base: 4, md: 5 }}>
            {/* スマホでは column-reverse で結果（FIREまでの道のり）を設定より先に表示する
                （スクロールせずに達成予測が見えるようにするためのスマホ専用レイアウト） */}
            <Flex direction={{ base: 'column-reverse', lg: 'row' }} gap={6} align="stretch">
              {/* 左カラム: 設定パネル */}
              <Box w={{ base: '100%', lg: '560px' }} flexShrink={0}>
                <Flex justify="space-between" align="center" mb={3}>
                  <Heading as="h2" size="md">設定</Heading>
                  <Button
                    onClick={handleReset}
                    size="xs"
                    variant="outline"
                    colorScheme="gray"
                    _dark={{ borderColor: "gray.600", color: "gray.300", _hover: { bg: "gray.700" } }}
                  >
                    初期化
                  </Button>
                </Flex>

                {/* 設定項目を2列グリッドで配置（app/page.tsx 設定パネル）
                    ファーストビューに収めるため、縦1列ではなく2列で高さを圧縮している */}
                <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                  <VStack align="stretch" gap={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      計算開始年月
                    </Text>
                    <HStack gap={2}>
                      <Input
                        type="number"
                        inputMode="numeric"
                        autoComplete="off"
                        size="sm"
                        value={startYear}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (!isNaN(value)) {
                            setStartYear(value);
                          }
                        }}
                        min={1900}
                        max={2100}
                      />
                      <Text fontSize="sm" color="gray.500">年</Text>
                      <Input
                        type="number"
                        inputMode="numeric"
                        autoComplete="off"
                        size="sm"
                        value={startMonth}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (!isNaN(value) && value >= 1 && value <= 12) {
                            setStartMonth(value);
                          }
                        }}
                        min={1}
                        max={12}
                      />
                      <Text fontSize="sm" color="gray.500">月</Text>
                    </HStack>
                  </VStack>

                  <VStack align="stretch" gap={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      現在の貯蓄額（円）
                    </Text>
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      size="sm"
                      value={currentSavings.toLocaleString()}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, '');
                        if (!isNaN(Number(value))) {
                          setCurrentSavings(Number(value));
                        }
                      }}
                    />
                    <HStack gap={1}>
                      <Button
                        onClick={() => setCurrentSavings(prev => Math.max(0, prev - 10000000))}
                        colorScheme="blue"
                        size="xs"
                        flex={1}
                        _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                      >
                        -1000万
                      </Button>
                      <Button
                        onClick={() => setCurrentSavings(prev => Math.max(0, prev - 1000000))}
                        colorScheme="blue"
                        size="xs"
                        flex={1}
                        _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                      >
                        -100万
                      </Button>
                      <Button
                        onClick={() => setCurrentSavings(prev => prev + 1000000)}
                        colorScheme="blue"
                        size="xs"
                        flex={1}
                        _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                      >
                        +100万
                      </Button>
                      <Button
                        onClick={() => setCurrentSavings(prev => prev + 10000000)}
                        colorScheme="blue"
                        size="xs"
                        flex={1}
                        _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                      >
                        +1000万
                      </Button>
                    </HStack>
                  </VStack>

                  <VStack align="stretch" gap={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      毎月の積立額（円）
                    </Text>
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      size="sm"
                      value={monthlyAmount.toLocaleString()}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, '');
                        if (!isNaN(Number(value))) {
                          setMonthlyAmount(Number(value));
                        }
                      }}
                    />
                    <HStack gap={1}>
                      <Button
                        onClick={() => setMonthlyAmount(prev => Math.max(0, prev - 100000))}
                        colorScheme="blue"
                        size="xs"
                        flex={1}
                        _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                      >
                        -10万
                      </Button>
                      <Button
                        onClick={() => setMonthlyAmount(prev => Math.max(0, prev - 10000))}
                        colorScheme="blue"
                        size="xs"
                        flex={1}
                        _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                      >
                        -1万
                      </Button>
                      <Button
                        onClick={() => setMonthlyAmount(prev => prev + 10000)}
                        colorScheme="blue"
                        size="xs"
                        flex={1}
                        _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                      >
                        +1万
                      </Button>
                      <Button
                        onClick={() => setMonthlyAmount(prev => prev + 100000)}
                        colorScheme="blue"
                        size="xs"
                        flex={1}
                        _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                      >
                        +10万
                      </Button>
                    </HStack>
                  </VStack>

                  <VStack align="stretch" gap={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      目標の毎月{incomeLabel}額（円・税引後）
                    </Text>
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      size="sm"
                      value={targetMonthlyDividend.toLocaleString()}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, '');
                        if (!isNaN(Number(value))) {
                          setTargetMonthlyDividend(Math.max(0, Number(value)));
                        }
                      }}
                    />
                    <HStack gap={1}>
                      <Button
                        onClick={() => setTargetMonthlyDividend(prev => Math.max(0, prev - 100000))}
                        colorScheme="blue"
                        size="xs"
                        flex={1}
                        _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                      >
                        -10万
                      </Button>
                      <Button
                        onClick={() => setTargetMonthlyDividend(prev => Math.max(0, prev - 10000))}
                        colorScheme="blue"
                        size="xs"
                        flex={1}
                        _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                      >
                        -1万
                      </Button>
                      <Button
                        onClick={() => setTargetMonthlyDividend(prev => prev + 10000)}
                        colorScheme="blue"
                        size="xs"
                        flex={1}
                        _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                      >
                        +1万
                      </Button>
                      <Button
                        onClick={() => setTargetMonthlyDividend(prev => prev + 100000)}
                        colorScheme="blue"
                        size="xs"
                        flex={1}
                        _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                      >
                        +10万
                      </Button>
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                      税引後でこの{incomeLabel}額を得るのに必要な資産額が目標額になります
                    </Text>
                  </VStack>

                  <VStack align="stretch" gap={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      シナリオ
                    </Text>
                    <HStack gap={1}>
                      {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => {
                        const scenario = SCENARIOS[key];
                        const ScenarioIcon = scenario.icon;
                        const isActive =
                          incomeMode === scenario.incomeMode &&
                          growthRate === scenario.growthRate &&
                          (scenario.incomeMode === 'withdrawal'
                            ? withdrawalRate === scenario.withdrawalRate
                            : dividendYield === scenario.dividendYield);
                        return (
                          // シナリオボタン（app/page.tsx 設定パネル）
                          // ホバー時にシナリオ名と代表的な商品（SCENARIOS.products）をツールチップ表示する
                          <ChakraTooltip.Root key={key} openDelay={200} closeDelay={100} positioning={{ placement: 'top' }}>
                            <ChakraTooltip.Trigger asChild>
                              <Button
                                onClick={() => {
                                  setGrowthRate(scenario.growthRate);
                                  setDividendYield(scenario.dividendYield);
                                  setIncomeMode(scenario.incomeMode);
                                  setWithdrawalRate(scenario.withdrawalRate);
                                }}
                                colorScheme="blue"
                                size="sm"
                                flex={1}
                                h="auto"
                                py={1.5}
                                aria-label={scenario.label}
                                variant={isActive ? 'solid' : 'outline'}
                                _dark={isActive
                                  ? { bg: "blue.600", color: "white", _hover: { bg: "blue.500" } }
                                  : { borderColor: "gray.600", color: "gray.300", _hover: { bg: "gray.700" } }}
                              >
                                <VStack gap={0.5}>
                                  <ScenarioIcon size={14} />
                                  <Text fontSize="xs" lineHeight="1.2">
                                    {scenario.incomeMode === 'withdrawal'
                                      ? `取崩${scenario.withdrawalRate}%`
                                      : `利回り${scenario.dividendYield}%`}
                                  </Text>
                                  <Text fontSize="xs" lineHeight="1.2">成長{scenario.growthRate}%</Text>
                                </VStack>
                              </Button>
                            </ChakraTooltip.Trigger>
                            <Portal>
                              <ChakraTooltip.Positioner>
                                <ChakraTooltip.Content maxW="260px">
                                  <ChakraTooltip.Arrow>
                                    <ChakraTooltip.ArrowTip />
                                  </ChakraTooltip.Arrow>
                                  <Text fontSize="xs" fontWeight="bold" mb={0.5}>{scenario.label}</Text>
                                  <Text fontSize="xs">{scenario.products}</Text>
                                  <Text fontSize="xs" opacity={0.7} mt={1}>※利回りは変動するため目安です</Text>
                                </ChakraTooltip.Content>
                              </ChakraTooltip.Positioner>
                            </Portal>
                          </ChakraTooltip.Root>
                        );
                      })}
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                      選択後も個別に調整できます
                    </Text>
                  </VStack>

                  <SimpleGrid columns={2} gap={3}>
                    <VStack align="stretch" gap={1}>
                      <Text fontSize="sm" fontWeight="medium">
                        価格成長率（%）
                      </Text>
                      <Input
                        type="number"
                        inputMode="decimal"
                        autoComplete="off"
                        size="sm"
                        value={growthRate}
                        onChange={(e) => setGrowthRate(Number(e.target.value))}
                        step={0.5}
                        min={0}
                        max={20}
                      />
                      <HStack gap={1}>
                        <Button
                          onClick={() => setGrowthRate(prev => Math.max(0, prev - 1))}
                          colorScheme="blue"
                          size="xs"
                          flex={1}
                          _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                        >
                          -1
                        </Button>
                        <Button
                          onClick={() => setGrowthRate(prev => Math.min(20, prev + 1))}
                          colorScheme="blue"
                          size="xs"
                          flex={1}
                          _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                        >
                          +1
                        </Button>
                      </HStack>
                    </VStack>

                    {/* 受け取り方に応じて配当利回り／取り崩し率を切り替える入力（app/page.tsx 設定パネル）
                        取り崩しモードでは配当が出ない想定のため、取り崩し率だけを調整対象にする */}
                    <VStack align="stretch" gap={1}>
                      <Text fontSize="sm" fontWeight="medium">
                        {incomeMode === 'withdrawal' ? '取り崩し率（%）' : '利回り（%）'}
                      </Text>
                      <Input
                        type="number"
                        inputMode="decimal"
                        autoComplete="off"
                        size="sm"
                        value={incomeRate}
                        onChange={(e) => (incomeMode === 'withdrawal' ? setWithdrawalRate : setDividendYield)(Number(e.target.value))}
                        step={0.5}
                        min={0}
                        max={20}
                      />
                      <HStack gap={1}>
                        <Button
                          onClick={() => (incomeMode === 'withdrawal' ? setWithdrawalRate : setDividendYield)(prev => Math.max(0, prev - 1))}
                          colorScheme="blue"
                          size="xs"
                          flex={1}
                          _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                        >
                          -1
                        </Button>
                        <Button
                          onClick={() => (incomeMode === 'withdrawal' ? setWithdrawalRate : setDividendYield)(prev => Math.min(20, prev + 1))}
                          colorScheme="blue"
                          size="xs"
                          flex={1}
                          _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                        >
                          +1
                        </Button>
                      </HStack>
                    </VStack>
                  </SimpleGrid>

                  <Box bg="blue.50" _dark={{ bg: "blue.900" }} px={3} py={2} borderRadius="lg">
                    <HStack justify="space-between" align="baseline">
                      <Text fontSize="xs">実効年利（配当再投資前提）</Text>
                      <Text fontSize="lg" fontWeight="bold" color="blue.600" _dark={{ color: "blue.300" }}>
                        {effectiveAnnualReturn.toFixed(2)}%
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                      {incomeMode === 'withdrawal'
                        ? '価格成長率（分配金は投資信託内で再投資される想定）'
                        : '価格成長率 + 利回り × (1 − 税率)'}
                    </Text>
                  </Box>

                  <VStack align="stretch" gap={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      投資先（配当税率）
                    </Text>
                    <HStack gap={1}>
                      {(Object.keys(MARKETS) as MarketKey[]).map((key) => (
                        <Button
                          key={key}
                          onClick={() => setMarket(key)}
                          colorScheme="blue"
                          size="sm"
                          flex={1}
                          variant={market === key ? 'solid' : 'outline'}
                          _dark={market === key
                            ? { bg: "blue.600", color: "white", _hover: { bg: "blue.500" } }
                            : { borderColor: "gray.600", color: "gray.300", _hover: { bg: "gray.700" } }}
                        >
                          {MARKETS[key].label}
                        </Button>
                      ))}
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                      {incomeMode === 'withdrawal'
                        ? '取り崩しは譲渡益課税20.315%で計算（NISA考慮なし）'
                        : '国内: 20.315% / US: 28.2835%（外国税額控除・NISA考慮なし）'}
                    </Text>
                  </VStack>
                </SimpleGrid>
              </Box>

              {/* 右カラム: FIREまでの道のり（達成予測＋月間配当グラフ＋サマリー） */}
              <Box flex={1} minW={0}>
                <Heading as="h2" size="md" mb={3}>FIREまでの道のり</Heading>

                <Box
                  bg="yellow.50"
                  _dark={{ bg: "yellow.900" }}
                  p={{ base: 3, md: 4 }}
                  borderRadius="lg"
                  mb={4}
                  textAlign="center"
                >
                  <HStack justify="center" align="baseline" gap={2} flexWrap="wrap">
                    <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }}>
                      目標達成まで あと
                    </Text>
                    <Text
                      fontSize={{ base: '3xl', md: '4xl' }}
                      fontWeight="bold"
                      color="orange.600"
                      _dark={{ color: "orange.300" }}
                      lineHeight="1"
                    >
                      {simulationData.months}
                    </Text>
                    <Text fontSize="lg" fontWeight="semibold">ヶ月</Text>
                    {simulationData.months >= 12 && (
                      <>
                        <Text fontSize="lg" color="gray.500" mx={1}>＝</Text>
                        <Text
                          fontSize={{ base: '2xl', md: '3xl' }}
                          fontWeight="bold"
                          color="orange.600"
                          _dark={{ color: "orange.300" }}
                          lineHeight="1"
                        >
                          {Math.floor(simulationData.months / 12)}
                        </Text>
                        <Text fontSize="lg" fontWeight="semibold">年</Text>
                        {simulationData.months % 12 > 0 && (
                          <>
                            <Text
                              fontSize={{ base: '2xl', md: '3xl' }}
                              fontWeight="bold"
                              color="orange.600"
                              _dark={{ color: "orange.300" }}
                              lineHeight="1"
                            >
                              {simulationData.months % 12}
                            </Text>
                            <Text fontSize="lg" fontWeight="semibold">ヶ月</Text>
                          </>
                        )}
                      </>
                    )}
                    <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }} ml={2}>
                      達成予定: <Text as="span" fontWeight="bold" color="orange.700" _dark={{ color: "orange.200" }}>
                        {simulationData.targetDate.getFullYear()}年{simulationData.targetDate.getMonth() + 1}月頃
                      </Text>
                    </Text>
                  </HStack>
                </Box>

                {/* グラフ（app/page.tsx）
                    スマホでは軸ラベルを省略し、余白・目盛り・凡例を詰めて
                    狭い画面（iPhone SE3 の375px幅）でもプロット領域を確保する */}
                <Box h={{ base: '280px', md: '380px' }} mb={4} fontSize={{ base: '11px', md: 'md' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={isMobile ? { top: 8, right: 8, left: 0, bottom: 0 } : undefined}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="monthLabel"
                        label={isMobile ? undefined : { value: '年月', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis
                        width={isMobile ? 42 : 60}
                        tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                        label={isMobile ? undefined : { value: `月間${incomeLabel}額（円/月）`, angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        formatter={(value) => `${Number(value ?? 0).toLocaleString()}円/月`}
                        labelFormatter={(label) => `${label}`}
                        contentStyle={{
                          backgroundColor: isDark ? '#1A202C' : '#FFFFFF',
                          borderColor: isDark ? '#4A5568' : '#E2E8F0',
                          color: isDark ? '#E2E8F0' : '#1A202C',
                          borderRadius: '8px',
                        }}
                        labelStyle={{
                          color: isDark ? '#A0AEC0' : '#4A5568',
                        }}
                        itemStyle={{
                          color: isDark ? '#E2E8F0' : '#1A202C',
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: isMobile ? '8px' : '20px', fontSize: isMobile ? '11px' : undefined }} />
                      <ReferenceLine
                        y={targetMonthlyDividend}
                        stroke="#ED8936"
                        strokeDasharray="6 4"
                        label={{
                          value: isMobile
                            ? `目標 ${(targetMonthlyDividend / 10000).toLocaleString()}万円/月`
                            : `目標 ${(targetMonthlyDividend / 10000).toLocaleString()}万円/月（税引後）`,
                          position: 'insideTopRight',
                          fill: '#ED8936',
                          fontSize: isMobile ? 10 : 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="monthlyIncome"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name={`月間${incomeLabel}額（税引前）`}
                        dot={{ r: isMobile ? 2.5 : 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="monthlyIncomeAfterTax"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name={`月間${incomeLabel}額（税引後）`}
                        dot={{ r: isMobile ? 2.5 : 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>

                <SimpleGrid columns={{ base: 2, xl: 4 }} gap={3}>
                  <Box bg="green.50" _dark={{ bg: "green.900" }} p={3} borderRadius="lg">
                    <Text fontSize="xs" mb={1}>総投資額</Text>
                    <Text fontSize="lg" fontWeight="bold" color="green.600" _dark={{ color: "green.400" }}>
                      {(currentSavings + monthlyAmount * simulationData.months).toLocaleString()}円
                    </Text>
                  </Box>

                  <Box bg="purple.50" _dark={{ bg: "purple.900" }} p={3} borderRadius="lg">
                    <Text fontSize="xs" mb={1}>運用益</Text>
                    <Text fontSize="lg" fontWeight="bold" color="purple.600" _dark={{ color: "purple.400" }}>
                      {Math.round(simulationData.finalAmount - currentSavings - monthlyAmount * simulationData.months).toLocaleString()}円
                    </Text>
                  </Box>

                  <Box bg="orange.50" _dark={{ bg: "orange.900" }} p={3} borderRadius="lg">
                    <Text fontSize="xs" mb={1}>現在の毎月{incomeLabel}額</Text>
                    <Text fontSize="lg" fontWeight="bold" color="orange.600" _dark={{ color: "orange.400" }}>
                      {Math.round(currentSavings * incomeRate / 100 / 12).toLocaleString()}円
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      （現在の貯蓄額×{incomeMode === 'withdrawal' ? '取り崩し率' : '配当利回り'}÷12）
                    </Text>
                  </Box>

                  <Box bg="teal.50" _dark={{ bg: "teal.900" }} p={3} borderRadius="lg">
                    <Text fontSize="xs" mb={1}>年間積立額</Text>
                    <Text fontSize="lg" fontWeight="bold" color="teal.600" _dark={{ color: "teal.400" }}>
                      {estimatedAnnualIncome.toLocaleString()}円
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      （毎月の積立額×12）
                    </Text>
                  </Box>
                </SimpleGrid>
              </Box>
            </Flex>
          </Card.Body>
        </Card.Root>

      </Container>
    </Box>
  );
}
