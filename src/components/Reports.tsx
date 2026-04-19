import { Transaction } from '../types';
import { useEffect, useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Legend 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useTheme } from 'next-themes';

interface ReportsProps {
  transactions: Transaction[];
  compact?: boolean;
}

const COLORS = [
  '#FF6B6B',
  '#4D96FF',
  '#FFD93D',
  '#6BCB77',
  '#C77DFF',
  '#FF922B',
  '#2EC4B6',
  '#F06595',
];

export default function Reports({ transactions, compact = false }: ReportsProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const tooltipStyle = {
    backgroundColor: isDark ? '#1a1d26' : '#ffffff',
    border: isDark ? '1px solid #2d313d' : '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '12px',
  };
  const tooltipItemStyle = { color: isDark ? '#ffffff' : '#111827' };
  const chartStroke = isDark ? '#111827' : '#cbd5e1';
  const axisStroke = isDark ? '#6b7280' : '#475569';

  // Expense by category
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const pieData = Object.keys(expenseByCategory).map(name => ({
    name,
    value: expenseByCategory[name]
  })).sort((a, b) => b.value - a.value);
  const totalPieValue = pieData.reduce((sum, item) => sum + item.value, 0);

  // Income vs Expense
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const barData = [
    { name: 'Summary', income: totalIncome, expense: totalExpense }
  ];
  const formatPieLabel = ({ name, percent }: { name?: unknown; percent?: unknown }) => {
    const labelName = typeof name === 'string' ? name : 'Other';
    const labelPercent = typeof percent === 'number' && Number.isFinite(percent) ? percent : 0;
    return `${labelName} ${(labelPercent * 100).toFixed(0)}%`;
  };

  if (compact) {
    return (
      <Card className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-500 dark:text-gray-400">Expense Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-50 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke={chartStroke}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {pieData.slice(0, 3).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full ring-1 ring-white/30" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-500 dark:text-gray-400">{item.name}</span>
                </div>
                <span className="font-bold">฿ {item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
      <Card className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Expense by Category</CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <div className="h-62.5 md:h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={isMobile ? false : formatPieLabel}
                  outerRadius="80%"
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke={chartStroke}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {isMobile && pieData.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {pieData.slice(0, 4).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="truncate text-slate-600 dark:text-gray-300">{item.name}</span>
                  </div>
                  <span className="shrink-0 text-slate-500 dark:text-gray-400">
                    {totalPieValue > 0 ? `${Math.round((item.value / totalPieValue) * 100)}%` : "0%"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Income vs Expense</CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <div className="h-62.5 md:h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke={axisStroke} fontSize={12} />
                <YAxis stroke={axisStroke} fontSize={12} />
                <Tooltip 
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
