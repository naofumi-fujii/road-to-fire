'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
} from '@chakra-ui/react';

export default function Home() {
  const [targetAmount, setTargetAmount] = useState(12000000); // 目標額（デフォルト1200万円）
  const [monthlyAmount, setMonthlyAmount] = useState(200000); // 毎月の積立額（デフォルト20万円）
  const [annualReturn, setAnnualReturn] = useState(5); // 年利（デフォルト5%）
  const [dividendYield, setDividendYield] = useState(5); // 配当利回り（デフォルト5%）

  // 積立シミュレーションの計算
  const simulationData = useMemo(() => {
    const data = [];
    let currentAmount = 0;
    const monthlyReturn = annualReturn / 100 / 12; // 月利
    let month = 0;

    // 目標額に達するまで、または最大30年（360ヶ月）まで計算
    while (currentAmount < targetAmount && month < 360) {
      // 利息を加算
      currentAmount = currentAmount * (1 + monthlyReturn) + monthlyAmount;
      month++;

      // 毎月データポイントを追加
      data.push({
        month: month,
        amount: Math.round(currentAmount),
        contribution: monthlyAmount * month,
      });
    }

    // 目標額到達予定日を計算
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + month);

    return { data, months: month, finalAmount: currentAmount, targetDate };
  }, [targetAmount, monthlyAmount, annualReturn]);

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
            <Heading as="h2" size="xl" mb={6}>設定</Heading>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
              <VStack align="stretch">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  目標金額（円）
                </Text>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={targetAmount.toLocaleString()}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '');
                    if (!isNaN(Number(value))) {
                      setTargetAmount(Number(value));
                    }
                  }}
                />
                <HStack gap={2}>
                  <Button
                    onClick={() => setTargetAmount(prev => prev + 10000)}
                    colorScheme="blue"
                    size="sm"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    +10,000
                  </Button>
                  <Button
                    onClick={() => setTargetAmount(prev => prev + 100000)}
                    colorScheme="blue"
                    size="sm"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    +100,000
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
                <HStack gap={2}>
                  <Button
                    onClick={() => setMonthlyAmount(prev => prev + 10000)}
                    colorScheme="blue"
                    size="sm"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    +10,000
                  </Button>
                  <Button
                    onClick={() => setMonthlyAmount(prev => prev + 100000)}
                    colorScheme="blue"
                    size="sm"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    +100,000
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
                <HStack gap={2}>
                  <Button
                    onClick={() => setAnnualReturn(prev => Math.max(0, prev - 1))}
                    colorScheme="blue"
                    size="sm"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    -1
                  </Button>
                  <Button
                    onClick={() => setAnnualReturn(prev => Math.min(20, prev + 1))}
                    colorScheme="blue"
                    size="sm"
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
                <HStack gap={2}>
                  <Button
                    onClick={() => setDividendYield(prev => Math.max(0, prev - 1))}
                    colorScheme="blue"
                    size="sm"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    -1
                  </Button>
                  <Button
                    onClick={() => setDividendYield(prev => Math.min(20, prev + 1))}
                    colorScheme="blue"
                    size="sm"
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
                  {(monthlyAmount * simulationData.months).toLocaleString()}円
                </Text>
              </Box>

              <Box bg="purple.50" _dark={{ bg: "purple.900" }} p={4} borderRadius="lg">
                <Text fontSize="sm" mb={1}>運用益</Text>
                <Text fontSize="2xl" fontWeight="bold" color="purple.600" _dark={{ color: "purple.400" }}>
                  {Math.round(simulationData.finalAmount - monthlyAmount * simulationData.months).toLocaleString()}円
                </Text>
              </Box>

              <Box bg="orange.50" _dark={{ bg: "orange.900" }} p={4} borderRadius="lg">
                <Text fontSize="sm" mb={1}>毎月の配当額</Text>
                <Text fontSize="2xl" fontWeight="bold" color="orange.600" _dark={{ color: "orange.400" }}>
                  {Math.round(targetAmount * dividendYield / 100 / 12).toLocaleString()}円
                </Text>
                <Text fontSize="sm" color="gray.500">
                  （目標額×配当利回り÷12）
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
                    dataKey="month"
                    label={{ value: '月数', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                    label={{ value: '金額（円）', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value: number) => `${value.toLocaleString()}円`}
                    labelFormatter={(label) => `${label}ヶ月後`}
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

        <Card.Root>
          <Card.Body p={6}>
            <Heading as="h2" size="lg" mb={3}>ポイント</Heading>
            <VStack align="start" gap={2}>
              <Text>• 毎月{monthlyAmount.toLocaleString()}円を積み立てると、約{Math.round(simulationData.months / 12 * 10) / 10}年で目標の{targetAmount.toLocaleString()}円に到達します</Text>
              <Text>• 年利{annualReturn}%で運用した場合の試算です</Text>
              <Text>• 実際の運用成績は市場環境により変動します</Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Container>
    </Box>
  );
}
