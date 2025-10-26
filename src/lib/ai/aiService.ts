import { createClientServiceRole } from '@/lib/supabase';
import { calculateFeedPrediction } from './feedPrediction';
import { calculateGrowthProjection } from './growthProjection';
import { calculatePricingSuggestion } from './pricingSuggestion';
import { calculateOrderProfitability } from './orderProfitability';

export interface AIInsight {
  id?: string;
  related_batch_id?: string;
  insight_type: string;
  insight_value: any;
  created_at?: string;
}

/**
 * Recalculate all AI insights for all batches and orders
 */
export async function recalculateAllInsights(): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClientServiceRole();
    
    // Get all active batches
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('id')
      .eq('is_deleted', false)
      .neq('status', 'CLOSED');
    
    if (batchesError) {
      throw new Error(`Error fetching batches: ${batchesError.message}`);
    }
    
    // Get all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('is_deleted', false);
    
    if (ordersError) {
      throw new Error(`Error fetching orders: ${ordersError.message}`);
    }
    
    // Process all batches
    for (const batch of batches) {
      await processBatchInsights(batch.id);
    }
    
    // Process all orders
    for (const order of orders) {
      await processOrderInsights(order.id);
    }
    
    return { success: true, message: `Processed insights for ${batches.length} batches and ${orders.length} orders` };
  } catch (error) {
    console.error('Error recalculating all insights:', error);
    return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Process AI insights for a specific batch
 */
export async function processBatchInsights(batchId: string): Promise<void> {
  try {
    // Calculate all batch-related insights
    const feedPrediction = await calculateFeedPrediction(batchId);
    const growthProjection = await calculateGrowthProjection(batchId);
    const pricingSuggestion = await calculatePricingSuggestion(batchId);
    
    // Save insights to database
    const insightsToSave: AIInsight[] = [];
    
    if (feedPrediction) {
      insightsToSave.push({
        related_batch_id: batchId,
        insight_type: 'feed_prediction',
        insight_value: feedPrediction
      });
    }
    
    if (growthProjection) {
      insightsToSave.push({
        related_batch_id: batchId,
        insight_type: 'growth_projection',
        insight_value: growthProjection
      });
    }
    
    if (pricingSuggestion) {
      insightsToSave.push({
        related_batch_id: batchId,
        insight_type: 'pricing_suggestion',
        insight_value: pricingSuggestion
      });
    }
    
    // Save insights to database
    if (insightsToSave.length > 0) {
      const supabase = createClientServiceRole();
      
      // Delete existing insights for this batch
      await supabase
        .from('ai_insights')
        .delete()
        .eq('related_batch_id', batchId);
      
      // Insert new insights
      const { error } = await supabase
        .from('ai_insights')
        .insert(insightsToSave);
      
      if (error) {
        console.error('Error saving batch insights:', error);
      }
    }
  } catch (error) {
    console.error(`Error processing batch insights for ${batchId}:`, error);
  }
}

/**
 * Process AI insights for a specific order
 */
export async function processOrderInsights(orderId: string): Promise<void> {
  try {
    // Calculate order profitability
    const orderProfitability = await calculateOrderProfitability(orderId);
    
    if (orderProfitability) {
      const supabase = createClientServiceRole();
      
      // Delete existing order insights
      await supabase
        .from('ai_insights')
        .delete()
        .eq('insight_type', 'order_profitability')
        .eq('related_batch_id', orderProfitability.batchId || null);
      
      // Save new insight
      const { error } = await supabase
        .from('ai_insights')
        .insert({
          related_batch_id: orderProfitability.batchId,
          insight_type: 'order_profitability',
          insight_value: orderProfitability
        });
      
      if (error) {
        console.error('Error saving order profitability insight:', error);
      }
    }
  } catch (error) {
    console.error(`Error processing order insights for ${orderId}:`, error);
  }
}

/**
 * Get top insights for dashboard display
 */
export async function getTopInsights(limit: number = 3): Promise<AIInsight[]> {
  try {
    const supabase = createClientServiceRole();
    
    const { data: insights, error } = await supabase
      .from('ai_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Error fetching insights: ${error.message}`);
    }
    
    return insights || [];
  } catch (error) {
    console.error('Error getting top insights:', error);
    return [];
  }
}

/**
 * Get insights for a specific batch
 */
export async function getBatchInsights(batchId: string): Promise<AIInsight[]> {
  try {
    const supabase = createClientServiceRole();
    
    const { data: insights, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('related_batch_id', batchId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Error fetching batch insights: ${error.message}`);
    }
    
    return insights || [];
  } catch (error) {
    console.error(`Error getting insights for batch ${batchId}:`, error);
    return [];
  }
}