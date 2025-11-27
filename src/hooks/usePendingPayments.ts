import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface PendingOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  orderDate: string;
}

const fetchPendingPayments = async (): Promise<PendingOrder[]> => {
  // Fetch both PENDING and PARTIAL orders in a single request
  // This is more efficient and avoids potential race conditions
  const response = await apiClient.get('/api/orders');
  
  // Filter client-side to get only PENDING and PARTIAL orders
  const allOrders = response.orders || response;
  const pendingOrders = allOrders.filter((order: any) => 
    order.paymentStatus === 'PENDING' || order.paymentStatus === 'PARTIAL'
  );
  
  // Sort by order date (newest first)
  return pendingOrders.sort((a: any, b: any) => 
    new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );
};

export const usePendingPayments = () => {
  return useQuery<PendingOrder[]>({
    queryKey: ['pendingPayments'],
    queryFn: fetchPendingPayments,
    refetchInterval: 30000, // Refetch every 30 seconds
    // Add stale time to prevent too frequent refetching
    staleTime: 10000,
  });
};