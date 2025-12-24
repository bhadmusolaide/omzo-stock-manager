'use client';

import { useState, useMemo } from 'react';
import { useOverviewMetrics, useExpenseBreakdown, useRevenueBreakdown, BatchReport } from '@/features/reports/hooks/useReports';
import { MetricsCard } from '@/features/reports/components/MetricsCard';
import { ExpenseBreakdownChart } from '@/features/reports/components/ExpenseBreakdownChart';
import { RevenueBreakdownChart } from '@/features/reports/components/RevenueBreakdownChart';
import { BatchReportCard } from '@/features/reports/components/BatchReportCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Loading from '@/components/ui/Loading';
import { useQuery, useQueries } from '@tanstack/react-query';

interface Batch {
  id: string;
  name: string;
}

export default function Reports() {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { data: overview } = useOverviewMetrics();
  const { data: expenseData, isLoading: expenseLoading } = useExpenseBreakdown(selectedBatchId || undefined);
  const { data: revenueData, isLoading: revenueLoading } = useRevenueBreakdown(selectedBatchId || undefined);

  const { data: batchesData = [] } = useQuery<Batch[]>({
    queryKey: ['batches'],
    queryFn: async () => {
      const res = await fetch('/api/batches');
      if (!res.ok) throw new Error('Failed to fetch batches');
      const data = await res.json();
      return data.batches || data;
    },
  });
  const batches = Array.isArray(batchesData) ? batchesData : [];

  const batchReports = useQueries({
    queries: batches.map(batch => ({
      queryKey: ['reports', 'batch', batch.id],
      queryFn: async () => {
        const res = await fetch(`/api/reports/batch/${batch.id}`);
        if (!res.ok) throw new Error('Failed to fetch batch report');
        return res.json();
      },
      enabled: !!batch.id,
    }))
  });

  const selectedBatchReport = useMemo(() => {
    if (!selectedBatchId) return undefined;
    const index = batches.findIndex(b => b.id === selectedBatchId);
    return batchReports[index]?.data;
  }, [selectedBatchId, batches, batchReports]);

  const formatCurrency = (value: number) => `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-800 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">Farm performance, costs, and profitability insights</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6 mb-8 transition-colors duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Select Batch</label>
              <select
                value={selectedBatchId || ''}
                onChange={(e) => setSelectedBatchId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
              />
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        {!selectedBatchId && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <MetricsCard
              label="Total Income"
              value={formatCurrency(overview?.totalIncome || 0)}
              trend="up"
            />
            <MetricsCard
              label="Total Expenses"
              value={formatCurrency(overview?.totalExpenses || 0)}
              trend="down"
            />
            <MetricsCard
              label="Overall Profit"
              value={formatCurrency(overview?.overallProfit || 0)}
              trend={overview?.overallProfit ? (overview.overallProfit > 0 ? 'up' : 'down') : 'neutral'}
            />
            <MetricsCard
              label="Mortality Rate"
              value={`${overview?.mortalityRate.toFixed(1) || 0}%`}
              trend="down"
            />
            <MetricsCard
              label="Avg Feed Cost/kg"
              value={formatCurrency(overview?.avgFeedCostPerKg || 0)}
            />
          </div>
        )}

        {/* Batch-specific Report */}
        {selectedBatchId && selectedBatchReport && (
          <div className="mb-8">
            <BatchReportCard report={selectedBatchReport} />
            {/* Processing Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <MetricsCard
                label="Dressing %"
                value={`${selectedBatchReport.dressingPercentage.toFixed(1)}%`}
                trend="neutral"
              />
              <MetricsCard
                label="FCR"
                value={selectedBatchReport.fcr.toFixed(2)}
                trend="neutral"
              />
              <MetricsCard
                label="Profit per Dressed kg"
                value={formatCurrency(selectedBatchReport.profitPerDressedKg)}
                trend={selectedBatchReport.profitPerDressedKg > 0 ? 'up' : 'down'}
              />
              <MetricsCard
                label="Weight Loss %"
                value={`${selectedBatchReport.weightLossPercentage.toFixed(1)}%`}
                trend="down"
              />
            </div>
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Processing Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><strong>Total Processed Birds:</strong> {selectedBatchReport.totalProcessedBirds}</div>
                  <div><strong>Total Dressed Weight:</strong> {selectedBatchReport.totalDressedWeightKg.toFixed(2)} kg</div>
                  <div><strong>Cost per Dressed kg:</strong> {formatCurrency(selectedBatchReport.costPerDressedKg)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Revenue by Order Type Summary */}
        {revenueData?.byOrderType && revenueData.byOrderType.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {revenueData.byOrderType.map((item) => (
              <div
                key={item.type}
                className={`p-4 rounded-lg ${
                  item.type === 'LIVE'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                }`}
              >
                <h3 className={`text-lg font-semibold ${
                  item.type === 'LIVE'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-orange-800 dark:text-orange-200'
                }`}>
                  {item.name}
                </h3>
                <p className={`text-2xl font-bold ${
                  item.type === 'LIVE'
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-orange-900 dark:text-orange-100'
                }`}>
                  {formatCurrency(item.value)}
                </p>
                <p className={`text-sm mt-1 ${
                  item.type === 'LIVE'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-orange-700 dark:text-orange-300'
                }`}>
                  {item.count.toLocaleString()} {item.type === 'LIVE' ? 'birds' : 'items'} sold
                </p>
              </div>
            ))}

            {/* Complimentary Orders Card - Always visible */}
            {revenueData.complimentary && (
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                  🎁 Complimentary
                </h3>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {formatCurrency(revenueData.complimentary.totalValue)}
                </p>
                <p className="text-sm mt-1 text-purple-700 dark:text-purple-300">
                  {revenueData.complimentary.orderCount} order{revenueData.complimentary.orderCount !== 1 ? 's' : ''}
                  {(revenueData.complimentary.liveCount > 0 || revenueData.complimentary.dressedCount > 0) && ' • '}
                  {revenueData.complimentary.liveCount > 0 && `${revenueData.complimentary.liveCount} birds`}
                  {revenueData.complimentary.liveCount > 0 && revenueData.complimentary.dressedCount > 0 && ', '}
                  {revenueData.complimentary.dressedCount > 0 && `${revenueData.complimentary.dressedCount} items`}
                </p>
                <p className="text-xs mt-1 text-purple-600 dark:text-purple-400 italic">
                  Value given away (not revenue)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ExpenseBreakdownChart data={expenseData || []} isLoading={expenseLoading} />
          <RevenueBreakdownChart data={revenueData?.byProduct || []} isLoading={revenueLoading} />
        </div>

        {/* Batch Summary Table */}
        {!selectedBatchId && (
          <div className="bg-white dark:bg-slate-700 rounded-lg shadow overflow-hidden transition-colors duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-slate-600">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Batch Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">Batch Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">Birds</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">Mortality %</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">Feed (kg)</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">Revenue</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">Expenses</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">Profit</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">Margin %</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">Dressing %</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">FCR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">
                        No batches available
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch, index) => (
                      <BatchSummaryRow key={batch.id} batchName={batch.name} report={batchReports[index]?.data} isLoading={batchReports[index]?.isLoading} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BatchSummaryRow({ batchName, report, isLoading }: { batchName: string; report: BatchReport | undefined; isLoading: boolean }) {
  const formatCurrency = (value: number) => `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;

  if (isLoading || !report) {
    return (
      <tr>
        <td colSpan={10} className="px-6 py-4 text-center">
          <Loading size="small" text="Loading report..." />
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-slate-800">
      <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-50 font-medium">{batchName}</td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{report.totalBirds}</td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{report.mortalityPercent.toFixed(1)}%</td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{report.totalFeedKg.toFixed(1)}</td>
      <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400 font-medium">{formatCurrency(report.totalRevenue)}</td>
      <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400 font-medium">{formatCurrency(report.totalExpenses)}</td>
      <td className={`px-6 py-4 text-sm font-medium ${report.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {formatCurrency(report.profit)}
      </td>
      <td className={`px-6 py-4 text-sm font-medium ${report.profitMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {report.profitMargin.toFixed(1)}%
      </td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{report.dressingPercentage.toFixed(1)}%</td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{report.fcr.toFixed(2)}</td>
    </tr>
  );
}