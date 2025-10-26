'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useCreateOrder } from '@/hooks/useOrders';
import { formatCurrency } from '@/utils/currency';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  qtyCount: z.number().int().min(0),
  qtyWeight: z.number().min(0),
  unitPrice: z.number().positive('Unit price must be greater than 0'),
  priceMode: z.enum(['COUNT', 'KG', 'COUNT_KG']),
});

const orderSchema = z.object({
  orderNumber: z.string().optional(), // Removed required since it's auto-generated
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

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export default function AddOrderModal({ isOpen, onClose, onSuccess }: AddOrderModalProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const createOrder = useCreateOrder();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      orderItems: [{ productId: '', qtyCount: 0, qtyWeight: 0, unitPrice: 0, priceMode: 'COUNT' }],
      amountPaid: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'orderItems',
  });

  const orderItems = watch('orderItems');
  const totalAmount = orderItems.reduce((sum, item) => {
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
    }
  }, [isOpen]);

  const onSubmit = async (data: OrderFormData) => {
    try {
      // Remove orderNumber from payload since it's auto-generated
      const { orderNumber, ...payloadData } = data;
      const payload = { ...payloadData, totalAmount };
      await createOrder.mutateAsync(payload);
      reset();
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Order">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Button type="submit" disabled={createOrder.isPending}>
            {createOrder.isPending ? 'Creating...' : 'Create Order'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

