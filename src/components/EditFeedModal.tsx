'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { formatCurrency } from '@/utils/currency';
import { useUpdateFeedPurchase } from '@/hooks/useFeed';

const feedPurchaseSchema = z.object({
  batchId: z.string().min(1, 'Batch is required'),
  feedType: z.enum(['STARTER', 'GROWER', 'FINISHER']),
  kg: z.number().positive('KG must be greater than 0'),
  unitCost: z.number().positive('Unit cost must be greater than 0'),
  supplier: z.string().optional(),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  notes: z.string().optional(),
});

type FeedPurchaseFormData = z.infer<typeof feedPurchaseSchema>;

interface EditFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  feedId: string | null;
}

interface Batch {
  id: string;
  name: string;
}

interface FeedPurchase {
  id: string;
  batch_id: string;
  feed_type: 'STARTER' | 'GROWER' | 'FINISHER' | null;
  kg: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  supplier?: string | null;
  purchase_date: string | null;
  notes?: string | null;
  batches: {
    id: string;
    name: string;
  };
}

export default function EditFeedModal({ isOpen, onClose, onSuccess, feedId }: EditFeedModalProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const updateFeedPurchase = useUpdateFeedPurchase();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<FeedPurchaseFormData>({
    resolver: zodResolver(feedPurchaseSchema),
  });

  const kg = Number(watch('kg') || 0);
  const unitCost = Number(watch('unitCost') || 0);
  const purchaseDate = watch('purchaseDate');
  const isPastDate = purchaseDate ? new Date(purchaseDate) < new Date() : false;
  const totalCost = kg * unitCost;

  useEffect(() => {
    if (isOpen) {
      fetch('/api/batches')
        .then((response) => response.json())
        .then((data) => {
          const batchesArray = Array.isArray(data.batches) ? data.batches : Array.isArray(data) ? data : [];
          setBatches(batchesArray);
        })
        .catch((error) => console.error('Error fetching batches:', error));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && feedId) {
      setLoading(true);
      fetch(`/api/feed/${feedId}`)
        .then((response) => response.json())
        .then((data: FeedPurchase) => {
          console.log('Raw data.purchase_date:', data.purchase_date, 'Type:', typeof data.purchase_date);
          let purchaseDateValue = '';
          if (data.purchase_date) {
              const date = new Date(data.purchase_date);
              if (!isNaN(date.getTime())) {
                purchaseDateValue = date.toISOString().split('T')[0];
              }
            }
          reset({
            batchId: data.batch_id,
            feedType: data.feed_type ?? undefined,
            kg: data.kg ?? 0,
            unitCost: data.unit_cost ?? 0,
            supplier: data.supplier || '',
            purchaseDate: purchaseDateValue,
            notes: data.notes || '',
          });
        })
        .catch((error) => console.error('Error fetching feed purchase:', error))
        .finally(() => setLoading(false));
    }
  }, [isOpen, feedId, reset]);

  const onSubmit = async (data: FeedPurchaseFormData) => {
    if (!feedId) return;
    try {
      await updateFeedPurchase.mutateAsync({ id: feedId, data });
      reset();
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error updating feed purchase:', error);
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Feed Purchase">
        <div className="p-4">
          <Skeleton height={20} width="60%" className="mb-4" />
          <Skeleton height={16} width="80%" className="mb-2" />
          <Skeleton height={16} width="90%" className="mb-2" />
          <Skeleton height={16} width="70%" className="mb-2" />
          <Skeleton height={16} width="85%" className="mb-2" />
          <Skeleton height={16} width="75%" className="mb-2" />
          <Skeleton height={16} width="80%" className="mb-2" />
          <Skeleton height={16} width="60%" className="mb-2" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Feed Purchase">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
          <select
            {...register('batchId')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isPastDate}
          >
            <option value="">Select a batch</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
          {errors.batchId && <p className="mt-1 text-sm text-red-600">{errors.batchId.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Feed Type</label>
          <select
            {...register('feedType')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isPastDate}
          >
            <option value="">Select feed type</option>
            <option value="STARTER">Starter</option>
            <option value="GROWER">Grower</option>
            <option value="FINISHER">Finisher</option>
          </select>
          {errors.feedType && <p className="mt-1 text-sm text-red-600">{errors.feedType.message}</p>}
        </div>
        <Input
          label="KG"
          type="number"
          step="0.01"
          {...register('kg', { valueAsNumber: true })}
          error={errors.kg?.message}
          readOnly={isPastDate}
        />
        <Input
          label="Unit Cost"
          type="number"
          step="0.01"
          {...register('unitCost', { valueAsNumber: true })}
          error={errors.unitCost?.message}
          readOnly={isPastDate}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
          <p className="text-lg font-semibold">{formatCurrency(totalCost)}</p>
        </div>
        <Input
          label="Supplier"
          {...register('supplier')}
          error={errors.supplier?.message}
          readOnly={isPastDate}
        />
        <Input
          label="Purchase Date"
          type="date"
          {...register('purchaseDate')}
          error={errors.purchaseDate?.message}
          readOnly={isPastDate}
        />
        <Input
          label="Notes"
          {...register('notes')}
          error={errors.notes?.message}
          readOnly={isPastDate}
        />
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateFeedPurchase.isPending || !isValid || isPastDate}>
            {updateFeedPurchase.isPending ? 'Updating...' : 'Update Feed Purchase'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}