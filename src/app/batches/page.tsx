'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import BatchStatusBadge from "@/components/ui/BatchStatusBadge";
import InsightBadges from "@/components/InsightBadges";
import Loading from "@/components/ui/Loading";
import AddBatchModal from "@/features/batches/components/AddBatchModal";
import EditBatchModal from "@/features/batches/components/EditBatchModal";
import ProcessingHistoryModal from "@/features/batches/components/ProcessingHistoryModal";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { formatCurrency } from "@/utils/currency";
import { useBatches, useDeleteBatch } from "@/features/batches/hooks/useBatches";
import { useUiStore } from "@/store/ui";
import { toast } from "@/store/toast";
import { RefreshCw } from "lucide-react";

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

export default function Batches() {
  const {
    addBatchOpen,
    setAddBatchOpen,
    editBatchOpen,
    editBatchId,
    setEditBatch,
    deleteBatchOpen,
    deleteBatchId,
    setDeleteBatch
  } = useUiStore();
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    page: 1,
    limit: 10,
  });

  const columns = [
    {
      key: "id",
      header: "ID",
      width: "120px",
      minWidth: "100px",
      maxWidth: "150px",
      truncate: true,
      render: (value: string) => (
        <span className="font-mono text-xs" title={value}>
          {value.substring(0, 8)}...
        </span>
      )
    },
    { key: "startDate", header: "Start Date", minWidth: "100px", render: (value: string) => new Date(value).toLocaleDateString() },
    { key: "name", header: "Batch Name", minWidth: "120px" },
    { key: "docPurchasedCount", header: "DOC Purchased", minWidth: "100px" },
    { key: "docFreeCount", header: "DOC Free", minWidth: "80px" },
    { key: "currentLive", header: "Live Count", minWidth: "90px" },
    { key: "totalMortality", header: "Mortality", minWidth: "80px" },
    { key: "effectiveUnitCost", header: "Unit Cost", minWidth: "100px", render: (value: number) => formatCurrency(value) },
    { key: "status", header: "Status", minWidth: "100px", render: (value: string) => <BatchStatusBadge status={value as Batch['status']} /> },
    {
      key: "actions",
      header: "Actions",
      width: "140px",
      minWidth: "140px",
      render: (_: unknown, row: Batch) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditBatch(true, row.id)}
            className="flex-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-300"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeleteClick(row.id)}
            className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border-red-200 dark:border-red-600 hover:border-red-300 dark:hover:border-red-500 transition-colors duration-300"
          >
            Delete
          </Button>
        </div>
      )
    },
    { key: "insights", header: "Insights", minWidth: "120px", render: (_: unknown, row: Batch) => <InsightBadges batchId={row.id} /> },
  ];

  const { data: batchesData, isLoading, error, refetch } = useBatches(pagination.page, pagination.limit);
  const batches = batchesData?.batches || batchesData || [];

  // Fetch processing events to calculate total processed birds
  const { data: processingData } = useQuery({
    queryKey: ['processing-events'],
    queryFn: async () => {
      const response = await fetch('/api/processing-events');
      if (!response.ok) throw new Error('Failed to fetch processing events');
      return response.json();
    },
  });

  // Calculate summary metrics
  const totalBatches = batches.length;
  const activeBatches = batches.filter((b: Batch) => b.status !== 'CLOSED').length;
  const totalBirds = batches.reduce((sum: number, b: Batch) => sum + (b.docPurchasedCount + b.docFreeCount), 0);
  const totalMortality = batches.reduce((sum: number, b: Batch) => sum + b.totalMortality, 0);
  const totalProcessed = processingData?.reduce((sum: number, p: { live_birds_processed: number }) => sum + p.live_birds_processed, 0) || 0;
  const remainingBirds = batches
    .filter((b: Batch) => b.status !== 'CLOSED')
    .reduce((sum: number, b: Batch) => sum + b.currentLive, 0);

  // Update pagination state when data changes
  useEffect(() => {
    if (batchesData && typeof batchesData === 'object' && 'currentPage' in batchesData) {
      setPagination(prev => ({
        ...prev,
        currentPage: batchesData.currentPage || 1,
        totalPages: batchesData.totalPages || 1,
        totalItems: batchesData.totalItems || batches.length,
      }));
    }
  }, [batchesData, batches.length]);
  const deleteBatchMutation = useDeleteBatch();

  const handleAddSuccess = () => {
    setAddBatchOpen(false);
    refetch();
  };

  const handleEditSuccess = () => {
    setEditBatch(false, null);
    refetch();
  };

  const handleDeleteConfirm = async () => {
    if (deleteBatchId) {
      try {
        await deleteBatchMutation.mutateAsync(deleteBatchId);
        toast.success('Batch deleted successfully');
        setDeleteBatch(false, null);
        refetch();
      } catch (error) {
        console.error('Failed to delete batch:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete batch';
        toast.error(errorMessage);
        setDeleteBatch(false, null);
      }
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page, currentPage: page }));
  };

  const handleDeleteCancel = () => {
    setDeleteBatch(false, null);
  };

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteBatch(true, id);
  }, [setDeleteBatch]);

  if (isLoading) {
    return <Loading text="Loading batches..." className="p-6" />;
  }

  if (error) {
    return <div className="p-6">Error loading batches</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 transition-colors duration-300">
       <div className="mb-8">
         <div className="flex justify-between items-start mb-2">
           <div>
             <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Chicken Batches</h1>
             <p className="text-gray-600 dark:text-slate-400 mt-1">Manage and track your poultry batches</p>
           </div>
           <div className="flex gap-3">
             <Button variant="outline" onClick={() => setIsHistoryModalOpen(true)} className="flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               Processing History
             </Button>
             <Button onClick={() => setAddBatchOpen(true)} className="flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
               </svg>
               Add New Batch
             </Button>
           </div>
         </div>

         {/* Summary Cards */}
         {batches && batches.length > 0 && (
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Batches</div>
               <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{totalBatches}</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Active Batches</div>
               <div className="text-2xl font-bold text-green-600 dark:text-green-400">{activeBatches}</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Birds</div>
               <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalBirds}</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Mortality</div>
               <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalMortality}</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Processing</div>
               <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                 {batches.filter((b: Batch) => b.status === 'PROCESSING').length}
               </div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Processed Birds</div>
               <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalProcessed}</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Remaining Birds</div>
               <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{remainingBirds}</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Closed Batches</div>
               <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                 {batches.filter((b: Batch) => b.status === 'CLOSED').length}
               </div>
             </div>
           </div>
         )}
       </div>
      <div className="bg-white dark:bg-slate-700 shadow-lg dark:shadow-slate-900/50 rounded-lg overflow-hidden transition-colors duration-300 border border-gray-200 dark:border-slate-600">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">All Batches</h2>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Manage and track your chicken batches</p>
        </div>
        <div className="p-6">
          <Table
            columns={columns}
            data={batches || []}
            configurable
            tableId="batches-main"
            pagination={{
              currentPage: pagination.currentPage,
              totalPages: pagination.totalPages,
              totalItems: pagination.totalItems,
              itemsPerPage: pagination.itemsPerPage,
              onPageChange: handlePageChange,
            }}
          />
        </div>
      </div>
      <AddBatchModal
        isOpen={addBatchOpen}
        onClose={() => setAddBatchOpen(false)}
        onSuccess={handleAddSuccess}
      />
      <EditBatchModal
        isOpen={editBatchOpen}
        onClose={() => setEditBatch(false, null)}
        onSuccess={handleEditSuccess}
        batchId={editBatchId}
      />
      <ConfirmModal
        isOpen={deleteBatchOpen}
        title="Delete Batch"
        message="Are you sure you want to delete this batch? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleteBatchMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
      <ProcessingHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
}