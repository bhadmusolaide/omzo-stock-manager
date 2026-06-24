import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

const fetchOrders = async (params: any) => {
  const url = new URL('/api/orders', window.location.origin);
  Object.keys(params).forEach(key => {
    if (params[key]) url.searchParams.append(key, params[key]);
  });
  return apiClient.get(url.toString());
};

const createOrder = async (data: any) => {
  return apiClient.post('/api/orders', data);
};

const updateOrder = async ({ id, data }: { id: string; data: any }) => {
  return apiClient.patch(`/api/orders/${id}`, data);
};

const deleteOrder = async (id: string) => {
  return apiClient.delete(`/api/orders/${id}`);
};

export const useOrders = (filters: any) => {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters),
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

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previousOrders = queryClient.getQueryData(['orders']);
      queryClient.setQueryData(['orders'], (old: any) => [...(old || []), newOrder]);
      return { previousOrders };
    },
    onError: (err, newOrder, context) => {
      queryClient.setQueryData(['orders'], context?.previousOrders);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOrder,
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previousOrders = queryClient.getQueryData(['orders']);
      queryClient.setQueryData(['orders'], (old: any) =>
        (old || []).map((order: any) =>
          order.id === id ? { ...order, ...data } : order
        )
      );
      return { previousOrders };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['orders'], context?.previousOrders);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOrder,
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previousOrders = queryClient.getQueryData(['orders']);
      queryClient.setQueryData(['orders'], (old: any) =>
        (old || []).filter((order: any) => order.id !== deletedId)
      );
      return { previousOrders };
    },
    onError: (err, deletedId, context) => {
      queryClient.setQueryData(['orders'], context?.previousOrders);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};