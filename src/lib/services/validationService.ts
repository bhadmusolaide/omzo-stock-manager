import { createClientServiceRole } from '@/lib/supabase';

/**
 * Validation Service - Handles business logic validation and consistency checks
 */

/**
 * Validate batch exists and is not deleted
 */
export async function validateBatchExists(batchId: string) {
  const supabase = createClientServiceRole();
  const { data: batch, error } = await supabase.from('batches').select('*').eq('id', batchId).single();

  if (error) throw error;

  if (!batch) {
    throw new Error(`Batch ${batchId} not found`);
  }

  if (batch.is_deleted) {
    throw new Error(`Batch ${batchId} is deleted`);
  }

  return batch;
}

/**
 * Validate order exists and is not deleted
 */
export async function validateOrderExists(orderId: string) {
  const supabase = createClientServiceRole();
  const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();

  if (error) throw error;

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (order.is_deleted) {
    throw new Error(`Order ${orderId} is deleted`);
  }

  return order;
}

/**
 * Validate feed purchase exists and is not deleted
 */
export async function validateFeedExists(feedId: string) {
  const supabase = createClientServiceRole();
  const { data: feed, error } = await supabase.from('feed_purchases').select('*').eq('id', feedId).single();

  if (error) throw error;

  if (!feed) {
    throw new Error(`Feed purchase ${feedId} not found`);
  }

  if (feed.is_deleted) {
    throw new Error(`Feed purchase ${feedId} is deleted`);
  }

  return feed;
}

/**
 * Validate batch is in required status
 */
export async function validateBatchStatus(batchId: string, requiredStatus: string) {
  const batch = await validateBatchExists(batchId);

  if (batch.status !== requiredStatus) {
    throw new Error(
      `Batch must be in ${requiredStatus} status, current: ${batch.status}`
    );
  }

  return batch;
}

/**
 * Validate batch is not closed
 */
export async function validateBatchNotClosed(batchId: string) {
  const batch = await validateBatchExists(batchId);

  if (batch.status === 'CLOSED') {
    throw new Error('Cannot perform operations on closed batches');
  }

  return batch;
}

/**
 * Validate order belongs to batch
 */
export async function validateOrderBelongsToBatch(orderId: string, batchId: string) {
  const order = await validateOrderExists(orderId);

  if (order.linked_batch_id !== batchId) {
    throw new Error(`Order ${orderId} does not belong to batch ${batchId}`);
  }

  return order;
}

/**
 * Validate feed belongs to batch
 */
export async function validateFeedBelongsToBatch(feedId: string, batchId: string) {
  const feed = await validateFeedExists(feedId);

  if (feed.batch_id !== batchId) {
    throw new Error(`Feed purchase ${feedId} does not belong to batch ${batchId}`);
  }

  return feed;
}

/**
 * Validate no circular dependencies
 */
export async function validateNoCircularDependencies(
  batchId: string,
  orderId?: string,
  feedId?: string
) {
  // Validate batch exists
  const batch = await validateBatchExists(batchId);

  // If order provided, validate it belongs to batch
  if (orderId) {
    await validateOrderBelongsToBatch(orderId, batchId);
  }

  // If feed provided, validate it belongs to batch
  if (feedId) {
    await validateFeedBelongsToBatch(feedId, batchId);
  }

  return true;
}

/**
 * Validate payment amount
 */
export async function validatePaymentAmount(
  orderId: string,
  amountPaid: number
) {
  const order = await validateOrderExists(orderId);

  if (amountPaid < 0) {
    throw new Error('Payment amount cannot be negative');
  }

  if (amountPaid > order.total_amount) {
    throw new Error(
      `Payment amount (₦${amountPaid}) exceeds order total (₦${order.total_amount})`
    );
  }

  return order;
}

/**
 * Validate feed quantity
 */
export async function validateFeedQuantity(feedId: string, kg: number) {
  const feed = await validateFeedExists(feedId);

  if (kg <= 0) {
    throw new Error('Feed quantity must be positive');
  }

  if (kg > feed.kg) {
    throw new Error(
      `Cannot use ${kg}kg of feed, only ${feed.kg}kg available`
    );
  }

  return feed;
}

/**
 * Validate transaction amount
 */
export async function validateTransactionAmount(amount: number) {
  if (amount <= 0) {
    throw new Error('Transaction amount must be positive');
  }

  return true;
}

/**
 * Validate unique order number
 */
export async function validateUniqueOrderNumber(orderNumber: string, excludeId?: string) {
  const supabase = createClientServiceRole();
  let query = supabase.from('orders').select('*').eq('orderNumber', orderNumber);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data: existing, error } = await query.single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found

  if (existing && existing.id !== excludeId) {
    throw new Error(`Order number ${orderNumber} already exists`);
  }

  return true;
}

/**
 * Validate batch can be closed
 */
export async function validateBatchCanBeClosed(batchId: string) {
  const batch = await validateBatchExists(batchId);

  if (batch.status === 'CLOSED') {
    throw new Error('Batch is already closed');
  }

  // Check if all orders are paid or completed
  const supabase = createClientServiceRole();
  const { data: unpaidOrders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('linked_batch_id', batchId)
    .neq('paymentStatus', 'PAID')
    .eq('is_deleted', false);

  if (error) throw error;

  if (unpaidOrders.length > 0) {
    console.warn(
      `Warning: Closing batch with ${unpaidOrders.length} unpaid orders`
    );
  }

  return batch;
}

