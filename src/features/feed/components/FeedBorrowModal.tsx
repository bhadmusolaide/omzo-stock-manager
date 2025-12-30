'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { useCreateFeedBorrow } from '@/hooks/useFeedBorrows';
import { useBatches } from '@/hooks/useBatches';
import { toast } from '@/store/toast';
import { formatCurrency } from '@/utils/currency';

const feedBorrowSchema = z.object({
  sourceBatchId: z.string().min(1, 'Source batch is required'),
  targetBatchId: z.string().min(1, 'Target batch is required'),
  feedType: z.enum(['STARTER', 'GROWER', 'FINISHER']),
  kg: z.number().positive('KG must be greater than 0'),
  notes: z.string().optional(),
}).refine((data) => data.sourceBatchId !== data.targetBatchId, {
  message: 'Source and target batches must be different',
  path: ['targetBatchId'],
});

type FeedBorrowFormData = z.infer<typeof feedBorrowSchema>;

interface FeedBorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedSourceBatchId?: string;
  preselectedTargetBatchId?: string;
}

interface Batch {
  id: string;
  name: string;
  status: string;
}

export default function FeedBorrowModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedSourceBatchId,
  preselectedTargetBatchId,
}: FeedBorrowModalProps) {
  const { data: batchesData, isLoading: batchesLoading } = useBatches();
  const batches: Batch[] = (batchesData?.batches || batchesData || [])
    .filter((b: Batch) => b.status !== 'CLOSED');
  const createFeedBorrow = useCreateFeedBorrow();
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [feedAvailability, setFeedAvailability] = useState<{
    byType: Record<string, { available: number; avgCostPerKg: number }>;
    totals: { available: number };
  } | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FeedBorrowFormData>({
    resolver: zodResolver(feedBorrowSchema),
    defaultValues: {
      sourceBatchId: preselectedSourceBatchId || '',
      targetBatchId: preselectedTargetBatchId || '',
      feedType: 'GROWER',
      kg: 0,
      notes: '',
    },
  });

  const watchedKg = watch('kg');
  const watchedSourceBatchId = watch('sourceBatchId');
  const watchedFeedType = watch('feedType');

  useEffect(() => {
    if (isOpen) {
      reset({
        sourceBatchId: preselectedSourceBatchId || '',
        targetBatchId: preselectedTargetBatchId || '',
        feedType: 'GROWER',
        kg: 0,
        notes: '',
      });
      setEstimatedCost(null);
      setFeedAvailability(null);
    }
  }, [isOpen, preselectedSourceBatchId, preselectedTargetBatchId, reset]);

  // Fetch feed availability when source batch changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (watchedSourceBatchId) {
        setLoadingAvailability(true);
        try {
          const res = await fetch(`/api/batches/${watchedSourceBatchId}/feed-availability`);
          if (res.ok) {
            const data = await res.json();
            setFeedAvailability(data);
          }
        } catch (err) {
          setFeedAvailability(null);
        } finally {
          setLoadingAvailability(false);
        }
      } else {
        setFeedAvailability(null);
      }
    };
    fetchAvailability();
  }, [watchedSourceBatchId]);

  // Calculate estimated cost when feed type or kg changes
  useEffect(() => {
    if (feedAvailability && watchedFeedType && watchedKg > 0) {
      const typeData = feedAvailability.byType[watchedFeedType];
      if (typeData) {
        setEstimatedCost(watchedKg * typeData.avgCostPerKg);
      }
    } else {
      setEstimatedCost(null);
    }
  }, [feedAvailability, watchedFeedType, watchedKg]);

  // Get available amount for the selected feed type
  const selectedFeedTypeAvailable = feedAvailability?.byType[watchedFeedType]?.available ?? null;

  const onSubmit = async (data: FeedBorrowFormData) => {
    try {
      await createFeedBorrow.mutateAsync(data);
      toast.success('Feed borrow recorded successfully');
      reset();
      onClose();
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record feed borrow';
      toast.error(message);
    }
  };

  if (batchesLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Borrow Feed Between Batches">
        <div className="flex items-center justify-center p-8">
          <Loading size="medium" text="Loading batches..." />
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Borrow Feed Between Batches">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Note:</strong> Borrowing feed transfers stock from the source batch to the target batch.
            The cost is calculated based on the source batch&apos;s average feed cost per kg.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source Batch (Lending)
            </label>
            <select
              {...register('sourceBatchId')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            >
              <option value="">Select source batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>{batch.name}</option>
              ))}
            </select>
            {errors.sourceBatchId && (
              <p className="mt-1 text-sm text-red-600">{errors.sourceBatchId.message}</p>
            )}

            {/* Feed Availability Display */}
            {watchedSourceBatchId && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-md border border-gray-200 dark:border-gray-600">
                {loadingAvailability ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Loading availability...</p>
                ) : feedAvailability ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Available Feed:</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className={`text-center p-1 rounded ${watchedFeedType === 'STARTER' ? 'bg-green-100 dark:bg-green-900/30' : ''}`}>
                        <span className="font-medium">Starter</span>
                        <br />
                        <span className={feedAvailability.byType.STARTER?.available > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {feedAvailability.byType.STARTER?.available.toFixed(1)} kg
                        </span>
                      </div>
                      <div className={`text-center p-1 rounded ${watchedFeedType === 'GROWER' ? 'bg-green-100 dark:bg-green-900/30' : ''}`}>
                        <span className="font-medium">Grower</span>
                        <br />
                        <span className={feedAvailability.byType.GROWER?.available > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {feedAvailability.byType.GROWER?.available.toFixed(1)} kg
                        </span>
                      </div>
                      <div className={`text-center p-1 rounded ${watchedFeedType === 'FINISHER' ? 'bg-green-100 dark:bg-green-900/30' : ''}`}>
                        <span className="font-medium">Finisher</span>
                        <br />
                        <span className={feedAvailability.byType.FINISHER?.available > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {feedAvailability.byType.FINISHER?.available.toFixed(1)} kg
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-red-500">Unable to load availability</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Batch (Borrowing)
            </label>
            <select
              {...register('targetBatchId')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            >
              <option value="">Select target batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>{batch.name}</option>
              ))}
            </select>
            {errors.targetBatchId && (
              <p className="mt-1 text-sm text-red-600">{errors.targetBatchId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Feed Type
            </label>
            <select
              {...register('feedType')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            >
              <option value="STARTER">Starter</option>
              <option value="GROWER">Grower</option>
              <option value="FINISHER">Finisher</option>
            </select>
            {errors.feedType && (
              <p className="mt-1 text-sm text-red-600">{errors.feedType.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (KG)
              {selectedFeedTypeAvailable !== null && (
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  (max: {selectedFeedTypeAvailable.toFixed(1)} kg)
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={selectedFeedTypeAvailable ?? undefined}
              {...register('kg', { valueAsNumber: true })}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 ${
                selectedFeedTypeAvailable !== null && watchedKg > selectedFeedTypeAvailable
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter amount in kg"
            />
            {errors.kg && (
              <p className="mt-1 text-sm text-red-600">{errors.kg.message}</p>
            )}
            {selectedFeedTypeAvailable !== null && watchedKg > selectedFeedTypeAvailable && (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Amount exceeds available stock ({selectedFeedTypeAvailable.toFixed(1)} kg)
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (Optional)
          </label>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            placeholder="Add any notes about this borrow..."
          />
        </div>

        {estimatedCost !== null && (
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Cost Value:</span>
              <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(estimatedCost)}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createFeedBorrow.isPending}>
            {createFeedBorrow.isPending ? 'Recording...' : 'Record Borrow'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

