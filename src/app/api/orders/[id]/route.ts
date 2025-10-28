import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const updateOrderSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required').optional(),
  customerName: z.string().min(1, 'Customer name is required').optional(),
  customerPhone: z.string().optional(),
  orderDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  totalAmount: z.number().min(0, 'Total amount must be non-negative').optional(),
  amountPaid: z.number().min(0, 'Amount paid must be non-negative').optional(),
  linkedBatchId: z.string().optional(),
  orderItems: z.array(z.object({
    id: z.string().optional(),
    productId: z.string().min(1, 'Product ID is required'),
    qtyCount: z.number().int().min(0),
    qtyWeight: z.number().min(0),
    unitPrice: z.number().positive('Unit price must be greater than 0'),
    priceMode: z.enum(['COUNT', 'KG', 'COUNT_KG']),
  })).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClientServiceRole();
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        batches!linked_batch_id (id, name),
        order_items (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Transform to camelCase for frontend
    const transformedOrder = {
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      orderDate: order.order_date,
      totalAmount: order.total_amount,
      amountPaid: order.amount_paid,
      balanceDue: Math.max(0, order.total_amount - order.amount_paid),
      paymentStatus: order.payment_status,
      status: order.status,
      linkedBatchId: order.linked_batch_id,
      batchName: order.batches?.name || null,
      orderItems: (order.order_items || []).map((item: any) => ({
        id: item.id,
        productId: item.product_name,
        qtyCount: (item.price_mode === 'KG' || item.price_mode === 'COUNT_KG') ? item.qty_count : 0,
        qtyWeight: (item.price_mode === 'KG' || item.price_mode === 'COUNT_KG') ? item.qty_weight : 0,
        unitPrice: item.unit_price,
        priceMode: item.price_mode,
      })),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };

    return NextResponse.json(transformedOrder);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateOrderSchema.parse(body);

    const supabase = createClientServiceRole();
    const { data: currentOrder, error: currentOrderError } = await supabase
      .from('orders')
      .select('*, order_items(*), batches!linked_batch_id (id, current_live)')
      .eq('id', id)
      .single();

    if (currentOrderError) {
      console.error('Error fetching current order:', currentOrderError);
      return NextResponse.json({ error: currentOrderError.message }, { status: 500 });
    }

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Calculate new total if orderItems are updated
    let newTotalAmount = currentOrder.total_amount;
    if (validatedData.orderItems) {
      newTotalAmount = validatedData.orderItems.reduce((sum, item) => {
        const subtotal = item.priceMode === 'COUNT' ? item.qtyCount * item.unitPrice :
                         item.priceMode === 'KG' ? item.qtyWeight * item.unitPrice :
                         item.qtyWeight * item.unitPrice;
        return sum + subtotal;
      }, 0);
    }

    // Calculate payment status
    let paymentStatus = (currentOrder as any).payment_status;
    if (validatedData.amountPaid !== undefined || newTotalAmount !== currentOrder.total_amount) {
      const newAmountPaid = validatedData.amountPaid ?? (currentOrder as any).amount_paid;
      if (newAmountPaid === 0) {
        paymentStatus = 'PENDING';
      } else if (newAmountPaid < newTotalAmount) {
        paymentStatus = 'PARTIAL';
      } else {
        paymentStatus = 'PAID';
      }
    }

    // Update order (map to snake_case)
    const updateData: any = {
      total_amount: newTotalAmount,
      amount_paid: validatedData.amountPaid !== undefined ? validatedData.amountPaid : currentOrder.amount_paid,
      balance_due: Math.max(0, newTotalAmount - (validatedData.amountPaid !== undefined ? validatedData.amountPaid : currentOrder.amount_paid)),
      payment_status: paymentStatus,
    };
    if (validatedData.orderNumber !== undefined) updateData.order_number = validatedData.orderNumber;
    if (validatedData.customerName !== undefined) updateData.customer_name = validatedData.customerName;
    if (validatedData.customerPhone !== undefined) updateData.customer_phone = validatedData.customerPhone;
    if (validatedData.orderDate !== undefined) updateData.order_date = new Date(validatedData.orderDate).toISOString();
    if (validatedData.linkedBatchId !== undefined) updateData.linked_batch_id = validatedData.linkedBatchId;

    const { data: updatedOrderBase, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select('*, order_items(*), batches!linked_batch_id (id, name, current_live)')
      .single();
    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Handle inventory adjustments for order items if they changed
    if (validatedData.orderItems && validatedData.linkedBatchId) {
      // First, we need to restore the inventory from the old order items
      // Then deduct inventory for the new order items
      
      // Restore inventory from old order items
      for (const oldItem of currentOrder.order_items || []) {
        const restoreCount = (oldItem.price_mode === 'COUNT' || oldItem.price_mode === 'COUNT_KG') ? oldItem.quantity : 0;
        const restoreWeight = oldItem.price_mode === 'KG' ? oldItem.quantity : 0;
        
        if (restoreCount > 0 || restoreWeight > 0) {
          // Find existing inventory entries for this product and batch
          const { data: inventoryList, error: fetchError } = await supabase
            .from('dressed_inventory')
            .select('*')
            .eq('product_type', oldItem.product_name)
            .eq('batch_id', validatedData.linkedBatchId)
            .order('updated_at', { ascending: false });

          if (fetchError) {
            console.error('Error fetching inventory for restoration:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
          }

          // Create a new inventory entry if none exists
          if (!inventoryList || inventoryList.length === 0) {
            const { error: createError } = await supabase
              .from('dressed_inventory')
              .insert({
                product_type: oldItem.product_name,
                batch_id: validatedData.linkedBatchId,
                available_count: restoreCount,
                available_weight_kg: restoreWeight,
                unit_price: oldItem.unit_price || 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (createError) {
              console.error('Error creating inventory entry for restoration:', createError);
              return NextResponse.json({ error: createError.message }, { status: 500 });
            }
          } else {
            // Add back to the most recent inventory entry
            const latestInventory = inventoryList[0];
            const { error: updateError } = await supabase
              .from('dressed_inventory')
              .update({
                available_count: (latestInventory.available_count || 0) + restoreCount,
                available_weight_kg: (latestInventory.available_weight_kg || 0) + restoreWeight,
                updated_at: new Date().toISOString(),
              })
              .eq('id', latestInventory.id);

            if (updateError) {
              console.error('Error updating inventory for restoration:', updateError);
              return NextResponse.json({ error: updateError.message }, { status: 500 });
            }
          }
        }
      }

      // Now deduct inventory for new order items
      for (const newItem of validatedData.orderItems) {
        const deductCount = (newItem.priceMode === 'COUNT' || newItem.priceMode === 'COUNT_KG') ? newItem.qtyCount : 0;
        const deductWeight = newItem.priceMode === 'KG' ? newItem.qtyWeight : 0;

        if (deductCount > 0 || deductWeight > 0) {
          // Aggregate inventory for the product type and batch
          const { data: inventoryList, error: fetchError } = await supabase
            .from('dressed_inventory')
            .select('*')
            .eq('product_type', newItem.productId)
            .eq('batch_id', validatedData.linkedBatchId)
            .order('updated_at', { ascending: false });

          if (fetchError) {
            console.error('Error fetching inventory for deduction:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
          }

          // Aggregate available inventory from all entries
          const totalAvailableCount = inventoryList?.reduce((sum, inv) => sum + (inv.available_count || 0), 0) || 0;
          const totalAvailableWeight = inventoryList?.reduce((sum, inv) => sum + (inv.available_weight_kg || 0), 0) || 0;

          // Implement strict inventory validation
          if (deductCount > 0 && totalAvailableCount < deductCount) {
            return NextResponse.json({ error: `Insufficient count inventory for ${newItem.productId}. Available: ${totalAvailableCount}, Required: ${deductCount}.` }, { status: 400 });
          }

          if (deductWeight > 0 && totalAvailableWeight < deductWeight) {
            return NextResponse.json({ error: `Insufficient weight inventory for ${newItem.productId}. Available: ${totalAvailableWeight}kg, Required: ${deductWeight}kg.` }, { status: 400 });
          }

          // Deduct from inventory entries, starting from the most recently updated
          let remainingCountToDeduct = deductCount;
          let remainingWeightToDeduct = deductWeight;

          for (const inventory of inventoryList || []) {
            if (remainingCountToDeduct <= 0 && remainingWeightToDeduct <= 0) break;

            const countToDeduct = Math.min(remainingCountToDeduct, inventory.available_count || 0);
            const weightToDeduct = Math.min(remainingWeightToDeduct, inventory.available_weight_kg || 0);

            if (countToDeduct > 0 || weightToDeduct > 0) {
              const { error: updateError } = await supabase
                .from('dressed_inventory')
                .update({
                  available_count: (inventory.available_count || 0) - countToDeduct,
                  available_weight_kg: (inventory.available_weight_kg || 0) - weightToDeduct,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', inventory.id);

              if (updateError) {
                console.error('Error updating inventory for deduction:', updateError);
                return NextResponse.json({ error: updateError.message }, { status: 500 });
              }

              remainingCountToDeduct -= countToDeduct;
              remainingWeightToDeduct -= weightToDeduct;
            }
          }

          // If there's still remaining to deduct, it means we have a logic error since we already validated
          if (remainingCountToDeduct > 0 || remainingWeightToDeduct > 0) {
            console.error(`Logic error: Still have remaining amounts to deduct after processing all inventory: count=${remainingCountToDeduct}, weight=${remainingWeightToDeduct}`);
            return NextResponse.json({ error: `Internal error: Insufficient inventory for ${newItem.productId} despite passing validation.` }, { status: 500 });
          }
        }
      }
    }

    // Update orderItems if provided
    if (validatedData.orderItems) {
      // Delete existing items
      const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', id);
      if (deleteError) {
        console.error('Error deleting order items:', deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
      // Create new items
      const { error: createError } = await supabase.from('order_items').insert(
        validatedData.orderItems.map(item => {
          const quantity = item.priceMode === 'KG' ? item.qtyWeight : item.qtyCount;
          const totalPrice = quantity * item.unitPrice;
          return {
            order_id: id,
            product_name: item.productId,
            quantity: quantity,
            unit_price: item.unitPrice,
            total_price: totalPrice,
            price_mode: item.priceMode,
            qty_count: item.qtyCount,
            qty_weight: item.qtyWeight,
          };
        })
      );
      if (createError) {
        console.error('Error creating order items:', createError);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
    }

    // Log transaction if amountPaid increased
    if (validatedData.amountPaid !== undefined && validatedData.amountPaid > (currentOrder as any).amount_paid) {
      const paymentDiff = validatedData.amountPaid - (currentOrder as any).amount_paid;
      if (paymentDiff > 0) {
        const { error: createTransactionError } = await supabase.from('transactions').insert({
          date: new Date().toISOString(),
          description: `Order Payment: ${(updatedOrderBase as any).order_number} - ${(updatedOrderBase as any).customer_name}`,
          amount: paymentDiff,
          type: 'CREDIT',
          category: 'ORDER',
          linked_order_id: id,
          linked_batch_id: updatedOrderBase.linked_batch_id,
        });
        if (createTransactionError) {
          console.error('Error creating transaction:', createTransactionError);
          return NextResponse.json({ error: createTransactionError.message }, { status: 500 });
        }
      }
    }

    // Fetch latest order with relations
    const { data: finalOrder, error: finalFetchError } = await supabase
      .from('orders')
      .select(`
        *,
        batches!linked_batch_id (id, name),
        order_items (*)
      `)
      .eq('id', id)
      .single();
    if (finalFetchError) {
      console.error('Error fetching final order:', finalFetchError);
      return NextResponse.json({ error: finalFetchError.message }, { status: 500 });
    }
    // Transform to camelCase for frontend
    const transformedFinalOrder = {
      id: finalOrder.id,
      orderNumber: finalOrder.order_number,
      customerName: finalOrder.customer_name,
      customerPhone: finalOrder.customer_phone,
      orderDate: finalOrder.order_date,
      totalAmount: finalOrder.total_amount,
      amountPaid: finalOrder.amount_paid,
      balanceDue: Math.max(0, finalOrder.total_amount - finalOrder.amount_paid),
      paymentStatus: finalOrder.payment_status,
      status: finalOrder.status,
      linkedBatchId: finalOrder.linked_batch_id,
      batchName: finalOrder.batches?.name || null,
      orderItems: (finalOrder.order_items || []).map((item: any) => ({
        id: item.id,
        productId: item.product_name,
        qtyCount: (item.price_mode === 'COUNT' || item.price_mode === 'COUNT_KG') ? item.qty_count : 0,
        qtyWeight: (item.price_mode === 'KG' || item.price_mode === 'COUNT_KG') ? item.qty_weight : 0,
        unitPrice: item.unit_price,
        priceMode: item.price_mode,
      })),
      createdAt: finalOrder.created_at,
      updatedAt: finalOrder.updated_at,
    };

    return NextResponse.json(transformedFinalOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClientServiceRole();
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}