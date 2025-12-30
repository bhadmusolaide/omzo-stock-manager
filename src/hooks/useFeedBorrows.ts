import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface FeedBorrow {
  id: string;
  source_batch_id: string;
  target_batch_id: string;
  feed_purchase_id: string | null;
  feed_type: 'STARTER' | 'GROWER' | 'FINISHER';
  kg_borrowed: number;
  cost_value: number;
  borrow_date: string;
  status: 'PENDING' | 'SETTLED' | 'CANCELLED';
  settled_date: string | null;
  settled_method: 'RETURNED' | 'PURCHASED' | 'WRITTEN_OFF' | null;
  notes: string | null;
  source_batch?: { id: string; name: string };
  target_batch?: { id: string; name: string };
}

export interface CreateFeedBorrowData {
  sourceBatchId: string;
  targetBatchId: string;
  feedType: 'STARTER' | 'GROWER' | 'FINISHER';
  kg: number;
  feedPurchaseId?: string;
  notes?: string;
}

export interface SettleFeedBorrowData {
  id: string;
  action: 'settle' | 'cancel';
  settledMethod?: 'RETURNED' | 'PURCHASED' | 'WRITTEN_OFF';
}

const fetchFeedBorrows = async (batchId?: string, status?: string) => {
  const params = new URLSearchParams();
  if (batchId) params.append('batchId', batchId);
  if (status) params.append('status', status);
  return apiClient.get(`/api/feed-borrows?${params.toString()}`);
};

const fetchFeedBorrow = async (id: string) => {
  return apiClient.get(`/api/feed-borrows/${id}`);
};

const createFeedBorrow = async (data: CreateFeedBorrowData) => {
  return apiClient.post('/api/feed-borrows', data);
};

const updateFeedBorrow = async ({ id, ...data }: SettleFeedBorrowData) => {
  return apiClient.patch(`/api/feed-borrows/${id}`, data);
};

const deleteFeedBorrow = async (id: string) => {
  return apiClient.delete(`/api/feed-borrows/${id}`);
};

export const useFeedBorrows = (batchId?: string, status?: string) => {
  return useQuery({
    queryKey: ['feedBorrows', batchId, status],
    queryFn: () => fetchFeedBorrows(batchId, status),
    retry: (failureCount, error) => {
      if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
        if (error.status >= 400 && error.status < 500) {
          return false;
        }
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useFeedBorrow = (id: string) => {
  return useQuery({
    queryKey: ['feedBorrow', id],
    queryFn: () => fetchFeedBorrow(id),
    enabled: !!id,
  });
};

export const usePendingFeedBorrows = () => {
  return useFeedBorrows(undefined, 'PENDING');
};

export const useCreateFeedBorrow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFeedBorrow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedBorrows'] });
      queryClient.invalidateQueries({ queryKey: ['feedPurchases'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (error) => {
      console.error('Feed borrow creation error:', error);
    },
  });
};

export const useSettleFeedBorrow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFeedBorrow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedBorrows'] });
      queryClient.invalidateQueries({ queryKey: ['feedPurchases'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (error) => {
      console.error('Feed borrow settlement error:', error);
    },
  });
};

export const useCancelFeedBorrow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateFeedBorrow({ id, action: 'cancel' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedBorrows'] });
      queryClient.invalidateQueries({ queryKey: ['feedPurchases'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (error) => {
      console.error('Feed borrow cancellation error:', error);
    },
  });
};

export const useDeleteFeedBorrow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFeedBorrow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedBorrows'] });
    },
    onError: (error) => {
      console.error('Feed borrow deletion error:', error);
    },
  });
};

