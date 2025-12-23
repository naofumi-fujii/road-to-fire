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
  Link,
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
                <HStack gap={1}>
                  <Button
                    onClick={() => setTargetAmount(prev => Math.max(0, prev - 10000))}
                    colorScheme="blue"
                    size="xs"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    -1万
                  </Button>
                  <Button
                    onClick={() => setTargetAmount(prev => prev + 10000)}
                    colorScheme="blue"
                    size="xs"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    +1万
                  </Button>
                  <Button
                    onClick={() => setTargetAmount(prev => Math.max(0, prev - 100000))}
                    colorScheme="blue"
                    size="xs"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    -10万
                  </Button>
                  <Button
                    onClick={() => setTargetAmount(prev => prev + 100000)}
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
                    onClick={() => setMonthlyAmount(prev => Math.max(0, prev - 100000))}
                    colorScheme="blue"
                    size="xs"
                    flex={1}
                    _dark={{ bg: "gray.700", color: "blue.300", _hover: { bg: "gray.600" } }}
                  >
                    -10万
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
