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

    // Group revenue by product type (from orderItems) and by order type
    const revenueByProduct: Record<string, number> = {};
    const revenueByOrderType = {
      LIVE: { revenue: 0, count: 0 },
      DRESSED: { revenue: 0, count: 0 },
    };
    // Track complimentary orders separately
    const complimentaryStats = {
      orderCount: 0,
      totalValue: 0, // Value of what was given away
      liveCount: 0,
      dressedCount: 0,
    };

    orders.forEach((order: any) => {
      const orderType = order.order_type || 'DRESSED';
      const isComplimentary = order.payment_status === 'COMPLIMENTARY';

      (order.order_items || []).forEach((item: any) => {
        const productName = item.product_name;
        const totalPrice = item.total_price || 0;
        const qtyCount = item.qty_count || item.quantity || 0;

        // Track complimentary orders
        if (isComplimentary) {
          complimentaryStats.totalValue += totalPrice;
          if (orderType === 'LIVE') {
            complimentaryStats.liveCount += qtyCount;
          } else {
            complimentaryStats.dressedCount += qtyCount;
          }
        } else {
          // Only count revenue for non-complimentary orders
          if (!revenueByProduct[productName]) {
            revenueByProduct[productName] = 0;
          }
          revenueByProduct[productName] += totalPrice;

          // Track by order type (revenue and count) - exclude complimentary
          if (orderType === 'LIVE') {
            revenueByOrderType.LIVE.revenue += totalPrice;
            revenueByOrderType.LIVE.count += qtyCount;
          } else {
            revenueByOrderType.DRESSED.revenue += totalPrice;
            revenueByOrderType.DRESSED.count += qtyCount;
          }
        }
      });

      // Count complimentary orders
      if (isComplimentary) {
        complimentaryStats.orderCount += 1;
      }
    });

    const productData = Object.entries(revenueByProduct).map(([name, value]) => ({
      name,
      value: parseFloat((value as number).toFixed(2)),
    }));

    // Return order type breakdown, complimentary stats, and product breakdown
    return NextResponse.json({
      byProduct: productData,
      byOrderType: [
        {
          name: 'Live Chickens 🐔',
          value: parseFloat(revenueByOrderType.LIVE.revenue.toFixed(2)),
          count: revenueByOrderType.LIVE.count,
          type: 'LIVE'
        },
        {
          name: 'Dressed Products 🍗',
          value: parseFloat(revenueByOrderType.DRESSED.revenue.toFixed(2)),
          count: revenueByOrderType.DRESSED.count,
          type: 'DRESSED'
        },
      ],
      complimentary: {
        orderCount: complimentaryStats.orderCount,
        totalValue: parseFloat(complimentaryStats.totalValue.toFixed(2)),
        liveCount: complimentaryStats.liveCount,
        dressedCount: complimentaryStats.dressedCount,
      },
      // Keep backward compatibility - return productData as default array
      data: productData,
    });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 });
  }
}

