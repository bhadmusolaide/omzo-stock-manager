import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

const fetchTransactions = async (params: any) => {
  const url = new URL('/api/transactions', window.location.origin);
  if (params.page) {
    url.searchParams.append('page', params.page.toString());
  }
  if (params.limit) {
    url.searchParams.append('limit', params.limit.toString());
  }
  Object.keys(params).forEach(key => {
    if (params[key] && key !== 'page' && key !== 'limit') url.searchParams.append(key, params[key]);
  });
  return apiClient.get(url.toString());
};

const createTransaction = async (data: any) => {
  return apiClient.post('/api/transactions', data);
};

const updateTransaction = async ({ id, data }: { id: string; data: any }) => {
  return apiClient.patch(`/api/transactions/${id}`, data);
};

const deleteTransaction = async (id: string) => {
  return apiClient.delete(`/api/transactions/${id}`);
};

export const useTransactions = (filters: any) => {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters),
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

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};