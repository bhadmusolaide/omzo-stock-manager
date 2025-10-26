'use client';

import { useState } from 'react';
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import FeedTypeBadge from "@/components/ui/FeedTypeBadge";
import Loading from "@/components/ui/Loading";
import AddFeedModal from "@/features/feed/components/AddFeedModal";
import EditFeedModal from "@/features/feed/components/EditFeedModal";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { formatCurrency } from "@/utils/currency";
import { useFeedPurchases, useDeleteFeedPurchase } from "@/features/feed/hooks/useFeed";
import { useUiStore } from "@/store/ui";
import { toast } from "@/store/toast";
import { useBatches } from "@/hooks/useBatches";

interface FeedPurchase {
  id: string;
  batch_id: string;
  feed_type: 'STARTER' | 'GROWER' | 'FINISHER' | null;
  brand: string | null;
  kg: number | null;
  bag_cost: number | null;
  total_cost: number | null;
  supplier: string | null;
  purchase_date: string | null;
  notes: string | null;
  batches: {
    id: string;
    name: string;
  };
}

interface Batch {
  id: string;
  name: string;
  startDate: string;
  docPurchasedCount: number;
  docFreeCount: number;
  effectiveUnitCost: number;
  status: 'BROODING' | 'GROWING' | 'PROCESSING' | 'CLOSED';
  currentLive: number;
  totalMortality: number;
  totalWeightKg: number;
  notes?: string;
}

export default function Feed() {
  const {
    addFeedOpen,
    setAddFeedOpen,
    editFeedOpen,
    editFeedId,
    setEditFeed,
    deleteFeedOpen,
    deleteFeedId,
    setDeleteFeed
  } = useUiStore();

  const [filters, setFilters] = useState({
    batchId: '',
  });

  const { data: feedPurchases, isLoading, error } = useFeedPurchases(filters.batchId);
  const { data: batches } = useBatches();
  const deleteFeedMutation = useDeleteFeedPurchase();

  const columns = [
    {
      key: "id",
      header: "ID",
      width: "100px",
      minWidth: "80px",
      maxWidth: "120px",
      truncate: true,
      render: (value: string) => (
        <span className="font-mono text-xs" title={value}>
          {value.substring(0, 8)}...
        </span>
      )
    },
    { key: "batches.name", header: "Batch Name", minWidth: "120px" },
    {
      key: "feed_type",
      header: "Feed Type",
      minWidth: "100px",
      render: (value: string | null) => value ? <FeedTypeBadge feedType={value as 'STARTER' | 'GROWER' | 'FINISHER'} /> : 'N/A'
    },
    { key: "brand", header: "Brand", minWidth: "100px", render: (value: string | null) => value || 'N/A' },
    { key: "kg", header: "KG", minWidth: "80px", render: (value: number | null) => value != null ? value.toFixed(2) : '0' },
    {
      key: "unit_cost",
      header: "Bag Cost",
      minWidth: "100px",
      render: (value: number | null) => value != null ? formatCurrency(value) : formatCurrency(0)
    },
    {
      key: "total_cost",
      header: "Total Cost",
      minWidth: "100px",
      render: (value: number | null) => value != null ? formatCurrency(value) : formatCurrency(0)
    },
    { key: "supplier", header: "Supplier", minWidth: "100px", render: (value: string | null) => value || 'N/A' },
    {
      key: "purchase_date",
      header: "Purchase Date",
      minWidth: "120px",
      render: (value: string | null) => {
        if (!value) return 'N/A';
        const date = new Date(value);
        return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Invalid Date';
      }
    },
    {
      key: "actions",
      header: "Actions",
      width: "140px",
      minWidth: "140px",
      render: (_: unknown, row: FeedPurchase) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditFeed(true, row.id)}
            className="flex-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-300"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeleteFeed(true, row.id)}
            className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border-red-200 dark:border-red-600 hover:border-red-300 dark:hover:border-red-500 transition-colors duration-300"
          >
            Delete
          </Button>
        </div>
      )
    },
  ];

  const handleAddSuccess = () => {
    setAddFeedOpen(false);
  };

  const handleEditSuccess = () => {
    setEditFeed(false, null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteFeedId) {
      try {
        await deleteFeedMutation.mutateAsync(deleteFeedId);
        toast.success('Feed purchase deleted successfully');
        setDeleteFeed(false, null);
      } catch (error) {
        console.error('Failed to delete feed purchase:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete feed purchase';
        toast.error(errorMessage);
        setDeleteFeed(false, null);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteFeed(false, null);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return <Loading text="Loading feed purchases..." className="p-6" />;
  }

  if (error) {
    return <div className="p-6">Error loading feed purchases</div>;
  }

  // Calculate feed metrics
  const totalFeedKg = feedPurchases?.reduce((sum: number, purchase: FeedPurchase) => sum + (purchase.kg || 0), 0) || 0;
  const totalFeedCost = feedPurchases?.reduce((sum: number, purchase: FeedPurchase) => sum + (purchase.total_cost || 0), 0) || 0;
  const avgCostPerKg = totalFeedKg > 0 ? totalFeedCost / totalFeedKg : 0;
  const feedTypes = [...new Set(feedPurchases?.map((p: FeedPurchase) => p.feed_type).filter(Boolean) || [])];

  return (
    <div className="max-w-7xl mx-auto p-6 transition-colors duration-300">
       <div className="mb-8">
         <div className="flex justify-between items-start mb-2">
           <div>
             <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Feed Purchases</h1>
             <p className="text-gray-600 dark:text-slate-400 mt-1">Track and manage all feed purchases and consumption</p>
           </div>
           <div className="flex gap-3">
             <Button onClick={() => setAddFeedOpen(true)} className="flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
               </svg>
               Add Feed Purchase
             </Button>
           </div>
         </div>

         {/* Filters */}
         <div className="bg-white dark:bg-slate-700 shadow rounded-lg p-4 mb-4 transition-colors duration-300">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Batch</label>
               <select
                 value={filters.batchId}
                 onChange={(e) => handleFilterChange('batchId', e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
               >
                 <option value="">All Batches</option>
                 {(batches || []).map((batch: Batch) => (
                   <option key={batch.id} value={batch.id}>
                     {batch.name}
                   </option>
                 ))}
               </select>
             </div>
           </div>
         </div>

         {/* Summary Cards */}
         {feedPurchases && feedPurchases.length > 0 && (
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Feed</div>
               <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalFeedKg.toFixed(1)} kg</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Cost</div>
               <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalFeedCost)}</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Avg Cost/kg</div>
               <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(avgCostPerKg)}</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Feed Types</div>
               <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{feedTypes.length}</div>
             </div>
           </div>
         )}
       </div>
      <div className="bg-white dark:bg-slate-700 shadow-lg dark:shadow-slate-900/50 rounded-lg overflow-hidden transition-colors duration-300">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Feed Purchases</h2>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Track all feed purchases and consumption</p>
        </div>
        <div className="p-6">
          <Table columns={columns} data={feedPurchases || []} />
        </div>
      </div>
      <AddFeedModal
        isOpen={addFeedOpen}
        onClose={() => setAddFeedOpen(false)}
        onSuccess={handleAddSuccess}
      />
      <EditFeedModal
        isOpen={editFeedOpen}
        onClose={() => setEditFeed(false, null)}
        onSuccess={handleEditSuccess}
        feedId={editFeedId}
      />
      <ConfirmModal
        isOpen={deleteFeedOpen}
        title="Delete Feed Purchase"
        message="Are you sure you want to delete this feed purchase? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleteFeedMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}