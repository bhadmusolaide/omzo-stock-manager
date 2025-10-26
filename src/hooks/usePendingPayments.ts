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
  // Fetch both PENDING and PARTIAL orders
  const [pendingOrders, partialOrders] = await Promise.all([
    apiClient.get('/api/orders?status=PENDING'),
    apiClient.get('/api/orders?status=PARTIAL')
  ]);

  // Combine and sort by order date (newest first)
  const allOrders = [...pendingOrders, ...partialOrders];
  return allOrders.sort((a, b) => 
    new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );
};

export const usePendingPayments = () => {
  return useQuery<PendingOrder[]>({
    queryKey: ['pendingPayments'],
    queryFn: fetchPendingPayments,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};