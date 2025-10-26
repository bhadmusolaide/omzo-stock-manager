import { NextResponse } from 'next/server';
import { calculateOrderProfitability } from '@/lib/ai/orderProfitability';
import { createClientServiceRole } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    
    // Validate order exists
    const supabase = createClientServiceRole();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single();
      
    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Calculate order profitability
    const profitability = await calculateOrderProfitability(orderId);
    
    const insights = profitability ? [{
      id: `order-${orderId}`,
      related_batch_id: profitability.batchId,
      insight_type: 'order_profitability',
      insight_value: profitability,
      created_at: new Date().toISOString()
    }] : [];
    
    return NextResponse.json({ insights }, { status: 200 });
  } catch (error) {
    console.error('Error fetching order insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order insights' },
      { status: 500 }
    );
  }
}