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
  outstandingOrderBalance: number;
  totalEstDailyFeedKg?: number;
}

export interface FeedBorrowMetrics {
  lent: { kg: number; value: number };
  borrowed: { kg: number; value: number };
  netPosition: number;
  netValue: number;
}

export interface BatchReport {
  id: string;
  name: string;
  totalBirds: number;
  mortalityCount: number;
  mortalityPercent: number;
  currentLive: number;
  totalFeedKg: number;
  feedConsumedKg: number;
  totalFeedCost: number;
  docCost: number;
  miscExpenses: number;
  totalExpenses: number;
  totalRevenue: number;
  profit: number;
  profitMargin: number;
  fcr: number;
  feedCostPerKg: number;
  // Processing metrics
  dressingPercentage: number;
  costPerDressedKg: number;
  profitPerDressedKg: number;
  weightLossPercentage: number;
  totalProcessedBirds: number;
  totalDressedWeightKg: number;
  status: string;
  startDate: string;
  // Feed borrow metrics
  feedBorrowMetrics?: FeedBorrowMetrics;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export function useOverviewMetrics(activeOnly: boolean = false) {
  return useQuery<OverviewMetrics>({
    queryKey: ['reports', 'overview', activeOnly],
    queryFn: async () => {
      const res = await fetch(`/api/reports/overview?activeOnly=${activeOnly}`);
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

export interface OrderTypeRevenue extends ChartData {
  type: 'LIVE' | 'DRESSED';
  count: number;
}

export interface ComplimentaryStats {
  orderCount: number;
  totalValue: number;
  liveCount: number;
  dressedCount: number;
}

export interface RevenueData {
  byProduct: ChartData[];
  byOrderType: OrderTypeRevenue[];
  complimentary?: ComplimentaryStats;
  data: ChartData[];
}

export function useRevenueBreakdown(batchId?: string) {
  return useQuery<RevenueData>({
    queryKey: ['reports', 'revenue', batchId],
    queryFn: async () => {
      const url = new URL('/api/reports/revenue', window.location.origin);
      if (batchId) url.searchParams.set('batchId', batchId);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch revenue');
      const data = await res.json();
      // Handle backward compatibility - if response is an array, wrap it
      if (Array.isArray(data)) {
        return {
          byProduct: data,
          byOrderType: [],
          data: data,
        };
      }
      return data;
    },
  });
}

