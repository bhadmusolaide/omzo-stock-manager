'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { formatCurrency } from '@/utils/currency';
import { useUpdateFeedPurchase } from '@/hooks/useFeed';

const feedPurchaseSchema = z.object({
  batchId: z.string().min(1, 'Batch is required'),
  feedType: z.enum(['STARTER', 'GROWER', 'FINISHER']),
  brand: z.enum(['Ultima +', 'BreedWell', 'New Hope', 'Happy Chicken', 'Chikum', 'TopFeeds']).optional(),
  kg: z.number().positive('KG must be greater than 0'),
  bagCost: z.number().positive('Bag cost must be greater than 0'),
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
  brand: string | null;
  kg: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  supplier: string | null;
  purchase_date: string | null;
  notes: string | null;
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
    formState: { errors },
    reset,
    watch,
  } = useForm<FeedPurchaseFormData>({
    resolver: zodResolver(feedPurchaseSchema),
  });

  const kg = Number(watch('kg') || 0);
  const bagCost = Number(watch('bagCost') || 0);
  const totalCost = kg / 25 * bagCost;

  useEffect(() => {
    if (isOpen) {
      fetch('/api/batches')
        .then((response) => response.json())
        .then((data) => {
          const batchesArray = data.batches || data;
          setBatches(Array.isArray(batchesArray) ? batchesArray : []);
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
          console.log('Raw API data:', data);
          let purchaseDateValue = '';
          if (data.purchase_date) {
            const date = new Date(data.purchase_date);
            console.log('Parsed date from', data.purchase_date, ':', date, 'isValid:', !isNaN(date.getTime()));
            if (!isNaN(date.getTime())) {
              try {
                purchaseDateValue = date.toISOString().split('T')[0];
              } catch (err) {
                console.error('Error calling toISOString on date:', date, 'Error:', err);
              }
            } else {
              console.error('Invalid date value from API:', data.purchase_date);
            }
          } else {
            console.log('No purchase_date in API data');
          }
      
          const safeKg = Number(data.kg ?? 0);
          const safeBagCost = Number(data.unit_cost ?? 0);
          const safeFeedType = data.feed_type || 'STARTER';
          const safeBatchId = data.batch_id || '';
          const safeBrand = data.brand as 'Ultima +' | 'BreedWell' | 'New Hope' | 'Happy Chicken' | 'Chikum' | 'TopFeeds' | undefined;
      
          console.log('Safe values - batchId:', safeBatchId, 'feedType:', safeFeedType, 'kg:', safeKg, 'bagCost:', safeBagCost, 'brand:', safeBrand);
      
          reset({
            batchId: safeBatchId,
            feedType: safeFeedType,
            kg: safeKg,
            bagCost: safeBagCost,
            brand: safeBrand,
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
        <div className="flex items-center justify-center p-8">
          <Loading size="medium" text="Loading feed purchase..." />
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Feed Purchase">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
            <select
              {...register('batchId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1e293b] text-[#f1f5f9]"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1e293b] text-[#f1f5f9]"
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
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <select
              {...register('brand')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1e293b] text-[#f1f5f9]"
            >
              <option value="">Select brand (optional)</option>
              <option value="Ultima +">Ultima +</option>
              <option value="BreedWell">BreedWell</option>
              <option value="New Hope">New Hope</option>
              <option value="Happy Chicken">Happy Chicken</option>
              <option value="Chikum">Chikum</option>
              <option value="TopFeeds">TopFeeds</option>
            </select>
            {errors.brand && <p className="mt-1 text-sm text-red-600">{errors.brand.message}</p>}
          </div>
          <Input
            label="Bag Cost"
            type="number"
            step="0.01"
            {...register('bagCost', { valueAsNumber: true })}
            error={errors.bagCost?.message}
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
            <p className="text-lg font-semibold">{formatCurrency(totalCost)}</p>
          </div>
          <Input
            label="Supplier"
            {...register('supplier')}
            error={errors.supplier?.message}
          />
          <Input
            label="Purchase Date"
            type="date"
            {...register('purchaseDate')}
            error={errors.purchaseDate?.message}
          />
        </div>
        <Input
          label="Notes"
          {...register('notes')}
          error={errors.notes?.message}
        />
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateFeedPurchase.isPending}>
            {updateFeedPurchase.isPending ? 'Updating...' : 'Update Feed Purchase'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

