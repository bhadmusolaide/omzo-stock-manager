'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useCreateTransaction } from '@/hooks/useTransactions';

const transactionSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  type: z.enum(['CREDIT', 'DEBIT']),
  category: z.enum(['DOC', 'FEED', 'ORDER', 'EXPENSE', 'OTHER']),
  linkedBatchId: z.string().optional(),
  linkedOrderId: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Batch {
  id: string;
  name: string;
}

interface Order {
  id: string;
  customerName: string;
}

export default function AddTransactionModal({ isOpen, onClose, onSuccess }: AddTransactionModalProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const createTransaction = useCreateTransaction();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    mode: "onChange",
  });

  const selectedCategory = watch('category');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/batches')
        .then((response) => response.json())
        .then((data) => {
          const batchesArray = data.batches || data;
          setBatches(Array.isArray(batchesArray) ? batchesArray : []);
        })
        .catch((error) => console.error('Error fetching batches:', error));

      fetch('/api/orders')
        .then((response) => response.json())
        .then((data) => {
          const ordersArray = data.orders || data;
          setOrders(Array.isArray(ordersArray) ? ordersArray : []);
        })
        .catch((error) => console.error('Error fetching orders:', error));

      reset({
        date: '',
        description: '',
        amount: 0,
        type: 'DEBIT',
        category: 'OTHER',
        linkedBatchId: '',
        linkedOrderId: '',
      });
    }
  }, [isOpen]);

  const onSubmit = async (data: TransactionFormData) => {
    try {
      await createTransaction.mutateAsync(data);
      reset();
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Transaction">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            {...register('date')}
            error={errors.date?.message}
          />
          <Input
            label="Description"
            {...register('description')}
            error={errors.description?.message}
          />
          <Input
            label="Amount"
            type="number"
            step="0.01"
            {...register('amount', { valueAsNumber: true })}
            error={errors.amount?.message}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              {...register('type')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1e293b] text-[#f1f5f9]"
            >
              <option value="">Select type</option>
              <option value="CREDIT">Credit (Income)</option>
              <option value="DEBIT">Debit (Expense)</option>
            </select>
            {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              {...register('category')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1e293b] text-[#f1f5f9]"
            >
              <option value="">Select category</option>
              <option value="DOC">DOC</option>
              <option value="FEED">Feed</option>
              <option value="ORDER">Order</option>
              <option value="EXPENSE">Expense</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Batch (Optional)</label>
            <select
              {...register('linkedBatchId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1e293b] text-[#f1f5f9]"
              disabled={selectedCategory !== 'FEED' && selectedCategory !== 'EXPENSE'}
            >
              <option value="">Select batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Order (Optional)</label>
            <select
              {...register('linkedOrderId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1e293b] text-[#f1f5f9]"
              disabled={selectedCategory !== 'ORDER'}
            >
              <option value="">Select order</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.customerName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTransaction.isPending || !isValid}>
            {createTransaction.isPending ? 'Creating...' : 'Create Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}