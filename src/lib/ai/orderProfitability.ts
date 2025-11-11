import { createClientServiceRole } from '@/lib/supabase';

export interface OrderProfitabilityInsight {
  orderId: string;
  batchId: string | null;
  totalAmount: number;
  effectiveUnitCost: number;
  sellingPricePerKg: number;
  profitPerKg: number;
  marginPercent: number;
  insightMessage: string;
  isHighMargin: boolean;
  isLowMargin: boolean;
}

/**
 * Calculate order profitability insights
 * Compare selling_price - effective_unit_cost
 * Save % margin per order
 */
export async function calculateOrderProfitability(orderId: string): Promise<OrderProfitabilityInsight | null> {
  try {
    const supabase = createClientServiceRole();
    
    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        linked_batch_id,
        order_items (
          quantity,
          unit_price,
          total_price,
          is_deleted
        )
      `)
      .eq('id', orderId)
      .single();
      
    if (orderError || !order) {
      console.error('Error fetching order for profitability calculation:', orderError);
      return null;
    }
    
    // Get batch effective unit cost if linked
    let effectiveUnitCost = 0;
    if (order.linked_batch_id) {
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('effective_unit_cost')
        .eq('id', order.linked_batch_id)
        .single();
        
      if (!batchError && batch) {
        effectiveUnitCost = batch.effective_unit_cost || 0;
      }
    }
    
    // Calculate total quantity and revenue
    const totalQuantity = order.order_items
      .filter((item: any) => !item.is_deleted)
      .reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    const totalRevenue = order.order_items
      .filter((item: any) => !item.is_deleted)
      .reduce((sum: number, item: any) => sum + item.total_price, 0);
    
    // Calculate selling price per kg
    const sellingPricePerKg = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;
    
    // Calculate profit metrics
    const profitPerKg = sellingPricePerKg - effectiveUnitCost;
    const marginPercent = sellingPricePerKg > 0 ? (profitPerKg / sellingPricePerKg) * 100 : 0;
    
    // Determine margin status
    const isHighMargin = marginPercent > 30;
    const isLowMargin = marginPercent < 15 && marginPercent >= 0;
    
    // Generate insight message
    let insightMessage = '';
    if (sellingPricePerKg > 0) {
      insightMessage = `Margin: ${marginPercent.toFixed(2)}%. Profit: ₦${profitPerKg.toFixed(2)} per kg`;
      if (isLowMargin) {
        insightMessage += ' - Low margin warning';
      } else if (isHighMargin) {
        insightMessage += ' - High margin opportunity';
      }
    } else {
      insightMessage = 'Insufficient data for profitability calculation';
    }
    
    return {
      orderId: order.id,
      batchId: order.linked_batch_id,
      totalAmount: order.total_amount || 0,
      effectiveUnitCost,
      sellingPricePerKg,
      profitPerKg,
      marginPercent,
      insightMessage,
      isHighMargin,
      isLowMargin
    };
  } catch (error) {
    console.error('Error calculating order profitability:', error);
    return null;
  }
}