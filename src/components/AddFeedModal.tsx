'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/utils/currency';
import { useCreateFeedPurchase } from '@/hooks/useFeed';

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

interface AddFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Batch {
  id: string;
  name: string;
}

export default function AddFeedModal({ isOpen, onClose, onSuccess }: AddFeedModalProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const createFeedPurchase = useCreateFeedPurchase();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<FeedPurchaseFormData>({
    resolver: zodResolver(feedPurchaseSchema),
    mode: "onChange",
  });

  const kg = watch('kg');
  const unitCost = watch('unitCost');
  const totalCost = (kg || 0) * (unitCost || 0);

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

  const onSubmit = async (data: FeedPurchaseFormData) => {
    try {
      await createFeedPurchase.mutateAsync(data);
      reset({
        batchId: '',
        feedType: 'STARTER',
        kg: 0,
        unitCost: 0,
        supplier: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error creating feed purchase:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Feed Purchase">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
          <select
            {...register('batchId')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        <Input
          label="Unit Cost"
          type="number"
          step="0.01"
          {...register('unitCost', { valueAsNumber: true })}
          error={errors.unitCost?.message}
        />
        <div>
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
        <Input
          label="Notes"
          {...register('notes')}
          error={errors.notes?.message}
          placeholder="Any specific details or observations about this feed purchase"
        />
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createFeedPurchase.isPending || !isValid}>
            {createFeedPurchase.isPending ? 'Creating...' : 'Create Feed Purchase'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}