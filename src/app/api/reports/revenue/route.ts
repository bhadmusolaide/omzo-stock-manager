import { createClientServiceRole } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    let orderQuery: Record<string, string> = {};
    if (batchId) {
      orderQuery.linked_batch_id = batchId;
    }

    const supabase = createClientServiceRole();
    let query = supabase.from('orders').select('*, order_items(*)');
  
    if (batchId) {
      query = query.eq('linked_batch_id', batchId);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group revenue by product type (from orderItems)
    const revenueByProduct = orders.reduce(
      (acc: Record<string, number>, order: any) => {
        (order.order_items || []).forEach((item: any) => {
          const productName = item.product_name;
          if (!acc[productName]) {
            acc[productName] = 0;
          }
          acc[productName] += (item.total_price || 0);
        });
        return acc;
      },
      {} as Record<string, number>
    );

    const data = Object.entries(revenueByProduct).map(([name, value]) => ({
      name,
      value: parseFloat((value as number).toFixed(2)),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching revenue:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 });
  }
}

