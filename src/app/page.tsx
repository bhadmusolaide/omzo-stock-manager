'use client';

import { useOverviewMetrics } from '@/features/reports/hooks/useReports';
import { useTransactions } from '@/hooks/useTransactions';
import { KPICard } from '@/components/common/KPICard';
import Table from '@/components/ui/Table';
import { formatCurrency } from '@/utils/currency';
import { DollarSign, TrendingUp, TrendingDown, Users, Percent, Package } from 'lucide-react';
import PendingPaymentsCarousel from '@/components/PendingPaymentsCarousel';
import AIInsightsWidget from '@/components/AIInsightsWidget';

const transactionColumns = [
  {
    key: 'date',
    header: 'Date',
    render: (value: string) => new Date(value).toLocaleDateString('en-NG'),
  },
  { key: 'description', header: 'Description' },
  {
    key: 'amount',
    header: 'Amount',
    render: (value: number, row: any) => {
      const sign = row.type === 'CREDIT' ? '+' : '-';
      return `${sign} ${formatCurrency(value)}`;
    },
  },
  { key: 'type', header: 'Type' },
  { key: 'category', header: 'Category' },
];

export default function Home() {
  const { data: metrics, isLoading: metricsLoading } = useOverviewMetrics();
  const { data: transactions, isLoading: txLoading } = useTransactions({});

  const recentTransactions = transactions?.slice(0, 5) || [];

  if (metricsLoading) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="mb-6">Welcome to the Farm Stock Management System.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <KPICard key={i} title="" value="" loading={true} />
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Recent Transactions</h2>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="mb-6">Welcome to the Farm Stock Management System.</p>

      {/* Pending Payments Carousel */}
      <PendingPaymentsCarousel />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <KPICard
              title="Total Income"
              value={formatCurrency(metrics?.totalIncome || 0)}
              icon={DollarSign}
              color="green"
            />
            <KPICard
              title="Total Expenses"
              value={formatCurrency(metrics?.totalExpenses || 0)}
              icon={DollarSign}
              color="red"
            />
            <KPICard
              title="Current Balance"
              value={formatCurrency(metrics?.overallProfit || 0)}
              icon={DollarSign}
              color={metrics?.overallProfit && metrics.overallProfit >= 0 ? 'green' : 'red'}
            />
            <KPICard
              title="Overall Profit"
              value={formatCurrency(metrics?.overallProfit || 0)}
              icon={TrendingUp}
              color={metrics?.overallProfit && metrics.overallProfit >= 0 ? 'green' : 'red'}
            />
            <KPICard
              title="Feed Inventory"
              value={`${(metrics?.remainingFeedKg || 0).toFixed(2)} KG remaining (Total: ${(metrics?.totalFeedKg || 0).toFixed(2)}, Assigned: ${(metrics?.assignedFeedKg || 0).toFixed(2)})`}
              icon={Package}
              color="blue"
            />
            <KPICard
              title="Active Batches"
              value={metrics?.batchCount || 0}
              icon={Package}
              color="blue"
            />
            <KPICard
              title="Mortality Rate"
              value={`${(metrics?.mortalityRate || 0).toFixed(2)}%`}
              icon={TrendingDown}
              color="red"
            />
            <KPICard
              title="Avg Feed Cost/kg"
              value={formatCurrency(metrics?.avgFeedCostPerKg || 0)}
              icon={DollarSign}
              color="orange"
            />
          </div>
        </div>
        <div className="lg:col-span-1">
          <AIInsightsWidget />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Recent Transactions</h2>
        {txLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <Table columns={transactionColumns} data={recentTransactions} />
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No recent transactions.</p>
        )}
      </div>
    </div>
  );
}