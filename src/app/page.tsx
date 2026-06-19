'use client';

import { useState } from 'react';
import { useOverviewMetrics } from '@/features/reports/hooks/useReports';
import { useTransactions } from '@/hooks/useTransactions';
import { useSettings } from '@/features/settings/hooks/useSettings';
import { KPICard } from '@/components/common/KPICard';
import Table from '@/components/ui/Table';
import { formatCurrency } from '@/utils/currency';
import { DollarSign, TrendingUp, TrendingDown, Users, Percent, Package, CreditCard } from 'lucide-react';
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
  const [activeOnly, setActiveOnly] = useState(false);
  const { data: metrics, isLoading: metricsLoading } = useOverviewMetrics(activeOnly);
  const { data: transactions, isLoading: txLoading } = useTransactions({});
  const { data: settings } = useSettings();

  const recentTransactions = (transactions?.transactions || transactions || [])?.slice(0, 10) || [];

  if (metricsLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center space-x-2 animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
            <div className="h-6 w-11 bg-gray-200 rounded-full"></div>
          </div>
        </div>
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
              {Array.from({ length: 10 }).map((_, i) => (
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Batches Only</span>
          <button
            onClick={() => setActiveOnly(!activeOnly)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              activeOnly ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                activeOnly ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
      <p className="mb-6">Welcome to the Farm Stock Management System.</p>

      {/* Pending Payments Carousel */}
      <PendingPaymentsCarousel />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className={settings?.showAiInsights !== false ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className={`grid gap-4 sm:gap-6 ${settings?.showAiInsights !== false ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
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
            {activeOnly && (
              <KPICard
                title="Est. Daily Feed Consumption"
                value={`${(metrics?.totalEstDailyFeedKg || 0).toFixed(2)} kg/day`}
                icon={Package}
                color="blue"
              />
            )}
            <KPICard
              title="Outstanding Orders"
              value={formatCurrency(metrics?.outstandingOrderBalance || 0)}
              icon={CreditCard}
              color="orange"
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
          {settings?.showAiInsights !== false && <AIInsightsWidget />}
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
            <Table columns={transactionColumns} data={recentTransactions} configurable tableId="dashboard-transactions" />
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No recent transactions.</p>
        )}
      </div>
    </div>
  );
}