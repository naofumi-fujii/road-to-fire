'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
} from '@chakra-ui/react';

// 上場株式の配当にかかる税率（所得税15.315% + 住民税5%）
const DIVIDEND_TAX_RATE = 0.20315;

// 現在の年月（計算開始のデフォルト）
const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_MONTH = TODAY.getMonth() + 1; // 1-indexed

// 入力項目のデフォルト値（初期化ボタンで使用）
const DEFAULTS = {
  currentSavings: 14000000, // 現在の貯蓄額（1400万円）
  monthlyAmount: 300000, // 毎月の積立額（30万円）
  annualReturn: 5, // 年利（%）
  dividendYield: 5, // 配当利回り（%）
  targetMonthlyDividend: 200000, // 目標の毎月配当額（20万円）
  startYear: CURRENT_YEAR, // 計算開始年
  startMonth: CURRENT_MONTH, // 計算開始月（1-12）
};

export default function Home() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [currentSavings, setCurrentSavings] = useState(DEFAULTS.currentSavings);
  const [monthlyAmount, setMonthlyAmount] = useState(DEFAULTS.monthlyAmount);
  const [annualReturn, setAnnualReturn] = useState(DEFAULTS.annualReturn);
  const [dividendYield, setDividendYield] = useState(DEFAULTS.dividendYield);
  const [targetMonthlyDividend, setTargetMonthlyDividend] = useState(DEFAULTS.targetMonthlyDividend);
  const [startYear, setStartYear] = useState(DEFAULTS.startYear);
  const [startMonth, setStartMonth] = useState(DEFAULTS.startMonth);

  // すべての入力値をデフォルトに戻す
  const handleReset = () => {
    setCurrentSavings(DEFAULTS.currentSavings);
    setMonthlyAmount(DEFAULTS.monthlyAmount);
    setAnnualReturn(DEFAULTS.annualReturn);
    setDividendYield(DEFAULTS.dividendYield);
    setTargetMonthlyDividend(DEFAULTS.targetMonthlyDividend);
    setStartYear(DEFAULTS.startYear);
    setStartMonth(DEFAULTS.startMonth);
  };

  // 毎月配当シミュレーション（目標の毎月配当額から必要な資産額を逆算）
  const dividendSimulation = useMemo(() => {
    const annualDividend = targetMonthlyDividend * 12;
    const requiredAmount = dividendYield > 0 ? annualDividend / (dividendYield / 100) : 0;
    const afterTaxMonthly = targetMonthlyDividend * (1 - DIVIDEND_TAX_RATE);
    const shortfall = Math.max(0, requiredAmount - currentSavings);
    const progress = requiredAmount > 0 ? Math.min(100, (currentSavings / requiredAmount) * 100) : 0;
    return { annualDividend, requiredAmount, afterTaxMonthly, shortfall, progress };
  }, [targetMonthlyDividend, dividendYield, currentSavings]);

  // 積立シミュレーションの計算（目標額は配当シミュレーションの必要資産額を使用）
  const targetAmount = Math.round(dividendSimulation.requiredAmount);
  const simulationData = useMemo(() => {
    const data = [];
    let investmentAmount = 0; // 積立額と運用益（年利が適用される部分）
    const monthlyReturn = annualReturn / 100 / 12; // 月利
    let month = 0;

    // 計算開始日（startYear年startMonth月）
    const startDate = new Date(startYear, startMonth - 1);

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
  }, [targetAmount, currentSavings, monthlyAmount, annualReturn, startYear, startMonth]);

  // 年間積立額の計算
  const estimatedAnnualIncome = useMemo(() => {
    return monthlyAmount * 12;
  }, [monthlyAmount]);

  return (
    <Box minH="100vh" p={8} bgGradient="linear(to-br, blue.50, purple.100)" _dark={{ bgGradient: "linear(to-br, gray.900, gray.800)" }}>
      <Container maxW="container.xl">
        <Flex justify="space-between" align="center" mb={8}>
          <Box flex={1}>
            <Heading as="h1" size="2xl" textAlign="center" mb={2}>
              Road to FIRE
            </Heading>
            <Text textAlign="center" fontSize="lg">
              積立投資シミュレーター
            </Text>
          </Box>
          <ThemeToggle />
        </Flex>

        <Card.Root mb={8}>
          <Card.Body p={6}>
            <Heading as="h2" size="xl" mb={1}>毎月配当シミュレーション</Heading>
            <Text fontSize="sm" color="gray.500" mb={6}>
              毎月受け取りたい配当額から、必要な資産額を逆算します
            </Text>

            <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
              <VStack align="stretch" gap={2}>
                <Text fontSize="sm" fontWeight="medium">
                  目標の毎月配当額（円）
                </Text>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
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
                <Text fontSize="sm" color="gray.500" mt={2}>
                  配当利回り {dividendYield}%（「設定」で変更できます）
                </Text>

                <Box mt={3}>
                  <Flex justify="space-between" mb={1}>
                    <Text fontSize="xs" color="gray.500">
                      現在の貯蓄額（{currentSavings.toLocaleString()}円）での達成率
                    </Text>
                    <Text fontSize="xs" fontWeight="semibold">
                      {dividendSimulation.progress.toFixed(1)}%
                    </Text>
                  </Flex>
                  <Box bg="gray.200" _dark={{ bg: "gray.700" }} borderRadius="full" h="10px" overflow="hidden">
                    <Box
                      bg="orange.400"
                      h="100%"
                      w={`${dividendSimulation.progress}%`}
                      borderRadius="full"
                      transition="width 0.3s"
                    />
                  </Box>
                </Box>
              </VStack>

              <Box
                bg="orange.50"
                _dark={{ bg: "orange.900" }}
                p={6}
                borderRadius="lg"
                display="flex"
                flexDirection="column"
                justifyContent="center"
              >
                <Text fontSize="sm" mb={1}>必要な資産額（税引前）</Text>
                {dividendYield > 0 ? (
                  <>
                    <Text
                      fontSize="4xl"
                      fontWeight="bold"
                      color="orange.600"
                      _dark={{ color: "orange.400" }}
                      lineHeight="1.1"
                    >
                      {Math.round(dividendSimulation.requiredAmount).toLocaleString()}円
                    </Text>
                    <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }} mt={2}>
                      配当利回り{dividendYield}%で毎月{targetMonthlyDividend.toLocaleString()}円の配当を受け取るには、これだけの資産が必要です。
                    </Text>
                  </>
                ) : (
                  <Text fontSize="lg" fontWeight="medium" color="gray.500" mt={2}>
                    「設定」で配当利回りを入力してください
                  </Text>
                )}
              </Box>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mt={6}>
              <Box bg="teal.50" _dark={{ bg: "teal.900" }} p={4} borderRadius="lg">
                <Text fontSize="sm" mb={1}>年間配当額（税引前）</Text>
                <Text fontSize="2xl" fontWeight="bold" color="teal.600" _dark={{ color: "teal.400" }}>
                  {dividendSimulation.annualDividend.toLocaleString()}円
                </Text>
                <Text fontSize="sm" color="gray.500">（毎月の配当額×12）</Text>
              </Box>

              <Box bg="green.50" _dark={{ bg: "green.900" }} p={4} borderRadius="lg">
                <Text fontSize="sm" mb={1}>税引後の毎月配当額（手取り）</Text>
                <Text fontSize="2xl" fontWeight="bold" color="green.600" _dark={{ color: "green.400" }}>
                  {Math.round(dividendSimulation.afterTaxMonthly).toLocaleString()}円
                </Text>
                <Text fontSize="sm" color="gray.500">（税率20.315%で計算）</Text>
              </Box>

              <Box bg="blue.50" _dark={{ bg: "blue.900" }} p={4} borderRadius="lg">
                <Text fontSize="sm" mb={1}>目標までの不足額</Text>
                <Text fontSize="2xl" fontWeight="bold" color="blue.600" _dark={{ color: "blue.400" }}>
                  {Math.round(dividendSimulation.shortfall).toLocaleString()}円
                </Text>
                <Text fontSize="sm" color="gray.500">（必要な資産額−現在の貯蓄額）</Text>
              </Box>
            </SimpleGrid>
          </Card.Body>
        </Card.Root>

        <Card.Root mb={8}>
          <Card.Body p={6}>
            <Flex justify="space-between" align="center" mb={6}>
              <Heading as="h2" size="xl">設定</Heading>
              <Button
                onClick={handleReset}
                size="sm"
                variant="outline"
                colorScheme="gray"
                _dark={{ borderColor: "gray.600", color: "gray.300", _hover: { bg: "gray.700" } }}
              >
                初期化
              </Button>
            </Flex>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
              <VStack align="stretch">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  計算開始年月
                </Text>
                <HStack gap={2}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    autoComplete="off"
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
                <Text fontSize="xs" color="gray.500" mt={1}>
                  シミュレーションの起点となる年月（デフォルトは今月）
                </Text>
              </VStack>

              <VStack align="stretch">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  現在の貯蓄額（円）
                </Text>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
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

              <VStack align="stretch">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  毎月の積立額（円）
                </Text>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
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

              <VStack align="stretch">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  想定年利（%）
                </Text>
                <Input
                  type="number"
                  inputMode="decimal"
                  autoComplete="off"
                  value={annualReturn}
                  onChange={(e) => setAnnualReturn(Number(e.target.value))}
                  step={0.5}
                  min={0}
                  max={20}
                />
                <HStack gap={1}>
                  <Button
                    onClick={() => setAnnualReturn(prev => Math.max(0, prev - 1))}
                    colorScheme="blue"
                    size="xs"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    -1
                  </Button>
                  <Button
                    onClick={() => setAnnualReturn(prev => Math.min(20, prev + 1))}
                    colorScheme="blue"
                    size="xs"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    +1
                  </Button>
                </HStack>
              </VStack>

              <VStack align="stretch">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  配当利回り（%）
                </Text>
                <Input
                  type="number"
                  inputMode="decimal"
                  autoComplete="off"
                  value={dividendYield}
                  onChange={(e) => setDividendYield(Number(e.target.value))}
                  step={0.5}
                  min={0}
                  max={20}
                />
                <HStack gap={1}>
                  <Button
                    onClick={() => setDividendYield(prev => Math.max(0, prev - 1))}
                    colorScheme="blue"
                    size="xs"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    -1
                  </Button>
                  <Button
                    onClick={() => setDividendYield(prev => Math.min(20, prev + 1))}
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
          </Card.Body>
        </Card.Root>

        <Card.Root mb={8}>
          <Card.Body p={6}>
            <Heading as="h2" size="xl" mb={6}>FIREまでの道のり</Heading>

            <Box
              bg="yellow.50"
              _dark={{ bg: "yellow.900" }}
              p={6}
              borderRadius="lg"
              mb={6}
              textAlign="center"
            >
              <Text fontSize="sm" mb={2} color="gray.600" _dark={{ color: "gray.300" }}>
                目標達成まで あと
              </Text>
              <HStack justify="center" align="baseline" gap={2} flexWrap="wrap">
                <Text
                  fontSize="6xl"
                  fontWeight="bold"
                  color="orange.600"
                  _dark={{ color: "orange.300" }}
                  lineHeight="1"
                >
                  {simulationData.months}
                </Text>
                <Text fontSize="2xl" fontWeight="semibold">ヶ月</Text>
                {simulationData.months >= 12 && (
                  <>
                    <Text fontSize="xl" color="gray.500" mx={2}>＝</Text>
                    <Text
                      fontSize="4xl"
                      fontWeight="bold"
                      color="orange.600"
                      _dark={{ color: "orange.300" }}
                      lineHeight="1"
                    >
                      {Math.floor(simulationData.months / 12)}
                    </Text>
                    <Text fontSize="xl" fontWeight="semibold">年</Text>
                    {simulationData.months % 12 > 0 && (
                      <>
                        <Text
                          fontSize="4xl"
                          fontWeight="bold"
                          color="orange.600"
                          _dark={{ color: "orange.300" }}
                          lineHeight="1"
                        >
                          {simulationData.months % 12}
                        </Text>
                        <Text fontSize="xl" fontWeight="semibold">ヶ月</Text>
                      </>
                    )}
                  </>
                )}
              </HStack>
              <Text fontSize="md" color="gray.600" _dark={{ color: "gray.300" }} mt={3}>
                達成予定: <Text as="span" fontWeight="bold" color="orange.700" _dark={{ color: "orange.200" }}>
                  {simulationData.targetDate.getFullYear()}年{simulationData.targetDate.getMonth() + 1}月頃
                </Text>
              </Text>
            </Box>

            <Heading as="h2" size="xl" mb={4}>シミュレーション結果</Heading>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} gap={4} mb={6}>
              <Box bg="blue.50" _dark={{ bg: "blue.900" }} p={4} borderRadius="lg">
                <Text fontSize="sm" mb={1}>目標達成まで</Text>
                <Text fontSize="2xl" fontWeight="bold" color="blue.600" _dark={{ color: "blue.400" }}>
                  {simulationData.months}ヶ月
                </Text>
                <Text fontSize="sm" color="gray.500">
                  （約{Math.round(simulationData.months / 12 * 10) / 10}年）
                </Text>
                <Text fontSize="sm" fontWeight="semibold" color="blue.700" _dark={{ color: "blue.300" }} mt={2}>
                  {simulationData.targetDate.getFullYear()}年{simulationData.targetDate.getMonth() + 1}月頃
                </Text>
              </Box>

              <Box bg="green.50" _dark={{ bg: "green.900" }} p={4} borderRadius="lg">
                <Text fontSize="sm" mb={1}>総投資額</Text>
                <Text fontSize="2xl" fontWeight="bold" color="green.600" _dark={{ color: "green.400" }}>
                  {(currentSavings + monthlyAmount * simulationData.months).toLocaleString()}円
                </Text>
              </Box>

              <Box bg="purple.50" _dark={{ bg: "purple.900" }} p={4} borderRadius="lg">
                <Text fontSize="sm" mb={1}>運用益</Text>
                <Text fontSize="2xl" fontWeight="bold" color="purple.600" _dark={{ color: "purple.400" }}>
                  {Math.round(simulationData.finalAmount - currentSavings - monthlyAmount * simulationData.months).toLocaleString()}円
                </Text>
              </Box>

              <Box bg="orange.50" _dark={{ bg: "orange.900" }} p={4} borderRadius="lg">
                <Text fontSize="sm" mb={1}>毎月の配当額</Text>
                <Text fontSize="2xl" fontWeight="bold" color="orange.600" _dark={{ color: "orange.400" }}>
                  {Math.round(currentSavings * dividendYield / 100 / 12).toLocaleString()}円
                </Text>
                <Text fontSize="sm" color="gray.500">
                  （現在の貯蓄額×配当利回り÷12）
                </Text>
              </Box>

              <Box bg="teal.50" _dark={{ bg: "teal.900" }} p={4} borderRadius="lg">
                <Text fontSize="sm" mb={1}>年間積立額</Text>
                <Text fontSize="2xl" fontWeight="bold" color="teal.600" _dark={{ color: "teal.400" }}>
                  {estimatedAnnualIncome.toLocaleString()}円
                </Text>
                <Text fontSize="sm" color="gray.500">
                  （毎月の積立額×12）
                </Text>
              </Box>
            </SimpleGrid>

            <Box h="400px">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulationData.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="monthLabel"
                    label={{ value: '年月', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                    label={{ value: '金額（円）', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value) => `${Number(value ?? 0).toLocaleString()}円`}
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
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="資産総額"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="contribution"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="総投資額"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Card.Body>
        </Card.Root>

        <Flex justify="center" mt={8}>
          <Link
            href="https://github.com/naofumi-fujii/road-to-fire"
            target="_blank"
            rel="noopener noreferrer"
            _hover={{ opacity: 0.7 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </Link>
        </Flex>
      </Container>
    </Box>
  );
}
