'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

const feedUsageSchema = z.object({
  feedId: z.string().min(1, 'Feed purchase is required'),
  kg: z.number().positive('KG must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

type FeedUsageFormData = z.infer<typeof feedUsageSchema>;

interface FeedUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchId: string;
}

interface FeedPurchase {
  id: string;
  feed_type: string;
  brand: string | null;
  kg: number;
  supplier: string | null;
  purchase_date: string;
  remaining_kg: number;
}

export default function FeedUsageModal({ isOpen, onClose, onSuccess, batchId }: FeedUsageModalProps) {
  const [feedPurchases, setFeedPurchases] = useState<FeedPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFeedRemainingKg, setSelectedFeedRemainingKg] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FeedUsageFormData>({
    resolver: zodResolver(feedUsageSchema),
  });

  const watchedFeedId = watch('feedId');

  useEffect(() => {
    if (watchedFeedId) {
      const selectedFeed = feedPurchases.find(feed => feed.id === watchedFeedId);
      setSelectedFeedRemainingKg(selectedFeed ? selectedFeed.remaining_kg : null);
    } else {
      setSelectedFeedRemainingKg(null);
    }
  }, [watchedFeedId, feedPurchases]);

  useEffect(() => {
    if (isOpen && batchId) {
      fetchFeedPurchases();
      reset();
      setSelectedFeedRemainingKg(null);
    }
  }, [isOpen, batchId, reset]);

  const fetchFeedPurchases = async () => {
    try {
      const response = await fetch(`/api/batches/${batchId}/feed-purchases`);
      if (response.ok) {
        const data: FeedPurchase[] = await response.json();
        setFeedPurchases(data.filter(feed => feed.remaining_kg > 0) || []);
      }
    } catch (error) {
      console.error('Error fetching feed purchases:', error);
    }
  };

  const onSubmit = async (data: FeedUsageFormData) => {
    if (selectedFeedRemainingKg !== null && data.kg > selectedFeedRemainingKg) {
      alert(`Cannot use more feed than available. Remaining: ${selectedFeedRemainingKg}kg`);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/feed-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          feedId: data.feedId,
          kg: data.kg,
          date: data.date,
          notes: data.notes,
        }),
      });

      if (response.ok) {
        reset();
        onClose();
        onSuccess();
      } else {
        const error = await response.json();
        console.error('Error recording feed usage:', error);
      }
    } catch (error) {
      console.error('Error recording feed usage:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Feed Usage">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Feed Purchase</label>
          <select
            {...register('feedId')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1e293b] text-[#f1f5f9]"
          >
            <option value="">Select feed purchase</option>
            {feedPurchases.map((feed) => (
              <option key={feed.id} value={feed.id}>
                {feed.feed_type} {feed.brand ? `(${feed.brand})` : ''} - {feed.remaining_kg}kg remaining from {feed.kg}kg purchased on {new Date(feed.purchase_date).toLocaleDateString()}
              </option>
            ))}
          </select>
          {errors.feedId && <p className="mt-1 text-sm text-red-600">{errors.feedId.message}</p>}
        </div>

        <Input
          label="KG Used"
          type="number"
          step="0.01"
          {...register('kg', { valueAsNumber: true })}
          error={errors.kg?.message}
        />

        <Input
          label="Date"
          type="date"
          {...register('date')}
          error={errors.date?.message}
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
          <Button type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="small" /> Recording...
              </span>
            ) : (
              'Record Usage'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}