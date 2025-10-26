import { createClientServiceRole } from '@/lib/supabase';

export interface PricingSuggestionInsight {
  batchId: string;
  effectiveUnitCost: number;
  targetMarginPercent: number;
  suggestedUnitPrice: number;
  currentDressedStockKg: number;
  insightMessage: string;
}

/**
 * Calculate pricing suggestion for dressed chicken
 * Formula: effective_unit_cost + (effective_unit_cost * target_margin_percent)
 * Default target_margin_percent = 25
 */
export async function calculatePricingSuggestion(batchId: string): Promise<PricingSuggestionInsight | null> {
  try {
    const supabase = createClientServiceRole();
    
    // Get batch details
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select(`
        id,
        effective_unit_cost,
        processing_outputs (
          quantity,
          output_type
        )
      `)
      .eq('id', batchId)
      .single();
      
    if (batchError || !batch) {
      console.error('Error fetching batch for pricing suggestion:', batchError);
      return null;
    }
    
    // Calculate current dressed stock (processed chicken)
    const currentDressedStockKg = batch.processing_outputs
      .filter((p: any) => p.output_type === 'DRESSED')
      .reduce((sum: number, p: any) => sum + p.quantity, 0);
    
    // Default values
    const effectiveUnitCost = batch.effective_unit_cost || 0;
    const targetMarginPercent = 25; // Default 25% margin
    
    // Calculate suggested unit price
    const suggestedUnitPrice = effectiveUnitCost + (effectiveUnitCost * (targetMarginPercent / 100));
    
    // Generate insight message
    let insightMessage = '';
    if (effectiveUnitCost > 0) {
      insightMessage = `Suggested price: ₦${suggestedUnitPrice.toFixed(2)} per kg with ${targetMarginPercent}% margin. Current dressed stock: ${currentDressedStockKg.toFixed(2)}kg`;
    } else {
      insightMessage = 'Insufficient data for pricing suggestion';
    }
    
    return {
      batchId,
      effectiveUnitCost,
      targetMarginPercent,
      suggestedUnitPrice,
      currentDressedStockKg,
      insightMessage
    };
  } catch (error) {
    console.error('Error calculating pricing suggestion:', error);
    return null;
  }
}