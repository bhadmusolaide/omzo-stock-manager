import { createClientServiceRole } from '@/lib/supabase';

/**
 * Transaction Service - Handles transaction creation, aggregation, and audit tracking
 */

export interface TransactionAggregation {
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  byCategory: Record<string, number>;
}

/**
 * Create transaction with validation
 */
export async function createTransaction(
  data: {
    date: Date;
    description: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    category: string;
    linkedBatchId?: string;
    linkedOrderId?: string;
    linkedFeedId?: string;
  },
  userId?: string
) {
  const supabase = createClientServiceRole();

  // Validate amount
  if (data.amount <= 0) {
    throw new Error('Transaction amount must be positive');
  }

  // Validate linked records exist and are not deleted
  if (data.linkedBatchId) {
    const { data: batch, error } = await supabase
      .from('batches')
      .select('*')
      .eq('id', data.linkedBatchId)
      .single();

    if (error) throw error;

    if (!batch || batch.is_deleted) {
      throw new Error(`Batch ${data.linkedBatchId} not found or deleted`);
    }
  }

  if (data.linkedOrderId) {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', data.linkedOrderId)
      .single();

    if (error) throw error;

    if (!order || order.is_deleted) {
      throw new Error(`Order ${data.linkedOrderId} not found or deleted`);
    }
  }

  if (data.linkedFeedId) {
    const { data: feed, error } = await supabase
      .from('feed_purchases')
      .select('*')
      .eq('id', data.linkedFeedId)
      .single();

    if (error) throw error;

    if (!feed || feed.is_deleted) {
      throw new Error(`Feed purchase ${data.linkedFeedId} not found or deleted`);
    }
  }

  // Create transaction
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({
      date: data.date.toISOString(),
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category,
      linked_batch_id: data.linkedBatchId,
      linked_order_id: data.linkedOrderId,
      linked_feed_id: data.linkedFeedId,
      created_by: userId,
    })
    .select(`
      *,
      batches!linked_batch_id (
        id,
        name
      )
    `)
    .single();

  if (error) throw error;

  return transaction;
}

/**
 * Get transactions for batch with aggregation
 */
export async function getBatchTransactionAggregation(
  batchId: string
): Promise<TransactionAggregation> {
  const supabase = createClientServiceRole();

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('linked_batch_id', batchId)
    .eq('is_deleted', false);

  if (error) throw error;

  const totalIncome = transactions
    .filter((t: any) => t.type === 'CREDIT')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t: any) => t.type === 'DEBIT')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const profit = totalIncome - totalExpenses;

  // Group by category
  const byCategory: Record<string, number> = {};
  transactions.forEach((t: any) => {
    if (!byCategory[t.category]) {
      byCategory[t.category] = 0;
    }
    byCategory[t.category] += t.type === 'CREDIT' ? t.amount : -t.amount;
  });

  return {
    totalIncome,
    totalExpenses,
    profit,
    byCategory,
  };
}

/**
 * Get transactions for order
 */
export async function getOrderTransactions(orderId: string) {
  const supabase = createClientServiceRole();

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('linked_order_id', orderId)
    .eq('is_deleted', false)
    .order('date', { ascending: false });

  if (error) throw error;

  return transactions;
}

/**
 * Get transactions for date range
 */
export async function getTransactionsByDateRange(
  startDate: Date,
  endDate: Date,
  batchId?: string
) {
  const supabase = createClientServiceRole();

  let query = supabase
    .from('transactions')
    .select(`
      *,
      batches!linked_batch_id (
        id,
        name
      ),
      orders!linked_order_id (
        id,
        customer_name
      )
    `)
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString())
    .eq('is_deleted', false)
    .order('date', { ascending: false });

  if (batchId) {
    query = query.eq('linked_batch_id', batchId);
  }

  const { data: transactions, error } = await query;

  if (error) throw error;

  return transactions;
}

/**
 * Get transactions by category
 */
export async function getTransactionsByCategory(
  category: string,
  batchId?: string
) {
  const supabase = createClientServiceRole();

  let query = supabase
    .from('transactions')
    .select(`
      *,
      batches!linked_batch_id (
        id,
        name
      )
    `)
    .eq('category', category)
    .eq('is_deleted', false)
    .order('date', { ascending: false });

  if (batchId) {
    query = query.eq('linked_batch_id', batchId);
  }

  const { data: transactions, error } = await query;

  if (error) throw error;

  return transactions;
}

/**
 * Get overall financial summary
 */
export async function getFinancialSummary() {
  const supabase = createClientServiceRole();

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('is_deleted', false);

  if (error) throw error;

  const totalIncome = transactions
    .filter((t: any) => t.type === 'CREDIT')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t: any) => t.type === 'DEBIT')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const profit = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    profit,
    transactionCount: transactions.length,
  };
}

/**
 * Soft delete transaction
 */
export async function softDeleteTransaction(transactionId: string, userId?: string) {
  const supabase = createClientServiceRole();

  const { data: transaction, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (fetchError) throw fetchError;

  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  const { error } = await supabase
    .from('transactions')
    .update({ 
      is_deleted: true, 
      updated_by: userId 
    })
    .eq('id', transactionId);

  if (error) throw error;

  return transaction;
}
