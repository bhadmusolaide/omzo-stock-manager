'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartData } from '../hooks/useReports';
import Loading from '@/components/ui/Loading';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#f97316'];

interface ExpenseBreakdownChartProps {
  data: ChartData[];
  isLoading?: boolean;
}

function formatCurrency(value: number) {
  return `₦${value.toLocaleString('en-NG')}`;
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

  // Sort by value descending for better readability
  const sortedData = [...data].sort((a, b) => (b.value || 0) - (a.value || 0));

  return (
    <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6 transition-colors duration-300">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Expense Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" stroke="#6b7280" tickFormatter={(v) => formatCurrency(v as number)} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#374151"
            width={90}
            tick={{ fontWeight: 600, fontSize: 13 }}
          />
          <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
            {sortedData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary legend below chart */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {sortedData.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm text-gray-700 dark:text-slate-300 truncate" title={`${item.name}: ${formatCurrency(item.value as number)}`}>
              {item.name} — {formatCurrency(item.value as number)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

