'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ThemeToggle } from './components/ThemeToggle';

export default function Home() {
  const [targetAmount, setTargetAmount] = useState(24000000); // 目標額（デフォルト2400万円）
  const [monthlyAmount, setMonthlyAmount] = useState(100000); // 毎月の積立額（デフォルト10万円）
  const [annualReturn, setAnnualReturn] = useState(5); // 年利（デフォルト5%）

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

      // 年ごとにデータポイントを追加
      if (month % 12 === 0) {
        data.push({
          year: month / 12,
          amount: Math.round(currentAmount),
          contribution: monthlyAmount * month,
        });
      }
    }

    // 最後のポイントを追加（目標達成時）
    if (month % 12 !== 0) {
      data.push({
        year: Math.round(month / 12 * 10) / 10,
        amount: Math.round(currentAmount),
        contribution: monthlyAmount * month,
      });
    }

    return { data, months: month, finalAmount: currentAmount };
  }, [targetAmount, monthlyAmount, annualReturn]);

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-center mb-2 text-gray-800 dark:text-gray-100">
              Road to FIRE
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-300">
              積立投資シミュレーター
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-100">設定</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                目標金額（円）
              </label>
              <input
                type="text"
                value={targetAmount.toLocaleString()}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, '');
                  if (!isNaN(Number(value))) {
                    setTargetAmount(Number(value));
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                毎月の積立額（円）
              </label>
              <input
                type="text"
                value={monthlyAmount.toLocaleString()}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, '');
                  if (!isNaN(Number(value))) {
                    setMonthlyAmount(Number(value));
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                想定年利（%）
              </label>
              <input
                type="number"
                value={annualReturn}
                onChange={(e) => setAnnualReturn(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                step="0.5"
                min="0"
                max="20"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">シミュレーション結果</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">目標達成まで</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {simulationData.months}ヶ月
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                （約{Math.round(simulationData.months / 12 * 10) / 10}年）
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">総投資額</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {(monthlyAmount * simulationData.months).toLocaleString()}円
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">運用益</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(simulationData.finalAmount - monthlyAmount * simulationData.months).toLocaleString()}円
              </p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">毎月の配当額</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {Math.round(targetAmount / 120).toLocaleString()}円
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                （目標額÷120）
              </p>
            </div>
          </div>

          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simulationData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="year"
                  label={{ value: '年数', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                  label={{ value: '金額（円）', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number) => `${value.toLocaleString()}円`}
                  labelFormatter={(label) => `${label}年後`}
                />
                <Legend />
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
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">ポイント</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>毎月{monthlyAmount.toLocaleString()}円を積み立てると、約{Math.round(simulationData.months / 12 * 10) / 10}年で目標の{targetAmount.toLocaleString()}円に到達します</li>
            <li>年利{annualReturn}%で運用した場合の試算です</li>
            <li>実際の運用成績は市場環境により変動します</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
