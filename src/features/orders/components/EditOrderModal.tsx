'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useUpdateOrder } from '@/hooks/useOrders';
import { formatCurrency } from '@/utils/currency';

const orderItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, 'Product is required'),
  qtyCount: z.number().int().min(0),
  qtyWeight: z.number().min(0),
  unitPrice: z.number().positive('Unit price must be greater than 0'),
  priceMode: z.enum(['COUNT', 'KG', 'COUNT_KG']),
});

const orderSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().optional(),
  location: z.string().optional(), // New location field
  orderDate: z.string().min(1, 'Order date is required'),
  totalAmount: z.number().min(0, 'Total amount must be non-negative').optional(),
  amountPaid: z.number().min(0, 'Amount paid must be non-negative'),
  linkedBatchId: z.string().optional(),
  orderItems: z.array(orderItemSchema),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderId: string | null;
}

interface Batch {
  id: string;
  name: string;
}

const products = [
  { id: '1', name: 'Whole Chicken' },
  { id: '2', name: 'Quarter Cuts' },
  { id: '3', name: 'Dog Food' },
  { id: '4', name: 'Neck' },
  { id: '5', name: 'Feet' },
  { id: '6', name: 'Gizzards' },
];

export default function EditOrderModal({ isOpen, onClose, onSuccess, orderId }: EditOrderModalProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [orderData, setOrderData] = useState<any>(null);
  const updateOrder = useUpdateOrder();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'orderItems',
  });

  const orderItems = watch('orderItems');
  const totalAmount = (orderItems || []).reduce((sum, item) => {
    const subtotal = item.priceMode === 'COUNT' ? item.qtyCount * item.unitPrice :
                      item.priceMode === 'KG' ? item.qtyWeight * item.unitPrice :
                      item.qtyWeight * item.unitPrice;
    return sum + subtotal;
  }, 0);

  const amountPaid = watch('amountPaid') || 0;
  const paymentStatus = amountPaid === 0 ? 'PENDING' :
                       amountPaid < totalAmount ? 'PARTIAL' : 'PAID';

  useEffect(() => {
    if (isOpen) {
      fetch('/api/batches')
        .then((response) => response.json())
        .then((data) => setBatches(Array.isArray(data) ? data : []))
        .catch((error) => console.error('Error fetching batches:', error));

      if (orderId) {
        fetch(`/api/orders/${orderId}`)
          .then((response) => response.json())
          .then((data) => {
            console.log('EditOrderModal received data:', data);
            if (!data) {
              console.error('No order data received');
              return;
            }
            setOrderData(data);
            reset({
              orderNumber: data.orderNumber || '',
              customerName: data.customerName || '',
              customerPhone: data.customerPhone || '',
              location: data.location || '',
              orderDate: data.orderDate ? data.orderDate.split('T')[0] : '',
              totalAmount: data.totalAmount || 0,
              amountPaid: data.amountPaid || 0,
              linkedBatchId: data.linkedBatchId || '',
              orderItems: (data.orderItems && data.orderItems.length > 0)
                ? data.orderItems.map((item: any) => ({
                    id: item.id,
                    productId: item.productId || '',
                    qtyCount: item.qtyCount || 0,
                    qtyWeight: item.qtyWeight || 0,
                    unitPrice: item.unitPrice || 0,
                    priceMode: item.priceMode || 'COUNT',
                  }))
                : [{ productId: '', qtyCount: 0, qtyWeight: 0, unitPrice: 0, priceMode: 'COUNT' }],
            });
          })
          .catch((error) => console.error('Error fetching order:', error));
      }
    }
  }, [isOpen, orderId, reset]);

  const onSubmit = async (data: OrderFormData) => {
    try {
      const payload = { ...data, totalAmount };
      await updateOrder.mutateAsync({ id: orderId!, data: payload });
      reset();
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  if (!orderData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Order">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Order Number"
            {...register('orderNumber')}
            error={errors.orderNumber?.message}
            readOnly
            className="bg-gray-100 cursor-not-allowed"
          />
          <Input
            label="Customer Name"
            {...register('customerName')}
            error={errors.customerName?.message}
          />
          <Input
            label="Customer Phone"
            {...register('customerPhone')}
            error={errors.customerPhone?.message}
          />
          <Input
            label="Location"
            {...register('location')}
            error={errors.location?.message}
          />
          <Input
            label="Order Date"
            type="date"
            {...register('orderDate')}
            error={errors.orderDate?.message}
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Batch (Optional)</label>
            <select
              {...register('linkedBatchId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1e293b] text-[#f1f5f9]"
            >
              <option value="">Select batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Order Items */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Order Items</label>
          {fields.map((field, index) => (
            <div key={field.id} className="border p-4 rounded mb-2">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                  <select
                    {...register(`orderItems.${index}.productId`)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-[#1e293b] text-[#f1f5f9]"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Qty Count</label>
                  <input
                    type="number"
                    {...register(`orderItems.${index}.qtyCount`, { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Qty Weight</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`orderItems.${index}.qtyWeight`, { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`orderItems.${index}.unitPrice`, { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price Mode</label>
                  <select
                    {...register(`orderItems.${index}.priceMode`)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-[#1e293b] text-[#f1f5f9]"
                  >
                    <option value="COUNT">Count</option>
                    <option value="KG">KG</option>
                    <option value="COUNT_KG">Count+KG</option>
                  </select>
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Subtotal</label>
                <p className="text-sm font-semibold">
                  {formatCurrency(
                    orderItems[index]?.priceMode === 'COUNT' ? (orderItems[index]?.qtyCount || 0) * (orderItems[index]?.unitPrice || 0) :
                    orderItems[index]?.priceMode === 'KG' ? (orderItems[index]?.qtyWeight || 0) * (orderItems[index]?.unitPrice || 0) :
                    (orderItems[index]?.qtyWeight || 0) * (orderItems[index]?.unitPrice || 0)
                  )}
                </p>
              </div>
              {fields.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => remove(index)}
                  className="mt-2"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            onClick={() => append({ productId: '', qtyCount: 0, qtyWeight: 0, unitPrice: 0, priceMode: 'COUNT' })}
          >
            Add Item
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Amount Paid"
            type="number"
            step="0.01"
            {...register('amountPaid', { valueAsNumber: true })}
            error={errors.amountPaid?.message}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <p className={`text-sm font-medium ${
              paymentStatus === 'PAID' ? 'text-green-600' :
              paymentStatus === 'PARTIAL' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {paymentStatus}
            </p>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4 my-4">
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium mb-1">Total Cost</p>
            <p className="text-green-400 text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateOrder.isPending}>
            {updateOrder.isPending ? 'Updating...' : 'Update Order'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}