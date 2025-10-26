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
import FeedUsageModal from '@/components/FeedUsageModal';
import { useUiStore } from '@/store/ui';
import { useBatches } from '@/features/batches/hooks/useBatches';
import { calculateEffectiveUnitCost } from '@/utils/calculations';
import { getTotalFeedPurchased, getTotalFeedUsed, getRemainingFeed } from '@/lib/services/feedService';
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
  const { data: allBatches } = useBatches();
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
  });
  const [newWeighing, setNewWeighing] = useState({
    takenAt: '',
    sampleCount: 1,
    avgWeightKg: 0,
    notes: '',
  });
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
      // Fetch feed statistics
      const [purchased, used, remaining] = await Promise.all([
        getTotalFeedPurchased(batchId),
        getTotalFeedUsed(batchId),
        getRemainingFeed(batchId),
      ]);

      setFeedStats({
        totalPurchased: purchased,
        totalUsed: used,
        remaining: remaining,
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{batch.name} Details</h1>
        <Button onClick={() => setEditBatch(true, batch.id)}>Edit Batch</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="feed">Feed Management</TabsTrigger>
          <TabsTrigger value="growth">Growth Tracking</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="flex justify-between border-t pt-2">
                  <span>Remaining:</span>
                  <span className={`font-semibold ${feedStats.remaining < 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {feedStats.remaining.toFixed(2)} kg
                  </span>
                </div>
                {feedStats.remaining < 10 && (
                  <p className="text-red-500 text-sm">⚠️ Low feed stock!</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="feed" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feed Management</CardTitle>
              <div className="flex justify-between">
                <p>Track feed consumption for this batch</p>
                <Button onClick={() => setShowFeedUsage(true)}>
                  Record Feed Usage
                </Button>
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
                      <tr key={usage.id}>
                        <td className="border p-2">{new Date(usage.date).toLocaleDateString()}</td>
                        <td className="border p-2">{usage.feed_purchases?.feed_type || 'N/A'}</td>
                        <td className="border p-2">{usage.feed_purchases?.brand || 'N/A'}</td>
                        <td className="border p-2">{usage.kg.toFixed(2)}</td>
                        <td className="border p-2">{usage.feed_purchases?.supplier || 'N/A'}</td>
                        <td className="border p-2">{usage.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No feed usage recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Growth Weighings</CardTitle>
              <div className="flex justify-between">
                <p>Total Weighings: {weighings.length}</p>
                <Button onClick={() => setShowAddWeighing(!showAddWeighing)}>
                  {showAddWeighing ? 'Cancel' : 'Add Weighing'}
                </Button>
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
                        <tr key={w.id}>
                          <td className="border p-2">{new Date(w.takenAt).toLocaleDateString()}</td>
                          <td className="border p-2">{w.sampleCount}</td>
                          <td className="border p-2">{w.avgWeightKg.toFixed(3)}</td>
                          <td className="border p-2">{w.totalSampleWeightKg.toFixed(3)}</td>
                          <td className="border p-2">{w.notes}</td>
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

        <TabsContent value="processing" className="mt-4">
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
