import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

const fetchBatches = async () => {
  return apiClient.get('/api/batches');
};

const createBatch = async (data: Record<string, unknown>) => {
  return apiClient.post('/api/batches', data);
};

const updateBatch = async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
  return apiClient.patch(`/api/batches/${id}`, data);
};

const deleteBatch = async (id: string) => {
  return apiClient.delete(`/api/batches/${id}`);
};

// Hard delete function (permanently removes from database)
const hardDeleteBatch = async (id: string) => {
  const response = await fetch(`/api/batches/${id}?hard=true`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    let errorMessage = `Failed to hard delete batch: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
      if (errorData.message) {
        errorMessage = errorData.message;
      }
      if (errorData.details) {
        errorMessage += ` - ${errorData.details}`;
      }
    } catch {
      // Ignore JSON parsing errors, use default message
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

export const useBatches = () => {
  return useQuery({
    queryKey: ['batches'],
    queryFn: fetchBatches,
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

export const useCreateBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBatch,
    onSuccess: (newBatch) => {
      // Invalidate to ensure consistency on next fetch
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (error) => {
      console.error('Batch creation error:', error);
    },
  });
};

export const useUpdateBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
};

export const useDeleteBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (error) => {
      console.error('Batch deletion error:', error);
    },
  });
};

export const useHardDeleteBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hardDeleteBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
};