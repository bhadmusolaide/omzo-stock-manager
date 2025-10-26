import { createClientServiceRole } from '@/lib/supabase';

/**
 * Order Service - Handles order creation, payment tracking, and related transactions
 */

/**
 * Calculate payment status based on amounts
 */
export function calculatePaymentStatus(
  totalAmount: number,
  amountPaid: number
): 'PENDING' | 'PARTIAL' | 'PAID' {
  if (amountPaid === 0) return 'PENDING';
  if (amountPaid >= totalAmount) return 'PAID';
  return 'PARTIAL';
}

/**
 * Create order with auto-generated transaction
 */
export async function createOrderWithTransaction(
  data: {
    orderNumber: string;
    customerName: string;
    customerPhone?: string;
    orderDate: Date;
    totalAmount: number;
    amountPaid?: number;
    linkedBatchId?: string;
    orderItems?: Array<{
      productId: string;
      qtyCount: number;
      qtyWeight: number;
      unitPrice: number;
      priceMode: string;
    }>;
  },
  userId?: string
) {
  const supabase = createClientServiceRole();

  // Validate batch if provided
  if (data.linkedBatchId) {
    const { data: batch, error } = await supabase
      .from('batches')
      .select('*')
      .eq('id', data.linkedBatchId)
      .single();

    if (error) throw error;

    if (!batch) {
      throw new Error(`Batch ${data.linkedBatchId} not found`);
    }

    if (batch.is_deleted) {
      throw new Error(`Batch ${data.linkedBatchId} is deleted`);
    }

    // Validate batch is not closed
    if (batch.status === 'CLOSED') {
      throw new Error('Cannot create orders for closed batches');
    }
  }

  const amountPaid = data.amountPaid || 0;
  const paymentStatus = calculatePaymentStatus(data.totalAmount, amountPaid);

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name: data.customerName,
      order_date: new Date(data.orderDate).toISOString(),
      total_amount: data.totalAmount,
      linked_batch_id: data.linkedBatchId,
      status: paymentStatus,
      created_by: userId,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Insert order items if provided
  if (data.orderItems && data.orderItems.length > 0) {
    const orderItemsData = data.orderItems.map(item => {
      const quantity = item.priceMode === 'KG' ? item.qtyWeight : item.qtyCount;
      const totalPrice = quantity * item.unitPrice;
      return {
        order_id: order.id,
        product_name: item.productId,
        quantity,
        unit_price: item.unitPrice,
        total_price: totalPrice,
      };
    });

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(orderItemsData);

    if (orderItemsError) throw orderItemsError;
  }

  // Auto-create transaction for paid amount
  if (amountPaid > 0) {
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        date: new Date().toISOString(),
        description: `Order Payment: ${order.id} - ${order.customer_name}`,
        amount: amountPaid,
        type: 'CREDIT',
        category: 'ORDER',
        linked_order_id: order.id,
        linked_batch_id: data.linkedBatchId,
        created_by: userId,
      });

    if (transactionError) throw transactionError;
  }

  return order;
}

/**
 * Update order payment
 */
export async function updateOrderPayment(
  orderId: string,
  amountPaid: number,
  userId?: string
) {
  const supabase = createClientServiceRole();

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchError) throw fetchError;

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (order.is_deleted) {
    throw new Error(`Order ${orderId} is deleted`);
  }

  if (amountPaid < 0) {
    throw new Error('Amount paid cannot be negative');
  }

  if (amountPaid > order.total_amount) {
    throw new Error('Amount paid cannot exceed total amount');
  }

  const paymentStatus = calculatePaymentStatus(order.total_amount, amountPaid);

  // Calculate existing paid amount from transactions
  const { data: existingPayments, error: paymentsError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('linked_order_id', orderId)
    .eq('type', 'CREDIT')
    .eq('is_deleted', false);
  if (paymentsError) throw paymentsError;
  const totalPreviouslyPaid = (existingPayments || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
  const paymentDifference = amountPaid - totalPreviouslyPaid;

  // Update order status only
  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({
      status: paymentStatus,
      updated_by: userId
    })
    .eq('id', orderId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Create transaction for payment difference if positive
  if (paymentDifference > 0) {
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        date: new Date().toISOString(),
        description: `Order Payment Update: ${order.id} - Additional ₦${paymentDifference}`,
        amount: paymentDifference,
        type: 'CREDIT',
        category: 'ORDER',
        linked_order_id: orderId,
        linked_batch_id: order.linked_batch_id,
        created_by: userId,
      });

    if (transactionError) throw transactionError;
  }

  return updatedOrder;
}

/**
 * Get order with all related data
 */
export async function getOrderWithRelations(orderId: string) {
  const supabase = createClientServiceRole();

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      batches!linked_batch_id (
        id,
        name,
        status
      ),
      order_items (
        *
      ),
      transactions (
        *
      )
    `)
    .eq('id', orderId)
    .eq('is_deleted', false)
    .single();

  if (error) throw error;

  return order;
}

/**
 * Soft delete order
 */
export async function softDeleteOrder(orderId: string, userId?: string) {
  const supabase = createClientServiceRole();

  // Soft delete order
  const { error: orderError } = await supabase
    .from('orders')
    .update({ 
      is_deleted: true, 
      updated_by: userId 
    })
    .eq('id', orderId);

  if (orderError) throw orderError;

  // Soft delete related transactions
  const { error: transactionError } = await supabase
    .from('transactions')
    .update({ 
      is_deleted: true, 
      updated_by: userId 
    })
    .eq('linked_order_id', orderId);

  if (transactionError) throw transactionError;

  return { success: true, orderId };
}
