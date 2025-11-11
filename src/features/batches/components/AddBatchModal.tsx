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
    formState: { errors },
    reset,
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
  });

  const onSubmit = async (data: BatchFormData) => {
    try {
      await createBatch.mutateAsync(data);
      reset();
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
          <div className="space-y-4">
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
              label="Notes"
              {...register('notes')}
              error={errors.notes?.message}
            />
          </div>
          <div className="space-y-4">
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
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createBatch.isPending}>
            {createBatch.isPending ? 'Creating...' : 'Create Batch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

