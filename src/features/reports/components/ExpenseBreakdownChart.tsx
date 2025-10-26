'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartData } from '../hooks/useReports';
import Loading from '@/components/ui/Loading';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

interface ExpenseBreakdownChartProps {
  data: ChartData[];
  isLoading?: boolean;
}

export function ExpenseBreakdownChart({ data, isLoading }: ExpenseBreakdownChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6 h-80 flex items-center justify-center transition-colors duration-300">
        <Loading size="medium" text="Loading expense data..." />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6 h-80 flex items-center justify-center transition-colors duration-300">
        <p className="text-gray-500 dark:text-slate-400">No expense data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6 transition-colors duration-300">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Expense Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }: any) => `${name}: ₦${(value as number).toLocaleString()}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => `₦${(value as number).toLocaleString()}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

