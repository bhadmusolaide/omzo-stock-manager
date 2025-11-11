'use client';

import { BatchReport } from '../hooks/useReports';

interface BatchReportCardProps {
  report: BatchReport;
}

export function BatchReportCard({ report }: BatchReportCardProps) {
  const formatCurrency = (value: number) => `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  return (
    <div className="bg-white dark:bg-slate-700 rounded-lg shadow overflow-hidden transition-colors duration-300">
      <div className="p-6 border-b border-gray-200 dark:border-slate-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{report.name}</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Started: {new Date(report.startDate).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Total Birds</p>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{report.totalBirds}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Current Live</p>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{report.currentLive}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Mortality</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{report.mortalityPercent}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Feed Used</p>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{report.totalFeedKg} kg</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">FCR</p>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{report.fcr.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Feed Cost/kg</p>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(report.feedCostPerKg)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-600">
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Revenue</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(report.totalRevenue)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Expenses</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(report.totalExpenses)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Profit</p>
          <p className={`text-lg font-bold ${report.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(report.profit)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Margin</p>
          <p className={`text-lg font-bold ${report.profitMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {report.profitMargin.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}

