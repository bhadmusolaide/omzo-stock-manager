import { useQuery } from '@tanstack/react-query';

export interface OverviewMetrics {
  totalIncome: number;
  totalExpenses: number;
  overallProfit: number;
  mortalityRate: number;
  avgFeedCostPerKg: number;
  batchCount: number;
  totalFeedKg: number;
  assignedFeedKg: number;
  remainingFeedKg: number;
}

export interface BatchReport {
  id: string;
  name: string;
  totalBirds: number;
  mortalityCount: number;
  mortalityPercent: number;
  currentLive: number;
  totalFeedKg: number;
  totalFeedCost: number;
  docCost: number;
  miscExpenses: number;
  totalExpenses: number;
  totalRevenue: number;
  profit: number;
  profitMargin: number;
  fcr: number;
  feedCostPerKg: number;
  // New processing metrics
  dressingPercentage: number;
  costPerDressedKg: number;
  profitPerDressedKg: number;
  weightLossPercentage: number;
  totalProcessedBirds: number;
  totalDressedWeightKg: number;
  status: string;
  startDate: string;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export function useOverviewMetrics() {
  return useQuery<OverviewMetrics>({
    queryKey: ['reports', 'overview'],
    queryFn: async () => {
      const res = await fetch('/api/reports/overview');
      if (!res.ok) throw new Error('Failed to fetch overview');
      return res.json();
    },
  });
}

export function useBatchReport(batchId: string | null) {
  return useQuery<BatchReport>({
    queryKey: ['reports', 'batch', batchId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/batch/${batchId}`);
      if (!res.ok) throw new Error('Failed to fetch batch report');
      return res.json();
    },
    enabled: !!batchId,
  });
}

export function useExpenseBreakdown(batchId?: string) {
  return useQuery<ChartData[]>({
    queryKey: ['reports', 'expenses', batchId],
    queryFn: async () => {
      const url = new URL('/api/reports/expenses', window.location.origin);
      if (batchId) url.searchParams.set('batchId', batchId);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch expenses');
      return res.json();
    },
  });
}

export function useRevenueBreakdown(batchId?: string) {
  return useQuery<ChartData[]>({
    queryKey: ['reports', 'revenue', batchId],
    queryFn: async () => {
      const url = new URL('/api/reports/revenue', window.location.origin);
      if (batchId) url.searchParams.set('batchId', batchId);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch revenue');
      return res.json();
    },
  });
}

