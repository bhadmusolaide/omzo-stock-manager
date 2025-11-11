import { createClientServiceRole } from '@/lib/supabase';

export interface GrowthProjectionInsight {
  batchId: string;
  currentLive: number;
  totalWeightKg: number;
  avgDailyWeightGain: number;
  projectedWeightIn7Days: number;
  projectedTotalWeightIn7Days: number;
  insightMessage: string;
}

/**
 * Calculate growth projection for a batch
 * Estimate average daily weight gain from existing batch data
 * Predict total weight after 7 days
 */
export async function calculateGrowthProjection(batchId: string): Promise<GrowthProjectionInsight | null> {
  try {
    const supabase = createClientServiceRole();
    
    // Get batch details
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select(`
        id,
        current_live,
        total_weight_kg,
        created_at,
        updated_at
      `)
      .eq('id', batchId)
      .single();
      
    if (batchError || !batch) {
      console.error('Error fetching batch for growth projection:', batchError);
      return null;
    }
    
    // Calculate batch age in days
    const startDate = new Date(batch.created_at);
    const currentDate = new Date();
    const batchAgeInDays = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate average daily weight gain per bird
    const currentLive = batch.current_live || 0;
    const totalWeightKg = batch.total_weight_kg || 0;
    let avgDailyWeightGain = 0;
    
    if (batchAgeInDays > 0 && currentLive > 0) {
      // Average weight per bird
      const avgWeightPerBird = totalWeightKg / currentLive;
      // Average daily weight gain per bird (assuming starting from ~0.04kg for day-old chicks)
      avgDailyWeightGain = (avgWeightPerBird - 0.04) / batchAgeInDays;
    }
    
    // Project weight in 7 days
    const projectedWeightIn7Days = (avgDailyWeightGain * 7) + (totalWeightKg / Math.max(currentLive, 1));
    const projectedTotalWeightIn7Days = projectedWeightIn7Days * currentLive;
    
    // Generate insight message
    let insightMessage = '';
    if (avgDailyWeightGain > 0) {
      const growthRate = avgDailyWeightGain * 1000; // Convert to grams
      insightMessage = `Average daily weight gain: ${growthRate.toFixed(2)}g per bird. Projected total weight in 7 days: ${projectedTotalWeightIn7Days.toFixed(2)}kg`;
    } else {
      insightMessage = 'Insufficient data for growth projection';
    }
    
    return {
      batchId,
      currentLive,
      totalWeightKg,
      avgDailyWeightGain,
      projectedWeightIn7Days,
      projectedTotalWeightIn7Days,
      insightMessage
    };
  } catch (error) {
    console.error('Error calculating growth projection:', error);
    return null;
  }
}