'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useCreateBatch } from '@/hooks/useBatches';

const batchSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  docPurchasedCount: z.number().min(0, 'Must be non-negative'),
  docFreeCount: z.number().min(0, 'Must be non-negative'),
  totalDocCost: z.number().min(0, 'Must be non-negative'),
  status: z.enum(['BROODING', 'GROWING', 'PROCESSING', 'CLOSED']).optional(),
  notes: z.string().optional(),
});

type BatchFormData = z.infer<typeof batchSchema>;

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddBatchModal({ isOpen, onClose, onSuccess }: AddBatchModalProps) {
  const createBatch = useCreateBatch();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      status: 'BROODING', // Default status for new batches
    },
  });

  const status = watch('status');
  const isClosed = status === 'CLOSED';

  const onSubmit = async (data: BatchFormData) => {
    try {
      await createBatch.mutateAsync(data);
      reset({
        name: '',
        startDate: '',
        docPurchasedCount: 0,
        docFreeCount: 0,
        totalDocCost: 0,
        status: 'BROODING',
        notes: '',
      });
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error creating batch:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Batch">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1">
            <Input
              label="Batch Name"
              {...register('name')}
              error={errors.name?.message}
            />
          </div>
          <div className="col-span-1">
            <Input
              label="Start Date"
              type="date"
              {...register('startDate')}
              error={errors.startDate?.message}
            />
          </div>
          <div className="col-span-1">
            <Input
              label="DOC Purchased Count"
              type="number"
              {...register('docPurchasedCount', { valueAsNumber: true })}
              error={errors.docPurchasedCount?.message}
              readOnly={isClosed}
            />
          </div>
          <div className="col-span-1">
            <Input
              label="DOC Free Count"
              type="number"
              {...register('docFreeCount', { valueAsNumber: true })}
              error={errors.docFreeCount?.message}
              readOnly={isClosed}
            />
          </div>
          <div className="col-span-1">
            <Input
              label="Total DOC Cost"
              type="number"
              step="0.01"
              {...register('totalDocCost', { valueAsNumber: true })}
              error={errors.totalDocCost?.message}
              readOnly={isClosed}
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="BROODING">Brooding</option>
              <option value="GROWING">Growing</option>
              <option value="PROCESSING">Processing</option>
              <option value="CLOSED">Closed</option>
            </select>
            {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
          </div>
          <div className="col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Any additional notes for this batch?"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createBatch.isPending || !isValid}>
            {createBatch.isPending ? 'Creating...' : 'Create Batch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}