import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

const fetchFeedPurchases = async (batchId?: string, page?: number, limit?: number) => {
  const params = new URLSearchParams();
  if (batchId) {
    params.append('batchId', batchId);
  }
  if (page) {
    params.append('page', page.toString());
  }
  if (limit) {
    params.append('limit', limit.toString());
  }
  return apiClient.get(`/api/feed?${params.toString()}`);
};

const createFeedPurchase = async (data: any) => {
  return apiClient.post('/api/feed', data);
};

const updateFeedPurchase = async ({ id, data }: { id: string; data: any }) => {
  return apiClient.patch(`/api/feed/${id}`, data);
};

const deleteFeedPurchase = async (id: string) => {
  return apiClient.delete(`/api/feed/${id}`);
};

const fetchTotalFeedUsed = async () => {
  return apiClient.get('/api/feed-usage');
};

const fetchBatchFeedStats = async (batchId: string) => {
  return apiClient.get(`/api/batches/${batchId}/feed-stats`);
};

export const useFeedPurchases = (batchId?: string, page?: number, limit?: number) => {
  return useQuery({
    queryKey: ['feedPurchases', batchId, page, limit],
    queryFn: () => fetchFeedPurchases(batchId, page, limit),
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
        if (error.status >= 400 && error.status < 500) {
          return false;
        }
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useCreateFeedPurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFeedPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedPurchases'] });
      queryClient.invalidateQueries({ queryKey: ['totalFeedUsed'] });
      queryClient.invalidateQueries({ queryKey: ['batchFeedStats'] });
    },
  });
};

export const useUpdateFeedPurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFeedPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedPurchases'] });
      queryClient.invalidateQueries({ queryKey: ['totalFeedUsed'] });
      queryClient.invalidateQueries({ queryKey: ['batchFeedStats'] });
    },
  });
};

export const useDeleteFeedPurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFeedPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedPurchases'] });
      queryClient.invalidateQueries({ queryKey: ['totalFeedUsed'] });
      queryClient.invalidateQueries({ queryKey: ['batchFeedStats'] });
    },
  });
};

export const useTotalFeedUsed = () => {
  return useQuery({
    queryKey: ['totalFeedUsed'],
    queryFn: fetchTotalFeedUsed,
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

export const useBatchFeedStats = (batchId: string) => {
  return useQuery({
    queryKey: ['batchFeedStats', batchId],
    queryFn: () => fetchBatchFeedStats(batchId),
    enabled: !!batchId,
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