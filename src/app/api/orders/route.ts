import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const createOrderSchema = z.object({
   orderNumber: z.string().optional(), // Make optional since we'll auto-generate
   customerName: z.string().min(1, 'Customer name is required'),
   customerPhone: z.string().optional(),
   location: z.string().optional(), // New location field
   orderDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
   totalAmount: z.number().min(0, 'Total amount must be non-negative'),
   amountPaid: z.number().min(0, 'Amount paid must be non-negative'),
   linkedBatchId: z.string().optional(),
   orderType: z.enum(['DRESSED', 'LIVE']).default('DRESSED'), // New: order type
   paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'COMPLIMENTARY']).optional(), // Allow explicit payment status
   orderItems: z.array(z.object({
     productId: z.string().min(1, 'Product ID is required'),
     qtyCount: z.number().int().min(0),
     qtyWeight: z.number().min(0),
     unitPrice: z.number().positive('Unit price must be greater than 0'),
     priceMode: z.enum(['COUNT', 'KG', 'COUNT_KG']),
   })),
   overrideValidation: z.boolean().optional(),
 });

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServiceRole();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const batchId = searchParams.get('batchId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select(`
        *,
        batches!linked_batch_id (
          id,
          name
        ),
        order_items (
          *
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('payment_status', status);
    }
    if (batchId) {
      query = query.eq('linked_batch_id', batchId);
    }
    if (search) {
      query = query.ilike('customer_name', `%${search}%`);
    }

    const { data: orders, error, count } = await query;

    if (error) throw error;

    // Transform to camelCase for frontend
    const transformedOrders = (orders || []).map((order: any) => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      location: order.location,
      orderDate: order.order_date,
      totalAmount: order.total_amount,
      amountPaid: order.amount_paid,
      balanceDue: order.balance_due,
      paymentStatus: order.payment_status,
      status: order.status,
      orderType: order.order_type || 'DRESSED', // Include order type
      linkedBatchId: order.linked_batch_id,
      batchName: order.batches?.name || null,
      orderItems: (order.order_items || []).map((item: any) => ({
        id: item.id,
        productId: item.product_name,
        qtyCount: item.qty_count || 0,
        qtyWeight: item.qty_weight || 0,
        unitPrice: item.unit_price,
        priceMode: item.price_mode,
        itemType: item.item_type || 'DRESSED', // Include item type
        sourceBatchId: item.source_batch_id,
      })),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    }));

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      orders: transformedOrders,
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  let validatedData: z.infer<typeof createOrderSchema> | undefined;
  try {
    body = await request.json();
    validatedData = createOrderSchema.parse(body);

    // Auto-generate order number if not provided
    let orderNumber = validatedData.orderNumber;
    if (!orderNumber) {
      const supabase = createClientServiceRole();

      // Get today's date in YYYYMMDD format
      const today = new Date();
      const dateStr = today.getFullYear().toString() +
                      (today.getMonth() + 1).toString().padStart(2, '0') +
                      today.getDate().toString().padStart(2, '0');

      // Find the highest sequence number for today
      const { data: existingOrders, error: queryError } = await supabase
        .from('orders')
        .select('order_number')
        .like('order_number', `ORD-${dateStr}-%`)
        .order('order_number', { ascending: false })
        .limit(1);

      if (queryError) throw queryError;

      let nextSequence = 1;
      if (existingOrders && existingOrders.length > 0) {
        const lastOrderNumber = existingOrders[0].order_number;
        const lastSequence = parseInt(lastOrderNumber.split('-')[2]);
        nextSequence = lastSequence + 1;
      }

      // Format as ORD-YYYYMMDD-XXXX
      orderNumber = `ORD-${dateStr}-${nextSequence.toString().padStart(4, '0')}`;
    }

    // Calculate payment status (respect explicit COMPLIMENTARY status)
    let paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'COMPLIMENTARY';
    if (validatedData.paymentStatus === 'COMPLIMENTARY') {
      paymentStatus = 'COMPLIMENTARY';
    } else if (validatedData.amountPaid === 0) {
      paymentStatus = 'PENDING';
    } else if (validatedData.amountPaid < validatedData.totalAmount) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'PAID';
    }

    const supabase = createClientServiceRole();

    // Calculate balance due
    const balanceDue = validatedData.totalAmount - validatedData.amountPaid;

    // Determine order type (default to DRESSED for backwards compatibility)
    const orderType = validatedData.orderType || 'DRESSED';
    const isLiveOrder = orderType === 'LIVE';

    // For LIVE orders, validate batch is provided and has enough birds
    if (isLiveOrder) {
      if (!validatedData.linkedBatchId || validatedData.linkedBatchId.trim() === '') {
        return NextResponse.json({ error: 'Batch is required for live chicken orders' }, { status: 400 });
      }

      // Get total live birds requested
      const totalBirdsRequested = validatedData.orderItems.reduce((sum, item) => sum + (item.qtyCount || 0), 0);

      // Fetch batch to check current_live
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('id, name, current_live')
        .eq('id', validatedData.linkedBatchId)
        .single();

      if (batchError) throw batchError;
      if (!batch) {
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
      }

      if (!validatedData.overrideValidation && totalBirdsRequested > (batch.current_live || 0)) {
        return NextResponse.json({
          error: `Insufficient live birds. Available: ${batch.current_live}, Requested: ${totalBirdsRequested}`
        }, { status: 400 });
      }
    }

    // Validate dressed inventory before inserting order (only for DRESSED orders)
    if (!isLiveOrder && validatedData.linkedBatchId && validatedData.linkedBatchId.trim() !== '' && !validatedData.overrideValidation) {
      for (const item of validatedData.orderItems) {
        const deductCount = (item.priceMode === 'COUNT' || item.priceMode === 'COUNT_KG') ? item.qtyCount : 0;
        const deductWeight = (item.priceMode === 'KG' || item.priceMode === 'COUNT_KG') ? item.qtyWeight : 0;

        if (deductCount > 0 || deductWeight > 0) {
          // Aggregate inventory for the product type and batch
          const { data: inventoryList, error: fetchError } = await supabase
            .from('dressed_inventory')
            .select('*')
            .eq('product_type', item.productId)
            .eq('batch_id', validatedData.linkedBatchId)
            .order('updated_at', { ascending: false });

          if (fetchError) throw fetchError;

          // Aggregate available inventory from all entries
          const totalAvailableCount = inventoryList?.reduce((sum, inv) => sum + (inv.available_count || 0), 0) || 0;
          const totalAvailableWeight = inventoryList?.reduce((sum, inv) => sum + (inv.available_weight_kg || 0), 0) || 0;

          // Implement strict inventory validation
          if (deductCount > 0 && totalAvailableCount < deductCount) {
            return NextResponse.json({ error: `Insufficient count inventory for ${item.productId}. Available: ${totalAvailableCount}, Required: ${deductCount}.` }, { status: 400 });
          }

          if (deductWeight > 0 && totalAvailableWeight < deductWeight) {
            return NextResponse.json({ error: `Insufficient weight inventory for ${item.productId}. Available: ${totalAvailableWeight}kg, Required: ${deductWeight}kg.` }, { status: 400 });
          }
        }
      }
    }

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: validatedData.customerName,
        customer_phone: validatedData.customerPhone,
        location: validatedData.location || null,
        order_date: new Date(validatedData.orderDate).toISOString(),
        total_amount: validatedData.totalAmount,
        amount_paid: validatedData.amountPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
        status: paymentStatus, // Populate the 'status' column as well
        order_type: orderType, // Include order type
        linked_batch_id: validatedData.linkedBatchId || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order items
    const { computeOrderItemSubtotal } = await import('@/utils/calculations');
    const orderItemsData = validatedData.orderItems.map(item => {
      const totalPrice = computeOrderItemSubtotal({
        qtyCount: item.qtyCount,
        qtyWeight: item.qtyWeight,
        unitPrice: item.unitPrice,
        priceMode: item.priceMode,
      });
      const quantity = item.priceMode === 'KG' ? item.qtyWeight : item.qtyCount;
      return {
        order_id: order.id,
        product_name: item.productId,
        quantity: quantity,
        unit_price: item.unitPrice,
        total_price: totalPrice,
        price_mode: item.priceMode,
        qty_count: item.qtyCount,
        qty_weight: item.qtyWeight,
        item_type: isLiveOrder ? 'LIVE' : 'DRESSED', // Track item type
        source_batch_id: isLiveOrder ? validatedData!.linkedBatchId : null, // Track source batch for live
      };
    });

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(orderItemsData);

    if (orderItemsError) throw orderItemsError;

    // Auto-log transaction for payment
    if (validatedData.amountPaid > 0) {
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          date: new Date().toISOString(),
          description: `${isLiveOrder ? 'Live Chicken' : 'Order'} Payment: ${(order as any).order_number} - ${order.customer_name}`,
          amount: validatedData.amountPaid,
          type: 'CREDIT',
          category: 'ORDER',
          linked_order_id: order.id,
          linked_batch_id: validatedData.linkedBatchId || null,
        });

      if (transactionError) throw transactionError;
    }

    // Handle inventory deduction based on order type
    if (isLiveOrder && validatedData.linkedBatchId) {
      // LIVE ORDER: Deduct from batch's current_live count
      const totalBirdsToDeduct = validatedData.orderItems.reduce((sum, item) => sum + (item.qtyCount || 0), 0);

      const { data: currentBatch, error: fetchBatchError } = await supabase
        .from('batches')
        .select('current_live')
        .eq('id', validatedData.linkedBatchId)
        .single();

      if (fetchBatchError) throw fetchBatchError;

      const newCurrentLive = Math.max(0, (currentBatch?.current_live || 0) - totalBirdsToDeduct);

      const { error: updateBatchError } = await supabase
        .from('batches')
        .update({
          current_live: newCurrentLive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', validatedData.linkedBatchId);

      if (updateBatchError) throw updateBatchError;

      console.log(`Live order: Deducted ${totalBirdsToDeduct} birds from batch. New current_live: ${newCurrentLive}`);
    } else if (!isLiveOrder && validatedData.linkedBatchId && validatedData.linkedBatchId.trim() !== '') {
      // DRESSED ORDER: Deduct from dressed inventory
      for (const item of validatedData.orderItems) {
        const deductCount = (item.priceMode === 'COUNT' || item.priceMode === 'COUNT_KG') ? item.qtyCount : 0;
        const deductWeight = (item.priceMode === 'KG' || item.priceMode === 'COUNT_KG') ? item.qtyWeight : 0;

        if (deductCount > 0 || deductWeight > 0) {
          // Aggregate inventory for the product type and batch
          const { data: inventoryList, error: fetchError } = await supabase
            .from('dressed_inventory')
            .select('*')
            .eq('product_type', item.productId)
            .eq('batch_id', validatedData.linkedBatchId)
            .order('updated_at', { ascending: false });

          if (fetchError) throw fetchError;

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

              if (updateError) throw updateError;

              remainingCountToDeduct -= countToDeduct;
              remainingWeightToDeduct -= weightToDeduct;
            }
          }

          // If there's still remaining to deduct, it means we have insufficient inventory
          if (remainingCountToDeduct > 0 || remainingWeightToDeduct > 0) {
            if (validatedData.overrideValidation) {
              console.log(`Override enabled: Allowing order creation with insufficient inventory for ${item.productId}`);
            } else {
              console.error(`Insufficient inventory for ${item.productId}: remaining count=${remainingCountToDeduct}, weight=${remainingWeightToDeduct}`);
              return NextResponse.json({ error: `Internal error: Insufficient inventory for ${item.productId}.` }, { status: 500 });
            }
          }
        }
      }
    }

    // Fetch the order with relations
    const { data: fullOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        batches!linked_batch_id (
          id,
          name
        ),
        order_items (
          *
        )
      `)
      .eq('id', order.id)
      .single();

    if (fetchError) throw fetchError;

    // Transform to camelCase for frontend
    const transformedOrder = {
      id: fullOrder.id,
      orderNumber: fullOrder.order_number,
      customerName: fullOrder.customer_name,
      customerPhone: fullOrder.customer_phone,
      location: fullOrder.location,
      orderDate: fullOrder.order_date,
      totalAmount: fullOrder.total_amount,
      amountPaid: fullOrder.amount_paid,
      balanceDue: fullOrder.balance_due,
      paymentStatus: fullOrder.payment_status,
      status: fullOrder.status,
      orderType: fullOrder.order_type || 'DRESSED', // Include order type
      linkedBatchId: fullOrder.linked_batch_id,
      batchName: fullOrder.batches?.name || null,
      orderItems: (fullOrder.order_items || []).map((item: any) => ({
        id: item.id,
        productId: item.product_name,
        qtyCount: item.qty_count || 0,
        qtyWeight: item.qty_weight || 0,
        unitPrice: item.unit_price,
        priceMode: item.price_mode,
        itemType: item.item_type || 'DRESSED', // Include item type
        sourceBatchId: item.source_batch_id,
      })),
      createdAt: fullOrder.created_at,
      updatedAt: fullOrder.updated_at,
    };

    return NextResponse.json(transformedOrder, { status: 201 });
  } catch (error: any) {
    console.error('=== ORDER CREATION ERROR DEBUG ===');
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message || 'No message');
    console.error('Error stack:', error.stack || 'No stack');
    console.error('Request body:', body || 'No body parsed');
    console.error('Validated data:', validatedData || 'No validation');
    console.error('Full error object:', error);
    console.error('=== END ORDER CREATION ERROR ===');
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}