'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currency';
import BatchStatusBadge from '@/components/ui/BatchStatusBadge';
import Loading from '@/components/ui/Loading';
import EditBatchModal from '@/features/batches/components/EditBatchModal';
import ProcessingModal from '@/features/batches/components/ProcessingModal';
import ProcessingHistoryTable from '@/features/batches/components/ProcessingHistoryTable';
import FeedUsageModal from '@/components/FeedUsageModal';
import { BatchCalculator } from '@/features/calculator/components/BatchCalculator';
import { useUiStore } from '@/store/ui';
import { useBatches } from '@/features/batches/hooks/useBatches';
import { calculateEffectiveUnitCost, getEstimatedDailyFeedConsumption, getFeedProjections } from '@/utils/calculations';
import { getFeedBorrowStats } from '@/lib/services/feedService';
import logger from '@/lib/logger';

interface Weighing {
  id: string;
  takenAt: string;
  sampleCount: number;
  avgWeightKg: number;
  totalSampleWeightKg: number;
  notes?: string;
}

interface BatchDetail {
  id: string;
  name: string;
  startDate: string;
  docPurchasedCount: number;
  docFreeCount: number;
  effectiveUnitCost: number;
  status: string;
  currentLive: number;
  totalMortality: number;
  totalWeightKg: number;
  initialChickCount: number;
  totalDocCost: number;
  notes?: string;
}

interface FeedUsage {
  id: string;
  feed_id: string;
  kg: number;
  date: string;
  notes?: string;
  feed_purchases: {
    feed_type: string;
    brand: string | null;
    supplier: string | null;
  };
}

interface Settings {
  allocation_mode: 'per_bird' | 'per_kg';
}

export default function BatchDetail() {
  const params = useParams();
  const batchId = params.id as string;
  const { editBatchOpen, setEditBatch } = useUiStore();
  const { data: allBatchesData } = useBatches();
  const allBatches = allBatchesData?.batches || allBatchesData || [];
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddWeighing, setShowAddWeighing] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [showFeedUsage, setShowFeedUsage] = useState(false);
  const [feedUsages, setFeedUsages] = useState<FeedUsage[]>([]);
  const [feedStats, setFeedStats] = useState({
    totalPurchased: 0,
    totalUsed: 0,
    remaining: 0,
    lent: { kg: 0, value: 0, count: 0 },
    borrowed: { kg: 0, value: 0, count: 0 },
    netPosition: 0,
  });
  const [newWeighing, setNewWeighing] = useState({
    takenAt: '',
    sampleCount: 1,
    avgWeightKg: 0,
    notes: '',
  });
  const [editingWeighing, setEditingWeighing] = useState<Weighing | null>(null);
  const [editingFeedUsage, setEditingFeedUsage] = useState<FeedUsage | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      if (batchId && allBatches) {
        const foundBatch = allBatches.find((b: any) => b.id === batchId);
        if (foundBatch) {
          setBatch({
            ...foundBatch,
            initialChickCount: foundBatch.docPurchasedCount + foundBatch.docFreeCount,
            totalDocCost: foundBatch.totalDocCost || 0,
          });
        }
        await Promise.all([
          fetchWeighings(),
          fetchSettings(),
          fetchFeedData()
        ]);
        setLoading(false);
      }
    };
    fetchData();
  }, [batchId, allBatches]);

  const fetchWeighings = async () => {
    try {
      const response = await fetch(`/api/batches/${batchId}/weighings`);
      if (response.ok) {
        const data = await response.json();
        setWeighings(data.weighings || []);
      }
    } catch (err) {
      logger.error('Failed to fetch weighings:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      logger.error('Failed to fetch settings:', err);
    }
  };

  const fetchFeedData = async () => {
    if (!batchId) return;

    try {
      // Fetch feed statistics including borrow stats
      const [purchased, used, remaining, borrowStats] = await Promise.all([
        getTotalFeedPurchased(batchId),
        getTotalFeedUsed(batchId),
        getRemainingFeed(batchId),
        getFeedBorrowStats(batchId),
      ]);

      // Calculate net remaining: base remaining - lent out + borrowed in
      const netRemaining = remaining - borrowStats.lent.kg + borrowStats.borrowed.kg;

      setFeedStats({
        totalPurchased: purchased,
        totalUsed: used,
        remaining: netRemaining,
        lent: borrowStats.lent,
        borrowed: borrowStats.borrowed,
        netPosition: borrowStats.netPosition,
      });

      // Fetch feed usage records
      const response = await fetch(`/api/batches/${batchId}/feed-usages`);
      if (response.ok) {
        const data = await response.json();
        setFeedUsages(data || []);
      }
    } catch (err) {
      logger.error("Error fetching batch details:", err);
      // Set default values to prevent app crash
      setFeedStats({
        totalPurchased: 0,
        totalUsed: 0,
        remaining: 0,
        lent: { kg: 0, value: 0, count: 0 },
        borrowed: { kg: 0, value: 0, count: 0 },
        netPosition: 0,
      });
      setFeedUsages([]);
    }
  };

  // Safe versions of feed service functions with error handling
  const getTotalFeedPurchased = async (batchId: string): Promise<number> => {
    try {
      const response = await fetch(`/api/batches/${batchId}/feed-stats`);
      if (response.ok) {
        const data = await response.json();
        return data.purchased || 0;
      }
      return 0;
    } catch (err) {
      logger.error('Failed to fetch total feed purchased:', err);
      return 0;
    }
  };

  const getTotalFeedUsed = async (batchId: string): Promise<number> => {
    try {
      const response = await fetch(`/api/batches/${batchId}/feed-stats`);
      if (response.ok) {
        const data = await response.json();
        return data.used || 0;
      }
      return 0;
    } catch (err) {
      logger.error('Failed to fetch total feed used:', err);
      return 0;
    }
  };

  const getRemainingFeed = async (batchId: string): Promise<number> => {
    try {
      const response = await fetch(`/api/batches/${batchId}/feed-stats`);
      if (response.ok) {
        const data = await response.json();
        return data.remaining || 0;
      }
      return 0;
    } catch (err) {
      logger.error('Failed to fetch remaining feed:', err);
      return 0;
    }
  };

  const handleAddWeighing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/batches/${batchId}/weighings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWeighing),
      });
      if (response.ok) {
        setShowAddWeighing(false);
        setNewWeighing({ takenAt: '', sampleCount: 1, avgWeightKg: 0, notes: '' });
        fetchWeighings();
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to add weighing');
      }
    } catch (err) {
      logger.error('Failed to add weighing:', err);
    }
  };

  const handleEditWeighing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWeighing) return;

    try {
      const response = await fetch(`/api/batches/${batchId}/weighings/${editingWeighing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          takenAt: editingWeighing.takenAt,
          sampleCount: editingWeighing.sampleCount,
          avgWeightKg: editingWeighing.avgWeightKg,
          notes: editingWeighing.notes,
        }),
      });
      if (response.ok) {
        setEditingWeighing(null);
        fetchWeighings();
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to update weighing');
      }
    } catch (err) {
      logger.error('Failed to update weighing:', err);
    }
  };

  const handleDeleteWeighing = async (weighingId: string) => {
    if (!confirm('Are you sure you want to delete this weighing?')) return;

    try {
      const response = await fetch(`/api/batches/${batchId}/weighings/${weighingId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchWeighings();
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to delete weighing');
      }
    } catch (err) {
      logger.error('Failed to delete weighing:', err);
    }
  };

  const startEditing = (weighing: Weighing) => {
    setEditingWeighing({ ...weighing });
    setShowAddWeighing(false);
  };

  const cancelEditing = () => {
    setEditingWeighing(null);
  };

  const handleEditFeedUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeedUsage) return;

    try {
      const response = await fetch(`/api/batches/${batchId}/feed-usages/${editingFeedUsage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedId: editingFeedUsage.feed_id,
          kg: editingFeedUsage.kg,
          date: editingFeedUsage.date,
          notes: editingFeedUsage.notes,
        }),
      });
      if (response.ok) {
        setEditingFeedUsage(null);
        fetchFeedData();
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to update feed usage');
      }
    } catch (err) {
      logger.error('Failed to update feed usage:', err);
    }
  };

  const handleDeleteFeedUsage = async (feedUsageId: string) => {
    if (!confirm('Are you sure you want to delete this feed usage record?')) return;

    try {
      const response = await fetch(`/api/batches/${batchId}/feed-usages/${feedUsageId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchFeedData();
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to delete feed usage');
      }
    } catch (err) {
      logger.error('Failed to delete feed usage:', err);
    }
  };

  const startEditingFeedUsage = (feedUsage: FeedUsage) => {
    setEditingFeedUsage({ ...feedUsage });
  };

  const cancelEditingFeedUsage = () => {
    setEditingFeedUsage(null);
  };

  if (loading) return <Loading text="Loading batch details..." className="p-6" />;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!batch) return <div className="p-6">Batch not found</div>;

  // Simple line chart data
  const chartData = weighings
    .sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime())
    .map(w => ({
      date: new Date(w.takenAt).toLocaleDateString(),
      weight: w.avgWeightKg,
    }));

  const maxWeight = Math.max(...chartData.map(d => d.weight), 1);
  const chartWidth = 600;
  const chartHeight = 300;
  const padding = 50;

  const renderChart = () => {
    if (chartData.length < 2) return <p>No data for chart</p>;

    const points = chartData.map((d, i) => {
      const x = padding + (i / (chartData.length - 1)) * (chartWidth - 2 * padding);
      const y = chartHeight - padding - (d.weight / maxWeight) * (chartHeight - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={chartWidth} height={chartHeight} className="border">
        <polyline points={points} fill="none" stroke="blue" strokeWidth="2" />
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="gray" />
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="gray" />
        {chartData.map((d, i) => (
          <g key={i}>
            <circle cx={padding + (i / (chartData.length - 1)) * (chartWidth - 2 * padding)} cy={chartHeight - padding - (d.weight / maxWeight) * (chartHeight - 2 * padding)} r="3" fill="blue" />
            <text x={padding + (i / (chartData.length - 1)) * (chartWidth - 2 * padding)} y={chartHeight - padding + 15} textAnchor="middle" fontSize="10">{d.date}</text>
            <text x={padding - 10} y={chartHeight - padding - (d.weight / maxWeight) * (chartHeight - 2 * padding) + 3} textAnchor="end" fontSize="10">{d.weight.toFixed(2)}kg</text>
          </g>
        ))}
      </svg>
    );
  };

  // Estimated daily feed consumption based on currentLive and batch age
  const estimatedDailyFeed = batch && batch.currentLive > 0
    ? getEstimatedDailyFeedConsumption(batch)
    : null;

  // Feed projections to hit milestones
  const feedProjections = batch && batch.currentLive > 0 && estimatedDailyFeed
    ? getFeedProjections(estimatedDailyFeed.ageInDays, batch.currentLive)
    : [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{batch.name} Details</h1>
        <Button onClick={() => setEditBatch(true, batch.id)}>Edit Batch</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="feed">Feed Management</TabsTrigger>
          <TabsTrigger value="growth">Growth Tracking</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Batch Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div><strong>Status:</strong> <BatchStatusBadge status={batch.status as any} /></div>
                <div><strong>Start Date:</strong> {new Date(batch.startDate).toLocaleDateString()}</div>
                <div><strong>DOC Purchased:</strong> {batch.docPurchasedCount}</div>
                <div><strong>DOC Free:</strong> {batch.docFreeCount}</div>
                <div><strong>Current Live:</strong> {batch.currentLive}</div>
                <div><strong>Total Mortality:</strong> {batch.totalMortality}</div>
                <div><strong>Effective Unit Cost:</strong> {formatCurrency(batch.effectiveUnitCost)}</div>
                <div><strong>Total Weight (kg):</strong> {batch.totalWeightKg?.toFixed(2)}</div>
                {batch.notes && <div><strong>Notes:</strong> {batch.notes}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feed Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Purchased:</span>
                  <span className="font-semibold">{feedStats.totalPurchased.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Used:</span>
                  <span className="font-semibold">{feedStats.totalUsed.toFixed(2)} kg</span>
                </div>

                {/* Borrow section */}
                {(feedStats.lent.kg > 0 || feedStats.borrowed.kg > 0) && (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Inter-Batch Borrowing</span>
                    </div>
                    {feedStats.lent.kg > 0 && (
                      <div className="flex justify-between text-orange-600 dark:text-orange-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Lent Out ({feedStats.lent.count}):
                        </span>
                        <span className="font-semibold">-{feedStats.lent.kg.toFixed(2)} kg</span>
                      </div>
                    )}
                    {feedStats.borrowed.kg > 0 && (
                      <div className="flex justify-between text-blue-600 dark:text-blue-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          Borrowed In ({feedStats.borrowed.count}):
                        </span>
                        <span className="font-semibold">+{feedStats.borrowed.kg.toFixed(2)} kg</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between border-t pt-2">
                  <span>Available (Net):</span>
                  <span className={`font-semibold ${feedStats.remaining < 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {feedStats.remaining.toFixed(2)} kg
                  </span>
                </div>
                {feedStats.remaining < 10 && (
                  <p className="text-red-500 text-sm">⚠️ Low feed stock!</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Estimated Feed Consumption</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Based on Aviagen Arbor Acres 2022 Broiler Performance Objectives
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-end border-b pb-3">
                  <div>
                    <p className="text-sm text-gray-500">Age</p>
                    <p className="text-2xl font-bold">
                      {estimatedDailyFeed?.ageInDays ?? 0} <span className="text-sm font-normal">days</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Intake / bird</p>
                    <p className="text-2xl font-bold">
                      {estimatedDailyFeed?.intakeG ?? 0} <span className="text-sm font-normal">g</span>
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-end bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Est. Daily Consumption</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {estimatedDailyFeed?.estimatedConsumptionKg.toFixed(2) ?? '0.00'} <span className="text-sm font-normal">kg/day</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ({batch.currentLive} birds � {estimatedDailyFeed?.intakeG ?? 0} g/bird/day)
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 text-center">Source: Aviagen AA Broiler Performance Objectives 2022</p>
              </CardContent>
            </Card>
          </div>

          {feedProjections.length > 0 && feedProjections.some(p => !p.isReached) && (
            <Card className="mt-4 border-blue-100 dark:border-blue-900/50 shadow-sm">
              <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/50 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  Feed Projections
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Estimated feed needed from today to reach target age (25kg/bag)
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                  {feedProjections.map((proj, idx) => (
                    <div
                      key={proj.label}
                      className={`flex-1 relative rounded-xl border p-4 ${proj.isReached ? 'bg-gray-50 border-gray-200 dark:bg-slate-800/50 dark:border-slate-700 opacity-60' : 'bg-white border-blue-100 dark:bg-slate-800 dark:border-blue-900/50 shadow-sm'}`}
                    >
                      {/* Connection Line */}
                      {idx !== feedProjections.length - 1 && (
                        <div className="hidden md:block absolute top-1/2 -right-4 w-4 border-t-2 border-dashed border-gray-200 dark:border-slate-700 -translate-y-1/2 z-0"></div>
                      )}

                      <div className="relative z-10 flex flex-col items-center text-center space-y-2">
                        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${proj.isReached ? 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                          {proj.label}
                        </span>

                        {proj.isReached ? (
                          <p className="text-sm font-medium text-gray-500 py-2 mt-2">Milestone Reached</p>
                        ) : (
                          <>
                            <div className="flex items-baseline gap-1 pt-2">
                              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                {proj.bagsNeeded.toFixed(1)}
                              </span>
                              <span className="text-sm text-gray-500">bags</span>
                            </div>
                            <p className="text-sm font-medium text-gray-500">
                              {proj.kgNeeded.toFixed(1)} kg
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="feed" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feed Management</CardTitle>
              <div className="flex justify-between">
                <p>Track feed consumption for this batch</p>
                <div className="flex gap-2">
                  {editingFeedUsage && (
                    <Button variant="outline" onClick={cancelEditingFeedUsage}>
                      Cancel Edit
                    </Button>
                  )}
                  <Button onClick={() => setShowFeedUsage(true)}>
                    Record Feed Usage
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {feedUsages.length > 0 ? (
                <table className="w-full border-collapse border">
                  <thead>
                    <tr className="bg-[#1e293b] text-[#f1f5f9]">
                      <th className="border p-2">Date</th>
                      <th className="border p-2">Feed Type</th>
                      <th className="border p-2">Brand</th>
                      <th className="border p-2">KG Used</th>
                      <th className="border p-2">Supplier</th>
                      <th className="border p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedUsages.map((usage) => (
                      <tr key={usage.id} className="group relative hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <td className="border p-2">{new Date(usage.date).toLocaleDateString()}</td>
                        <td className="border p-2">{usage.feed_purchases?.feed_type || 'N/A'}</td>
                        <td className="border p-2">{usage.feed_purchases?.brand || 'N/A'}</td>
                        <td className="border p-2">{usage.kg.toFixed(2)}</td>
                        <td className="border p-2">{usage.feed_purchases?.supplier || 'N/A'}</td>
                        <td className="border p-2">
                          {usage.notes || '-'}
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm border border-gray-200 dark:border-slate-600 flex items-center gap-2 z-10 pointer-events-none group-hover:pointer-events-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditingFeedUsage(usage)}
                              className="text-xs h-7 px-2"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteFeedUsage(usage.id)}
                              className="text-xs h-7 px-2 text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No feed usage recorded yet.</p>
              )}
            </CardContent>
          </Card>
          {editingFeedUsage && (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleEditFeedUsage} className="space-y-2">
                  <h3 className="text-lg font-semibold">Edit Feed Usage</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      value={editingFeedUsage.date.split('T')[0]}
                      onChange={(e) => setEditingFeedUsage({ ...editingFeedUsage, date: e.target.value })}
                      placeholder="Date"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={editingFeedUsage.kg}
                      onChange={(e) => setEditingFeedUsage({ ...editingFeedUsage, kg: parseFloat(e.target.value) })}
                      placeholder="KG Used"
                      min="0"
                    />
                  </div>
                  <Input
                    value={editingFeedUsage.notes || ''}
                    onChange={(e) => setEditingFeedUsage({ ...editingFeedUsage, notes: e.target.value })}
                    placeholder="Notes"
                  />
                  <div className="flex gap-2">
                    <Button type="submit">Update Feed Usage</Button>
                    <Button type="button" variant="outline" onClick={cancelEditingFeedUsage}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="growth" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Growth Weighings</CardTitle>
              <div className="flex justify-between">
                <p>Total Weighings: {weighings.length}</p>
                <div className="flex gap-2">
                  {editingWeighing && (
                    <Button variant="outline" onClick={cancelEditing}>
                      Cancel Edit
                    </Button>
                  )}
                  <Button onClick={() => setShowAddWeighing(!showAddWeighing)}>
                    {showAddWeighing ? 'Cancel' : 'Add Weighing'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showAddWeighing && (
              <CardContent>
                <form onSubmit={handleAddWeighing} className="space-y-2">
                  <Input
                    type="date"
                    value={newWeighing.takenAt}
                    onChange={(e) => setNewWeighing({ ...newWeighing, takenAt: e.target.value })}
                    placeholder="Date"
                  />
                  <Input
                    type="number"
                    value={newWeighing.sampleCount}
                    onChange={(e) => setNewWeighing({ ...newWeighing, sampleCount: parseInt(e.target.value) })}
                    placeholder="Sample Count"
                    min="1"
                  />
                  <Input
                    type="number"
                    step="0.001"
                    value={newWeighing.avgWeightKg}
                    onChange={(e) => setNewWeighing({ ...newWeighing, avgWeightKg: parseFloat(e.target.value) })}
                    placeholder="Average Weight (kg)"
                    min="0"
                  />
                  <Input
                    value={newWeighing.notes}
                    onChange={(e) => setNewWeighing({ ...newWeighing, notes: e.target.value })}
                    placeholder="Notes"
                  />
                  <Button type="submit">Add Weighing</Button>
                </form>
              </CardContent>
            )}
            {editingWeighing && (
              <CardContent>
                <form onSubmit={handleEditWeighing} className="space-y-2">
                  <h3 className="text-lg font-semibold">Edit Weighing</h3>
                  <Input
                    type="date"
                    value={editingWeighing.takenAt.split('T')[0]}
                    onChange={(e) => setEditingWeighing({ ...editingWeighing, takenAt: e.target.value })}
                    placeholder="Date"
                  />
                  <Input
                    type="number"
                    value={editingWeighing.sampleCount}
                    onChange={(e) => setEditingWeighing({ ...editingWeighing, sampleCount: parseInt(e.target.value) })}
                    placeholder="Sample Count"
                    min="1"
                  />
                  <Input
                    type="number"
                    step="0.001"
                    value={editingWeighing.avgWeightKg}
                    onChange={(e) => setEditingWeighing({ ...editingWeighing, avgWeightKg: parseFloat(e.target.value) })}
                    placeholder="Average Weight (kg)"
                    min="0"
                  />
                  <Input
                    value={editingWeighing.notes || ''}
                    onChange={(e) => setEditingWeighing({ ...editingWeighing, notes: e.target.value })}
                    placeholder="Notes"
                  />
                  <div className="flex gap-2">
                    <Button type="submit">Update Weighing</Button>
                    <Button type="button" variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
            <CardContent>
              {weighings.length > 0 ? (
                <div className="space-y-4">
                  <div>{renderChart()}</div>
                  <table className="w-full border-collapse border">
                    <thead>
                      <tr className="bg-[#1e293b] text-[#f1f5f9]">
                        <th className="border p-2">Date</th>
                        <th className="border p-2">Sample Count</th>
                        <th className="border p-2">Avg Weight (kg)</th>
                        <th className="border p-2">Total Sample Weight (kg)</th>
                        <th className="border p-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weighings.map((w) => (
                        <tr key={w.id} className="group relative hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <td className="border p-2">{new Date(w.takenAt).toLocaleDateString()}</td>
                          <td className="border p-2">{w.sampleCount}</td>
                          <td className="border p-2">{w.avgWeightKg.toFixed(3)}</td>
                          <td className="border p-2">{w.totalSampleWeightKg.toFixed(3)}</td>
                          <td className="border p-2">
                            {w.notes}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm border border-gray-200 dark:border-slate-600 flex items-center gap-2 z-10 pointer-events-none group-hover:pointer-events-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(w)}
                                className="text-xs h-7 px-2"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteWeighing(w.id)}
                                className="text-xs h-7 px-2 text-red-600 hover:text-red-700"
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No weighings recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Processing</CardTitle>
              <p className="text-gray-600">Process live birds into dressed products</p>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowProcessing(true)} disabled={batch.currentLive <= 0 || !settings}>
                Process {batch.currentLive} Live Birds
              </Button>
              {batch.currentLive <= 0 && <p className="text-red-500 mt-2">No live birds available for processing.</p>}
              {!settings && <p className="text-yellow-500 mt-2">Settings not loaded. Allocation mode unavailable.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Processing History</CardTitle>
              <p className="text-gray-600 dark:text-slate-400">Past processing events for this batch</p>
            </CardHeader>
            <CardContent>
              <ProcessingHistoryTable batchId={batchId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator" className="mt-4">
          <BatchCalculator
            initialBirdCount={batch.docPurchasedCount + batch.docFreeCount}
            initialMortalityRate={batch.totalMortality > 0
              ? Math.round((batch.totalMortality / (batch.docPurchasedCount + batch.docFreeCount)) * 100 * 10) / 10
              : 5}
          />
        </TabsContent>
      </Tabs>

      <EditBatchModal
        isOpen={editBatchOpen}
        onClose={() => setEditBatch(false, null)}
        batchId={batchId}
        onSuccess={() => {
          // Refetch batch details if needed
          fetchWeighings();
        }}
      />

      {batch && settings && (
        <ProcessingModal
          isOpen={showProcessing}
          onClose={() => setShowProcessing(false)}
          onSuccess={() => {
            setShowProcessing(false);
            // Refresh batch data
            window.location.reload();
          }}
          batchId={batchId}
          currentLive={batch.currentLive}
          allocationMode={settings.allocation_mode}
          totalBatchCost={batch.totalDocCost}
          survivingBirds={batch.initialChickCount - batch.totalMortality}
          lastAvgWeightKg={weighings[0]?.avgWeightKg || 0}
        />
      )}

      {batch && (
        <FeedUsageModal
          isOpen={showFeedUsage}
          onClose={() => setShowFeedUsage(false)}
          onSuccess={() => {
            setShowFeedUsage(false);
            fetchFeedData();
          }}
          batchId={batchId}
        />
      )}
    </div>
  );
}
