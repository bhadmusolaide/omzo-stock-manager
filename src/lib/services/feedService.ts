import { createClientServiceRole } from '@/lib/supabase';

/**
 * Feed Service - Handles feed purchases, usage, and related transactions
 */

// Helper function to safely create supabase client
function getSupabaseClient() {
  try {
    return createClientServiceRole();
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    throw new Error('Service unavailable: Missing Supabase configuration');
  }
}

/**
 * Create feed purchase and auto-generate transaction
 */
export async function createFeedPurchaseWithTransaction(
  data: {
    batchId: string;
    feedType: string;
    kg: number;
    unitCost: number;
    supplier?: string;
    purchaseDate: Date;
    notes?: string;
  },
  userId?: string
) {
  const supabase = getSupabaseClient();

  // Validate batch exists and is not deleted
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('*')
    .eq('id', data.batchId)
    .single();

  if (batchError) throw batchError;

  if (!batch) {
    throw new Error(`Batch ${data.batchId} not found`);
  }

  if (batch.is_deleted) {
    throw new Error(`Batch ${data.batchId} is deleted`);
  }

  const totalCost = data.kg * data.unitCost;

  // Create feed purchase
  const { data: feedPurchase, error: feedError } = await supabase
    .from('feed_purchases')
    .insert({
      batch_id: data.batchId,
      feed_type: data.feedType,
      kg: data.kg,
      unit_cost: data.unitCost,
      total_cost: totalCost,
      supplier: data.supplier,
      purchase_date: new Date(data.purchaseDate).toISOString(),
      notes: data.notes,
      created_by: userId,
    })
    .select()
    .single();

  if (feedError) throw feedError;

  // Auto-create transaction
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      date: new Date().toISOString(),
      description: `Feed Purchase: ${data.feedType} - ${data.kg}kg from ${data.supplier || 'Unknown'}`,
      amount: totalCost,
      type: 'DEBIT',
      category: 'FEED',
      linked_batch_id: data.batchId,
      linked_feed_id: feedPurchase.id,
      created_by: userId,
    });

  if (transactionError) throw transactionError;

  return feedPurchase;
}

/**
 * Record feed usage and deduct from batch
 */
export async function recordFeedUsage(
  data: {
    batchId: string;
    feedId: string;
    kg: number;
    date: Date;
    notes?: string;
  },
  userId?: string
) {
  const supabase = getSupabaseClient();

  // Validate batch and feed exist
  const [batchResult, feedResult] = await Promise.all([
    supabase
      .from('batches')
      .select('*')
      .eq('id', data.batchId)
      .single(),
    supabase
      .from('feed_purchases')
      .select('*')
      .eq('id', data.feedId)
      .single(),
  ]);

  if (batchResult.error) throw batchResult.error;
  if (feedResult.error) throw feedResult.error;

  const batch = batchResult.data;
  const feed = feedResult.data;

  if (!batch) {
    throw new Error(`Batch ${data.batchId} not found`);
  }

  if (!feed) {
    throw new Error(`Feed purchase ${data.feedId} not found`);
  }

  if (batch.is_deleted || feed.is_deleted) {
    throw new Error('Cannot record usage on deleted records');
  }

  // Check if feed belongs to batch
  if (feed.batch_id !== data.batchId) {
    throw new Error('Feed purchase does not belong to this batch');
  }

  // Record feed usage
  const { data: feedUsage, error } = await supabase
    .from('feed_usages')
    .insert({
      batch_id: data.batchId,
      feed_id: data.feedId,
      kg: data.kg,
      date: new Date(data.date).toISOString(),
      notes: data.notes,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  return feedUsage;
}

/**
 * Get total feed purchased for batch
 */
export async function getTotalFeedPurchased(batchId: string): Promise<number> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('feed_purchases')
      .select('kg')
      .eq('batch_id', batchId)
      .eq('is_deleted', false);

    if (error) throw error;

    return data.reduce((sum, f) => sum + f.kg, 0);
  } catch (error) {
    console.error('Error getting total feed purchased:', error);
    // Return 0 as fallback to prevent app crash
    return 0;
  }
}

/**
 * Get total feed used for batch
 */
export async function getTotalFeedUsed(batchId: string): Promise<number> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('feed_usages')
      .select('kg')
      .eq('batch_id', batchId)
      .eq('is_deleted', false);

    if (error) throw error;

    return data.reduce((sum, f) => sum + f.kg, 0);
  } catch (error) {
    console.error('Error getting total feed used:', error);
    // Return 0 as fallback to prevent app crash
    return 0;
  }
}

/**
 * Get remaining feed for batch
 */
export async function getRemainingFeed(batchId: string): Promise<number> {
  try {
    const [purchased, used] = await Promise.all([
      getTotalFeedPurchased(batchId),
      getTotalFeedUsed(batchId),
    ]);

    return purchased - used;
  } catch (error) {
    console.error('Error calculating remaining feed:', error);
    // Return 0 as fallback to prevent app crash
    return 0;
  }
}

/**
 * Check if feed stock is low
 */
export async function isLowStock(batchId: string, threshold: number): Promise<boolean> {
  try {
    const remaining = await getRemainingFeed(batchId);
    return remaining < threshold;
  } catch (error) {
    console.error('Error checking low stock:', error);
    // Return false as fallback to prevent app crash
    return false;
  }
}

/**
 * Soft delete feed purchase
 */
export async function softDeleteFeedPurchase(feedId: string, userId?: string) {
  const supabase = getSupabaseClient();

  // Soft delete feed purchase
  const { error: feedError } = await supabase
    .from('feed_purchases')
    .update({ 
      is_deleted: true, 
      updated_by: userId 
    })
    .eq('id', feedId);

  if (feedError) throw feedError;

  // Soft delete related transactions
  const { error: transactionError } = await supabase
    .from('transactions')
    .update({ 
      is_deleted: true, 
      updated_by: userId 
    })
    .eq('linked_feed_id', feedId);

  if (transactionError) throw transactionError;

  // Soft delete related feed usages
  const { error: usageError } = await supabase
    .from('feed_usages')
    .update({ 
      is_deleted: true, 
      updated_by: userId 
    })
    .eq('feed_id', feedId);

  if (usageError) throw usageError;

  return { success: true, feedId };
}