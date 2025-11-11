'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartData } from '../hooks/useReports';
import Loading from '@/components/ui/Loading';

interface RevenueBreakdownChartProps {
  data: ChartData[];
  isLoading?: boolean;
}

export function RevenueBreakdownChart({ data, isLoading }: RevenueBreakdownChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6 h-80 flex items-center justify-center transition-colors duration-300">
        <Loading size="medium" text="Loading revenue data..." />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6 h-80 flex items-center justify-center transition-colors duration-300">
        <p className="text-gray-500 dark:text-slate-400">No revenue data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6 transition-colors duration-300">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Revenue by Product</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip formatter={(value: any) => `₦${(value as number).toLocaleString()}`} />
          <Legend />
          <Bar dataKey="value" fill="#10b981" name="Revenue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

