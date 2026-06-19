'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AddOrderModal from "@/features/orders/components/AddOrderModal";
import EditOrderModal from "@/features/orders/components/EditOrderModal";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import InsightBadges from "@/components/InsightBadges";
import { useUiStore } from "@/store/ui";
import { formatCurrency } from "@/utils/currency";
import { useDeleteOrder } from "@/hooks/useOrders";
import { toast } from "@/store/toast";
import { Skeleton } from '@/components/common/Skeleton';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  location?: string | null;
  orderDate: string | null;
  totalAmount: number | null;
  amountPaid: number | null;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | null;
  orderType?: 'DRESSED' | 'LIVE' | null; // New: order type
  linkedBatchId?: string | null;
  batchName?: string | null;
  batches?: {
    id: string;
    name: string;
  } | null;
  orderItems: {
    id: string;
    productId: string;
    qtyCount: number | null;
    qtyWeight: number | null;
    unitPrice: number | null;
    priceMode: 'COUNT' | 'KG' | 'COUNT_KG' | null;
    subtotal: number | null;
    itemType?: 'DRESSED' | 'LIVE' | null;
  }[] | null;
}



export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [activeTab, setActiveTab] = useState('orders');
  const {
    addOrderOpen,
    setAddOrderOpen,
    editOrderOpen,
    editOrderId,
    setEditOrder,
    deleteOrderOpen,
    deleteOrderId,
    setDeleteOrder
  } = useUiStore();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    batchId: '',
    search: '',
    orderType: '',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const deleteOrderMutation = useDeleteOrder();

  const fetchOrders = async (page = 1) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.batchId) params.append('batchId', filters.batchId);
      if (filters.search) params.append('search', filters.search);
      if (filters.orderType) params.append('orderType', filters.orderType);
      params.append('page', page.toString());
      params.append('limit', pagination.itemsPerPage.toString());

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || data);
        setPagination(prev => ({
          ...prev,
          currentPage: data.currentPage || page,
          totalPages: data.totalPages || 1,
          totalItems: data.totalItems || (data.orders?.length || data.length),
        }));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
    fetch('/api/batches')
      .then((response) => response.json())
      .then((data) => {
        const batchesArray = Array.isArray(data.batches) ? data.batches : Array.isArray(data) ? data : [];
        setBatches(batchesArray);
      })
      .catch((error) => console.error('Error fetching batches:', error));
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddSuccess = () => {
    fetchOrders(pagination.currentPage);
    setAddOrderOpen(false);
  };

  const handleEditSuccess = () => {
    fetchOrders(pagination.currentPage);
    setEditOrder(false, null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteOrderId) {
      try {
        await deleteOrderMutation.mutateAsync(deleteOrderId);
        toast.success('Order deleted successfully');
        fetchOrders(pagination.currentPage); // Refresh the orders list
        setDeleteOrder(false, null);
      } catch (error) {
        console.error('Failed to delete order:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete order';
        toast.error(errorMessage);
        setDeleteOrder(false, null);
      }
    }
  };

  const handlePageChange = (page: number) => {
    fetchOrders(page);
  };

  const handleDeleteCancel = () => {
    setDeleteOrder(false, null);
  };

  const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.amountPaid) || 0), 0);
  const totalOutstanding = orders.reduce((sum, order) => sum + ((Number(order.totalAmount) || 0) - (Number(order.amountPaid) || 0)), 0);
  const totalOrderAmount = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);

  const columns = [
    { key: "orderNumber", header: "Order No", minWidth: "100px", maxWidth: "120px", truncate: true, render: (value: string | null) => value || 'N/A' },
    { key: "orderType", header: "Type", minWidth: "80px", render: (value: string | null) => {
      const type = value || 'DRESSED';
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 ${
          type === 'LIVE'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
        }`}>
          {type === 'LIVE' ? '🐔' : '🍗'} {type}
        </span>
      );
    } },
    { key: "batchName", header: "Batch", minWidth: "100px", render: (value: string | null) => value || 'N/A' },
    { key: "customerName", header: "Customer", minWidth: "120px", render: (value: string | null) => value || 'N/A' },
    { key: "orderDate", header: "Date", minWidth: "100px", render: (value: string | null) => {
      if (!value) return 'N/A';
      const date = new Date(value);
      return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Invalid Date';
    } },
    { key: "totalAmount", header: "Total", minWidth: "100px", render: (value: number | null) => formatCurrency(Number(value) || 0) },
    { key: "totalWeight", header: "Total Weight", minWidth: "100px", render: (_: unknown, row: Order) => {
      const totalWeight = row.orderItems?.reduce((sum, item) => sum + (item.qtyWeight || 0), 0) || 0;
      return `${totalWeight.toFixed(2)} kg`;
    } },
    { key: "amountPaid", header: "Paid", minWidth: "100px", render: (value: number | null) => formatCurrency(Number(value) || 0) },
    { key: "outstandingBalance", header: "Outstanding", minWidth: "100px", render: (_: unknown, row: Order) => {
      const outstanding = (Number(row.totalAmount) || 0) - (Number(row.amountPaid) || 0);
      return formatCurrency(Math.max(0, outstanding));
    } },
    { key: "paymentStatus", header: "Status", minWidth: "80px", render: (value: string | null) => {
      const status = value || 'PENDING';
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          status === 'COMPLIMENTARY' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400' :
          status === 'PAID' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
          status === 'PARTIAL' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
          'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
        }`}>
          {status === 'COMPLIMENTARY' ? '🎁 Compl.' : status}
        </span>
      );
    } },
    { key: "location", header: "Location", minWidth: "100px", render: (value: string | null) => value || 'N/A' },
    { key: "insights", header: "Insights", minWidth: "100px", render: (_: unknown, row: Order) => <InsightBadges orderId={row.id} /> },
    { key: "actions", header: "Actions", minWidth: "140px", render: (_: unknown, row: Order) => (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setEditOrder(true, row.id)}>Edit</Button>
        <Button
          size="sm"
          className="bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 dark:focus:ring-red-400 transition-colors duration-300"
          onClick={() => setDeleteOrder(true, row.id)}
        >
          Delete
        </Button>
      </div>
    ) },
  ];
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <Skeleton height={32} width="20%" />
          <Skeleton height={36} width="150px" />
        </div>
        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <Skeleton height={40} className="mb-2" />
          <Skeleton height={40} className="mb-2" />
          <Skeleton height={40} className="mb-2" />
          <Skeleton height={40} className="mb-2" />
          <Skeleton height={40} className="mb-2" />
          <Skeleton height={40} className="mb-2" />
        </div>
      </div>
    );
  }

  // Compute customer metrics
  const customerMetrics = orders.reduce((acc, order) => {
    const customerName = order.customerName || 'Unknown';
    if (!acc[customerName]) {
      acc[customerName] = {
        name: customerName,
        phone: order.customerPhone || null,
        totalOrders: 0,
        ltv: 0,
        avgOrderValue: 0,
        lastOrderDate: null,
        orders: []
      };
    }
    acc[customerName].totalOrders += 1;
    acc[customerName].ltv += Number(order.amountPaid || 0);
    acc[customerName].orders.push(order);
    const orderDate = order.orderDate ? new Date(order.orderDate) : null;
    if (!acc[customerName].lastOrderDate || (orderDate && orderDate > new Date(acc[customerName].lastOrderDate))) {
      acc[customerName].lastOrderDate = order.orderDate;
      acc[customerName].phone = order.customerPhone || acc[customerName].phone;
    }
    return acc;
  }, {} as Record<string, any>);

  const customers = Object.values(customerMetrics);
  customers.forEach(customer => {
    customer.avgOrderValue = customer.totalOrders > 0 ? customer.ltv / customer.totalOrders : 0;
  });

  const totalCustomers = customers.length;
  const totalLTV = customers.reduce((sum, customer) => sum + customer.ltv, 0);

  const customerColumns = [
    { key: "name", header: "Customer Name" },
    { key: "phone", header: "Phone", render: (value: string | null) => value || 'N/A' },
    { key: "totalOrders", header: "Total Orders" },
    { key: "ltv", header: "LTV", render: (value: number) => formatCurrency(value) },
    { key: "avgOrderValue", header: "Avg Order Value", render: (value: number) => formatCurrency(value) },
    { key: "lastOrderDate", header: "Last Order", render: (value: string | null) => {
      if (!value) return 'N/A';
      const date = new Date(value);
      return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Invalid Date';
    } },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 transition-colors duration-300">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Orders & Customers</h1>
        <Button onClick={() => setAddOrderOpen(true)}>Add New Order</Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-700 shadow rounded-lg p-4 mb-4 transition-colors duration-300">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Search"
            placeholder="Search customer"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Order Type</label>
            <select
              value={filters.orderType}
              onChange={(e) => handleFilterChange('orderType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
            >
              <option value="">All Types</option>
              <option value="LIVE">🐔 Live</option>
              <option value="DRESSED">🍗 Dressed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Payment Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="COMPLIMENTARY">🎁 Complimentary</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Batch</label>
            <select
              value={filters.batchId}
              onChange={(e) => handleFilterChange('batchId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
            >
              <option value="">All Batches</option>
              {(batches || []).map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg transition-colors duration-300">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Total Revenue</h3>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg transition-colors duration-300">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Outstanding</h3>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">{formatCurrency(totalOutstanding)}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg transition-colors duration-300">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Total Order Amount</h3>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(totalOrderAmount)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-700 shadow rounded-lg p-4 transition-colors duration-300">
            <Table
              columns={columns}
              data={orders}
              configurable
              tableId="orders-main"
              pagination={{
                currentPage: pagination.currentPage,
                totalPages: pagination.totalPages,
                totalItems: pagination.totalItems,
                itemsPerPage: pagination.itemsPerPage,
                onPageChange: handlePageChange,
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="customers">
          {/* Customer Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg transition-colors duration-300">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Total Customers</h3>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalCustomers}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-colors duration-300">
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">Total LTV</h3>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatCurrency(totalLTV)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-700 shadow rounded-lg p-4 transition-colors duration-300">
            <Table columns={customerColumns} data={customers} configurable tableId="orders-customers" />
          </div>
        </TabsContent>
      </Tabs>

      <AddOrderModal
        isOpen={addOrderOpen}
        onClose={() => setAddOrderOpen(false)}
        onSuccess={handleAddSuccess}
      />
      <EditOrderModal
        isOpen={editOrderOpen}
        onClose={() => setEditOrder(false, null)}
        onSuccess={handleEditSuccess}
        orderId={editOrderId}
      />
      <ConfirmModal
        isOpen={deleteOrderOpen}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleteOrderMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}