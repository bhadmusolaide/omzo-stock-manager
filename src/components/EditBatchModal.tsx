'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useUpdateBatch } from '@/hooks/useBatches';

const batchSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  docPurchasedCount: z.number().min(0, 'Must be non-negative'),
  docFreeCount: z.number().min(0, 'Must be non-negative'),
  totalDocCost: z.number().min(0, 'Must be non-negative'),
  status: z.enum(['BROODING', 'GROWING', 'PROCESSING', 'CLOSED']),
  currentLive: z.number().min(0, 'Must be non-negative'),
  totalMortality: z.number().min(0, 'Must be non-negative'),
  totalWeightKg: z.number().min(0, 'Must be non-negative'),
  notes: z.string().optional(),
});

type BatchFormData = z.infer<typeof batchSchema>;

interface EditBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchId: string | null;
}

export default function EditBatchModal({ isOpen, onClose, onSuccess, batchId }: EditBatchModalProps) {
  const updateBatch = useUpdateBatch();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
  });

  useEffect(() => {
    if (isOpen && batchId) {
      fetch(`/api/batches/${batchId}`)
        .then((response) => response.json())
        .then((data) => {
          reset({
            name: data.name,
            startDate: new Date(data.startDate).toISOString().split('T')[0],
            docPurchasedCount: data.docPurchasedCount,
            docFreeCount: data.docFreeCount,
            totalDocCost: data.totalDocCost,
            status: data.status,
            currentLive: data.currentLive,
            totalMortality: data.totalMortality,
            totalWeightKg: data.totalWeightKg,
            notes: data.notes || '',
          });
        })
        .catch((error) => console.error('Error fetching batch:', error));
    }
  }, [isOpen, batchId, reset]);

  const onSubmit = async (data: BatchFormData) => {
    if (!batchId) return;
    try {
      await updateBatch.mutateAsync({ id: batchId, data });
      reset();
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error updating batch:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Batch">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Batch Name"
          {...register('name')}
          error={errors.name?.message}
        />
        <Input
          label="Start Date"
          type="date"
          {...register('startDate')}
          error={errors.startDate?.message}
        />
        <Input
          label="DOC Purchased Count"
          type="number"
          {...register('docPurchasedCount', { valueAsNumber: true })}
          error={errors.docPurchasedCount?.message}
        />
        <Input
          label="DOC Free Count"
          type="number"
          {...register('docFreeCount', { valueAsNumber: true })}
          error={errors.docFreeCount?.message}
        />
        <Input
          label="Total DOC Cost"
          type="number"
          step="0.01"
          {...register('totalDocCost', { valueAsNumber: true })}
          error={errors.totalDocCost?.message}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            {...register('status')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1e293b] text-[#f1f5f9]"
          >
            <option value="BROODING">Brooding</option>
            <option value="GROWING">Growing</option>
            <option value="PROCESSING">Processing</option>
            <option value="CLOSED">Closed</option>
          </select>
          {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
        </div>
        <Input
          label="Current Live"
          type="number"
          {...register('currentLive', { valueAsNumber: true })}
          error={errors.currentLive?.message}
        />
        <Input
          label="Total Mortality"
          type="number"
          {...register('totalMortality', { valueAsNumber: true })}
          error={errors.totalMortality?.message}
        />
        <Input
          label="Total Weight (kg)"
          type="number"
          step="0.01"
          {...register('totalWeightKg', { valueAsNumber: true })}
          error={errors.totalWeightKg?.message}
        />
        <Input
          label="Notes"
          {...register('notes')}
          error={errors.notes?.message}
        />
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateBatch.isPending}>
            {updateBatch.isPending ? 'Updating...' : 'Update Batch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}