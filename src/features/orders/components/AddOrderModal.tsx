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

// Order item schema - lenient for both LIVE and DRESSED (validation done in onSubmit)
const orderItemSchema = z.object({
  productId: z.string().optional(),
  qtyCount: z.number().int().min(0),
  qtyWeight: z.number().min(0),
  unitPrice: z.number().min(0),
  priceMode: z.enum(['COUNT', 'KG', 'COUNT_KG']),
});

// Base order schema - conditional validation handled in onSubmit
const baseOrderSchema = z.object({
  orderNumber: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().optional(),
  location: z.string().optional(),
  orderDate: z.string().min(1, 'Order date is required'),
  totalAmount: z.number().min(0, 'Total amount must be non-negative').optional(),
  amountPaid: z.number().min(0, 'Amount paid must be non-negative'),
  linkedBatchId: z.string().optional(),
  orderType: z.enum(['DRESSED', 'LIVE']).default('DRESSED'),
  orderItems: z.array(orderItemSchema),
  overrideValidation: z.boolean().optional(),
});

// Note: Conditional validation for LIVE orders (linkedBatchId required)
// is handled in onSubmit to avoid complex schema refinement issues

// Use input type from base schema to avoid refinement issues
type OrderFormData = z.input<typeof baseOrderSchema>;

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Batch {
  id: string;
  name: string;
  currentLive?: number;
  status?: string;
}

interface DressedInventoryItem {
  id: string;
  productType: string;
  batchId: string | null;
  batchName: string;
  availableCount: number;
  availableWeightKg: number;
  unitPrice: number;
}

export default function AddOrderModal({ isOpen, onClose, onSuccess }: AddOrderModalProps) {
  const [orderType, setOrderType] = useState<'DRESSED' | 'LIVE'>('DRESSED');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [liveBatches, setLiveBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<DressedInventoryItem[]>([]);
  const [batchInventory, setBatchInventory] = useState<Record<string, DressedInventoryItem[]>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const createOrder = useCreateOrder();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
    setValue,
  } = useForm<OrderFormData>({
    resolver: zodResolver(baseOrderSchema),
    defaultValues: {
      orderType: 'DRESSED',
      orderItems: [{ productId: '', qtyCount: 0, qtyWeight: 0, unitPrice: 0, priceMode: 'COUNT' }],
      amountPaid: 0,
    },
  });

  // Debug form errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Form validation errors:', errors);
    }
  }, [errors]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'orderItems',
  });

  const orderItems = watch('orderItems');
  const linkedBatchId = watch('linkedBatchId');

  // Calculate total amount based on order items
  const totalAmount = orderItems.reduce((sum, item) => {
    const subtotal = item.priceMode === 'COUNT' ? (item.qtyCount || 0) * (item.unitPrice || 0) :
                    item.priceMode === 'KG' ? (item.qtyWeight || 0) * (item.unitPrice || 0) :
                    (item.qtyWeight || 0) * (item.unitPrice || 0);
    return sum + subtotal;
  }, 0);

  const [isComplimentary, setIsComplimentary] = useState(false);
  const amountPaid = watch('amountPaid') || 0;
  const paymentStatus = isComplimentary ? 'COMPLIMENTARY' :
                       amountPaid === 0 ? 'PENDING' :
                       amountPaid < totalAmount ? 'PARTIAL' : 'PAID';

  // Get selected batch info for live chicken display
  const selectedBatch = orderType === 'LIVE'
    ? liveBatches.find(b => b.id === linkedBatchId)
    : null;

  useEffect(() => {
    if (isOpen) {
      // Fetch all batches for the dropdown
      fetch('/api/batches')
        .then((response) => response.json())
        .then(async (data) => {
          const batchesArray: Batch[] = Array.isArray(data.batches) ? data.batches : Array.isArray(data) ? data : [];

          // For DRESSED orders: Filter out closed batches with zero inventory
          const dressedBatches: Batch[] = [];
          // For LIVE orders: Filter batches with current_live > 0
          const batchesWithLive: Batch[] = [];

          for (const batch of batchesArray) {
            // Check for live birds availability (exclude closed batches)
            if (batch.currentLive && batch.currentLive > 0 && batch.status !== 'CLOSED') {
              batchesWithLive.push(batch);
            }

            // Check for dressed inventory availability
            if (batch.status !== 'CLOSED') {
              dressedBatches.push(batch);
            } else {
              // For closed batches, check if they have any inventory
              try {
                const inventoryResponse = await fetch(`/api/dressed_inventory?batchId=${batch.id}`);
                const inventoryData = await inventoryResponse.json();
                const inventoryItems = inventoryData.inventory || inventoryData;

                const hasInventory = inventoryItems.some((item: any) =>
                  (item.availableCount && item.availableCount > 0) ||
                  (item.availableWeightKg && item.availableWeightKg > 0)
                );

                if (hasInventory) {
                  dressedBatches.push(batch);
                }
              } catch (error) {
                console.error('Error checking inventory for batch:', batch.id, error);
              }
            }
          }

          setBatches(dressedBatches);
          setLiveBatches(batchesWithLive);
        })
        .catch((error) => console.error('Error fetching batches:', error));

      // Fetch dressed inventory products
      fetch('/api/dressed_inventory')
        .then((response) => response.json())
        .then((data) => {
          const inventoryItems: DressedInventoryItem[] = data.inventory || data;
          // Create unique product list based on productType
          const uniqueProducts = Array.from(
            new Map(inventoryItems.map((item) => [item.productType, item])).values()
          );
          setProducts(uniqueProducts);
        })
        .catch((error) => console.error('Error fetching products:', error));
    }
  }, [isOpen]);

  // Fetch batch-specific inventory when a batch is selected
  useEffect(() => {
    if (linkedBatchId) {
      fetch(`/api/dressed_inventory?batchId=${linkedBatchId}`)
        .then((response) => response.json())
        .then((data) => {
          const inventoryItems: DressedInventoryItem[] = data.inventory || data;
          setBatchInventory(prev => ({
            ...prev,
            [linkedBatchId]: inventoryItems
          }));
        })
        .catch((error) => console.error('Error fetching batch inventory:', error));
    }
  }, [linkedBatchId]);

  const getInventoryForProduct = (productType: string) => {
    if (!linkedBatchId) return null;
    const batchItems = batchInventory[linkedBatchId] || [];
    return batchItems.find(item => item.productType === productType) || null;
  };

  // Handle order type change
  const handleOrderTypeChange = (newType: 'DRESSED' | 'LIVE') => {
    setOrderType(newType);
    setValue('orderType', newType);
    setValue('linkedBatchId', '');
    // Reset order items with appropriate defaults
    if (newType === 'LIVE') {
      setValue('orderItems', [{ productId: 'Live Chicken', qtyCount: 1, qtyWeight: 0, unitPrice: 0, priceMode: 'COUNT' }]);
    } else {
      setValue('orderItems', [{ productId: '', qtyCount: 0, qtyWeight: 0, unitPrice: 0, priceMode: 'COUNT' }]);
    }
  };

  const onSubmit = async (data: OrderFormData) => {
    setErrorMessage('');

    // Validate live chicken order
    if (orderType === 'LIVE') {
      if (!data.linkedBatchId) {
        setErrorMessage('Batch is required for live chicken orders');
        return;
      }
      const requestedCount = data.orderItems[0]?.qtyCount || 0;
      if (requestedCount < 1) {
        setErrorMessage('At least 1 bird is required');
        return;
      }
      // Only validate price if not complimentary
      if (!isComplimentary) {
        const unitPrice = data.orderItems[0]?.unitPrice || 0;
        if (unitPrice <= 0) {
          setErrorMessage('Price per bird must be greater than 0');
          return;
        }
      }
      if (selectedBatch && requestedCount > (selectedBatch.currentLive || 0)) {
        setErrorMessage(`Cannot sell more than ${selectedBatch.currentLive} available live birds`);
        return;
      }
    }

    // Validate dressed order items (skip price check for complimentary)
    if (orderType === 'DRESSED') {
      for (const item of data.orderItems) {
        if (!item.productId) {
          setErrorMessage('Product is required for each order item');
          return;
        }
        if (!isComplimentary && item.unitPrice <= 0) {
          setErrorMessage('Unit price must be greater than 0');
          return;
        }
      }
    }

    try {
      // Remove orderNumber from payload since it's auto-generated
      const { orderNumber, ...payloadData } = data;

      // For live orders, set product name to "Live Chicken"
      const orderItems = orderType === 'LIVE'
        ? data.orderItems.map(item => ({ ...item, productId: 'Live Chicken' }))
        : data.orderItems;

      const payload = {
        ...payloadData,
        orderType,
        orderItems,
        totalAmount,
        // Include payment status for complimentary orders
        paymentStatus: isComplimentary ? 'COMPLIMENTARY' : undefined,
        amountPaid: isComplimentary ? 0 : data.amountPaid,
      };
      await createOrder.mutateAsync(payload);
      reset();
      setOrderType('DRESSED');
      setIsComplimentary(false);
      onClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating order:', error);
      setErrorMessage(error.message || 'Failed to create order');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Order">
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded">
          {errorMessage}
        </div>
      )}

      {/* Order Type Toggle */}
      <div className="flex mb-4 border-b border-gray-200 dark:border-gray-600">
        <button
          type="button"
          onClick={() => handleOrderTypeChange('DRESSED')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            orderType === 'DRESSED'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          🍗 Dressed Chicken
        </button>
        <button
          type="button"
          onClick={() => handleOrderTypeChange('LIVE')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            orderType === 'LIVE'
              ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          🐔 Live Chicken
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit, (formErrors) => {
        console.log('Form validation failed:', formErrors);
        // Show first error to user
        const firstError = Object.entries(formErrors)[0];
        if (firstError) {
          const [field, error] = firstError;
          const message = (error as any)?.message || (error as any)?.root?.message || `Validation failed for ${field}`;
          setErrorMessage(message);
        }
      })} className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {orderType === 'LIVE' ? 'Select Batch (Required)' : 'Linked Batch (Optional)'}
              {orderType === 'LIVE' && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              {...register('linkedBatchId')}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1e293b] text-[#f1f5f9] ${
                orderType === 'LIVE' && !linkedBatchId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Select batch</option>
              {(orderType === 'LIVE' ? liveBatches : batches).map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} {orderType === 'LIVE' && batch.currentLive ? `(${batch.currentLive} birds available)` : ''}
                </option>
              ))}
            </select>
            {orderType === 'LIVE' && selectedBatch && (
              <p className="text-sm text-green-500 mt-1">
                Available: {selectedBatch.currentLive} live birds
              </p>
            )}
            {orderType === 'LIVE' && liveBatches.length === 0 && (
              <p className="text-sm text-yellow-500 mt-1">
                No batches with live birds available
              </p>
            )}
          </div>
        </div>

        {/* Override validation toggle - integrated into the grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('overrideValidation')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Override inventory validation
            </label>
          </div>
        </div>

        {/* Order Items - Different UI for LIVE vs DRESSED */}
        {orderType === 'LIVE' ? (
          /* Live Chicken Order - Simplified single item */
          <div className="border border-green-500 dark:border-green-600 p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🐔</span>
              <h3 className="text-lg font-medium text-green-700 dark:text-green-400">Live Chicken Sale</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Number of Birds <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  {...register('orderItems.0.qtyCount', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-slate-800"
                />
                {selectedBatch && (
                  <p className="text-xs text-gray-500 mt-1">
                    Max: {selectedBatch.currentLive} birds
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price per Bird <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('orderItems.0.unitPrice', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtotal</label>
                <p className="text-lg font-bold text-green-600 dark:text-green-400 py-2">
                  {formatCurrency((orderItems[0]?.qtyCount || 0) * (orderItems[0]?.unitPrice || 0))}
                </p>
              </div>
            </div>
            {/* Hidden fields for live chicken - values set via setValue in handleOrderTypeChange */}
            <input type="hidden" {...register('orderItems.0.productId')} />
            <input type="hidden" {...register('orderItems.0.priceMode')} />
            <input type="hidden" {...register('orderItems.0.qtyWeight', { valueAsNumber: true })} />
          </div>
        ) : (
          /* Dressed Chicken Order - Multiple items */
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order Items</label>
            {fields.map((field, index) => {
              const selectedProductType = orderItems[index]?.productId;
              const inventory = selectedProductType ? getInventoryForProduct(selectedProductType) : null;

              return (
                <div key={field.id} className="border p-4 rounded mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                      <select
                        {...register(`orderItems.${index}.productId`)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-[#1e293b] text-[#f1f5f9]"
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.productType}>
                            {product.productType}
                          </option>
                        ))}
                      </select>
                      {inventory && (
                        <div className="text-xs text-gray-400 mt-1">
                          Available: {inventory.availableCount} count, {inventory.availableWeightKg.toFixed(2)} kg
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Qty Count</label>
                      <input
                        type="number"
                        {...register(`orderItems.${index}.qtyCount`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Qty Weight</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`orderItems.${index}.qtyWeight`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`orderItems.${index}.unitPrice`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Price Mode</label>
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
              );
            })}
            <Button
              type="button"
              size="sm"
              onClick={() => append({ productId: '', qtyCount: 0, qtyWeight: 0, unitPrice: 0, priceMode: 'COUNT' })}
            >
              Add Item
            </Button>
          </div>
        )}

        {/* Complimentary Order Checkbox */}
        <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <input
            type="checkbox"
            id="complimentary"
            checked={isComplimentary}
            onChange={(e) => {
              setIsComplimentary(e.target.checked);
              if (e.target.checked) {
                setValue('amountPaid', 0);
              }
            }}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <label htmlFor="complimentary" className="text-sm font-medium text-purple-800 dark:text-purple-200">
            🎁 Complimentary Order (Gift/Free)
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Amount Paid"
              type="number"
              step="0.01"
              disabled={isComplimentary}
              {...register('amountPaid', { valueAsNumber: true })}
              error={errors.amountPaid?.message}
            />
            {isComplimentary && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                Disabled for complimentary orders
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Status</label>
            <p className={`text-sm font-medium ${
              paymentStatus === 'COMPLIMENTARY' ? 'text-purple-500 dark:text-purple-400' :
              paymentStatus === 'PAID' ? 'text-green-400 dark:text-green-300' :
              paymentStatus === 'PARTIAL' ? 'text-yellow-400 dark:text-yellow-300' :
              'text-red-400 dark:text-red-300'
            }`}>
              {paymentStatus === 'COMPLIMENTARY' ? 'Compl.' : paymentStatus}
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