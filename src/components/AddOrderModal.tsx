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
import logger from '@/lib/logger';

const orderItemSchema = z.object({
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
  orderDate: z.string().min(1, 'Order date is required'),
  totalAmount: z.number().min(0, 'Total amount must be non-negative').optional(),
  amountPaid: z.number().min(0, 'Amount paid must be non-negative'),
  linkedBatchId: z.string().optional(),
  orderItems: z.array(orderItemSchema),
  notes: z.string().optional(),
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

interface DressedInventoryItem {
  id: string;
  productType: string;
  batchId: string | null;
  batchName: string;
  availableCount: number;
  availableWeightKg: number;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
  lowStock: boolean;
}

export default function AddOrderModal({ isOpen, onClose, onSuccess }: AddOrderModalProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<DressedInventoryItem[]>([]); // Add state for dynamic products
  const createOrder = useCreateOrder();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    control,
    watch,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    mode: "onChange",
    defaultValues: {
      orderItems: [{ productId: '', qtyCount: 0, qtyWeight: 0, unitPrice: 0, priceMode: 'COUNT' }],
      amountPaid: 0,
      orderDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'orderItems',
  });

  const orderItems = watch('orderItems') as OrderFormData['orderItems'];
  const linkedBatchId = watch('linkedBatchId');
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
      // Fetch all batches for the dropdown (no filtering)
      fetch('/api/batches')
        .then((response) => response.json())
        .then((data) => {
          const batchesArray = Array.isArray(data.batches) ? data.batches : Array.isArray(data) ? data : [];
          setBatches(batchesArray);
        })
        .catch((error) => logger.error('Error fetching batches:', error));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Fetch dressed inventory products
      fetch('/api/dressed_inventory')
        .then((response) => response.json())
        .then((data) => {
          // Create unique product list based on productType
          const inventoryItems: DressedInventoryItem[] = data.inventory || data;
          const uniqueProducts = Array.from(
            new Map(inventoryItems.map((item) => [item.productType, item])).values()
          ) as DressedInventoryItem[];
          setProducts(uniqueProducts);
        })
        .catch((error) => logger.error('Error fetching products:', error));
    }
  }, [isOpen]);

  const onSubmit = async (data: OrderFormData) => {
    try {
      const payload = {
        ...data,
        orderDate: data.orderDate,
        totalAmount,
      };
      await createOrder.mutateAsync(payload);
      reset();
      onClose();
      onSuccess();
    } catch (error) {
      logger.error('Error creating order:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Order">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Order Number"
          {...register('orderNumber')}
          error={errors.orderNumber?.message}
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
          label="Order Date"
          type="date"
          {...register('orderDate')}
          error={errors.orderDate?.message}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Linked Batch (Optional)</label>
          <select
            {...register('linkedBatchId')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-[#1e293b] text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select batch</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
        </div>

        {/* Order Items */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order Items</label>
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-300 dark:border-gray-600 p-4 rounded mb-2">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                  <select
                    {...register(`orderItems.${index}.productId`)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-[#1e293b] text-[#f1f5f9]"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.productType}>
                        {product.productType}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Qty Count</label>
                  <input
                    type="number"
                    {...register(`orderItems.${index}.qtyCount`, { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={orderItems[index]?.priceMode === 'KG'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Qty Weight</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`orderItems.${index}.qtyWeight`, { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={orderItems[index]?.priceMode === 'COUNT'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`orderItems.${index}.unitPrice`, { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Price Mode</label>
                  <select
                    {...register(`orderItems.${index}.priceMode`)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-[#1e293b] text-[#f1f5f9]"
                  >
                    <option value="COUNT">Count</option>
                    <option value="KG">KG</option>
                    <option value="COUNT_KG">Count+KG</option>
                  </select>
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Subtotal</label>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Amount</label>
          <p className="text-lg font-semibold">{formatCurrency(totalAmount)}</p>
        </div>

        <Input
          label="Amount Paid"
          type="number"
          step="0.01"
          {...register('amountPaid', { valueAsNumber: true })}
          error={errors.amountPaid?.message}
        />

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Any specific instructions or details for this order?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Status</label>
          <p className={`text-sm font-medium ${
            paymentStatus === 'PAID' ? 'text-green-600 dark:text-green-400' :
            paymentStatus === 'PARTIAL' ? 'text-yellow-600 dark:text-yellow-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {paymentStatus}
          </p>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createOrder.isPending || !isValid}>
            {createOrder.isPending ? 'Creating...' : 'Create Order'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}