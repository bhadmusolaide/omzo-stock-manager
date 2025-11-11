import { useQuery } from '@tanstack/react-query';

interface OrderHistoryItem {
  id: string;
  order_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
}

export const useOrderHistory = (orderId: string | null) => {
  return useQuery<OrderHistoryItem[]>({
    queryKey: ['orderHistory', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const response = await fetch(`/api/orders/${orderId}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch order history');
      }
      return response.json();
    },
    enabled: !!orderId,
  });
};