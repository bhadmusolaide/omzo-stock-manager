import { createClientServiceRole } from '@/lib/supabase';

export interface FeedPredictionInsight {
  batchId: string;
  currentLive: number;
  avgFeedPerBirdPerDayKg: number;
  remainingFeedKg: number;
  remainingDays: number;
  predictedFeedNeeded: number;
  feedWillRunOutInDays: number | null;
  insightMessage: string;
}

/**
 * Calculate feed prediction for a batch
 * Formula: (current_live * avg_feed_per_bird_per_day_kg) * remaining_days
 * Where avg_feed_per_bird_per_day_kg = 0.12 by default
 */
export async function calculateFeedPrediction(batchId: string): Promise<FeedPredictionInsight | null> {
  try {
    const supabase = createClientServiceRole();
    
    // Get batch details
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select(`
        id,
        current_live,
        feed_purchases (kg, is_deleted),
        feed_usages (kg, is_deleted)
      `)
      .eq('id', batchId)
      .single();
      
    if (batchError || !batch) {
      console.error('Error fetching batch for feed prediction:', batchError);
      return null;
    }
    
    // Calculate total feed purchased
    const totalFeedPurchased = batch.feed_purchases
      .filter((f: any) => !f.is_deleted)
      .reduce((sum: number, f: any) => sum + f.kg, 0);
    
    // Calculate total feed used
    const totalFeedUsed = batch.feed_usages
      .filter((u: any) => !u.is_deleted)
      .reduce((sum: number, u: any) => sum + u.kg, 0);
    
    // Calculate remaining feed
    const remainingFeedKg = totalFeedPurchased - totalFeedUsed;
    
    // Default values
    const currentLive = batch.current_live || 0;
    const avgFeedPerBirdPerDayKg = 0.12; // Default value
    
    // Calculate predicted feed needed per day
    const predictedFeedNeeded = currentLive * avgFeedPerBirdPerDayKg;
    
    // Calculate remaining days based on current consumption rate
    let remainingDays = 0;
    let feedWillRunOutInDays: number | null = null;
    
    if (predictedFeedNeeded > 0) {
      remainingDays = remainingFeedKg / predictedFeedNeeded;
      feedWillRunOutInDays = Math.floor(remainingDays);
    }
    
    // Generate insight message
    let insightMessage = '';
    if (feedWillRunOutInDays !== null) {
      if (feedWillRunOutInDays <= 3) {
        insightMessage = `Critical: Feed will run out in ${feedWillRunOutInDays} days`;
      } else if (feedWillRunOutInDays <= 7) {
        insightMessage = `Warning: Feed will run out in ${feedWillRunOutInDays} days`;
      } else {
        insightMessage = `Feed will last for approximately ${Math.floor(remainingDays)} days`;
      }
    } else {
      insightMessage = 'Insufficient data for feed prediction';
    }
    
    return {
      batchId,
      currentLive,
      avgFeedPerBirdPerDayKg,
      remainingFeedKg,
      remainingDays,
      predictedFeedNeeded,
      feedWillRunOutInDays,
      insightMessage
    };
  } catch (error) {
    console.error('Error calculating feed prediction:', error);
    return null;
  }
}