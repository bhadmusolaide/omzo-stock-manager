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

// ============================================
// FEED BORROWING FUNCTIONS
// ============================================

export interface FeedBorrow {
  id: string;
  source_batch_id: string;
  target_batch_id: string;
  feed_purchase_id: string | null;
  feed_type: string;
  kg_borrowed: number;
  cost_value: number;
  borrow_date: string;
  status: 'PENDING' | 'SETTLED' | 'CANCELLED';
  settled_date: string | null;
  settled_method: 'RETURNED' | 'PURCHASED' | 'WRITTEN_OFF' | null;
  notes: string | null;
  source_batch?: { id: string; name: string };
  target_batch?: { id: string; name: string };
}

/**
 * Get total feed borrowed OUT from a batch (lent to others)
 */
export async function getTotalFeedBorrowedOut(batchId: string): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('feed_borrows')
      .select('kg_borrowed')
      .eq('source_batch_id', batchId)
      .eq('is_deleted', false)
      .in('status', ['PENDING']);

    if (error) throw error;
    return data.reduce((sum, b) => sum + Number(b.kg_borrowed), 0);
  } catch (error) {
    console.error('Error getting total feed borrowed out:', error);
    return 0;
  }
}

/**
 * Get total feed borrowed IN to a batch (received from others)
 */
export async function getTotalFeedBorrowedIn(batchId: string): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('feed_borrows')
      .select('kg_borrowed')
      .eq('target_batch_id', batchId)
      .eq('is_deleted', false)
      .in('status', ['PENDING']);

    if (error) throw error;
    return data.reduce((sum, b) => sum + Number(b.kg_borrowed), 0);
  } catch (error) {
    console.error('Error getting total feed borrowed in:', error);
    return 0;
  }
}

/**
 * Get remaining feed for batch including borrows
 */
export async function getRemainingFeedWithBorrows(batchId: string) {
  try {
    const [purchased, used, borrowedOut, borrowedIn] = await Promise.all([
      getTotalFeedPurchased(batchId),
      getTotalFeedUsed(batchId),
      getTotalFeedBorrowedOut(batchId),
      getTotalFeedBorrowedIn(batchId),
    ]);

    const remaining = purchased - used - borrowedOut + borrowedIn;
    const netBorrowBalance = borrowedIn - borrowedOut;

    return {
      purchased,
      used,
      borrowedOut,
      borrowedIn,
      remaining,
      netBorrowBalance,
    };
  } catch (error) {
    console.error('Error calculating remaining feed with borrows:', error);
    return {
      purchased: 0,
      used: 0,
      borrowedOut: 0,
      borrowedIn: 0,
      remaining: 0,
      netBorrowBalance: 0,
    };
  }
}

/**
 * Get feed availability by type for a batch
 * Returns purchased, used, borrowed out, borrowed in, and available amounts per feed type
 */
export async function getFeedAvailabilityByType(batchId: string) {
  try {
    const supabase = getSupabaseClient();

    // Get all feed purchases by type
    const { data: purchases, error: purchaseError } = await supabase
      .from('feed_purchases')
      .select('feed_type, kg, total_cost')
      .eq('batch_id', batchId)
      .eq('is_deleted', false);

    if (purchaseError) throw purchaseError;

    // Get all feed usages by type (through feed_purchases)
    const { data: usages, error: usageError } = await supabase
      .from('feed_usages')
      .select('kg, feed_purchases!inner(feed_type)')
      .eq('batch_id', batchId)
      .eq('is_deleted', false);

    if (usageError) throw usageError;

    // Get pending borrows lent out by type
    const { data: borrowsOut, error: borrowsOutError } = await supabase
      .from('feed_borrows')
      .select('feed_type, kg_borrowed')
      .eq('source_batch_id', batchId)
      .eq('status', 'PENDING')
      .eq('is_deleted', false);

    if (borrowsOutError) throw borrowsOutError;

    // Get pending borrows received by type
    const { data: borrowsIn, error: borrowsInError } = await supabase
      .from('feed_borrows')
      .select('feed_type, kg_borrowed')
      .eq('target_batch_id', batchId)
      .eq('status', 'PENDING')
      .eq('is_deleted', false);

    if (borrowsInError) throw borrowsInError;

    // Initialize availability by type
    const feedTypes = ['STARTER', 'GROWER', 'FINISHER'] as const;
    const availability: Record<string, {
      purchased: number;
      used: number;
      borrowedOut: number;
      borrowedIn: number;
      available: number;
      avgCostPerKg: number;
    }> = {};

    for (const type of feedTypes) {
      const typePurchases = (purchases || []).filter(p => p.feed_type === type);
      const purchasedKg = typePurchases.reduce((sum, p) => sum + Number(p.kg || 0), 0);
      const purchasedCost = typePurchases.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);

      const usedKg = (usages || [])
        .filter((u: any) => u.feed_purchases?.feed_type === type)
        .reduce((sum, u) => sum + Number(u.kg || 0), 0);

      const borrowedOutKg = (borrowsOut || [])
        .filter(b => b.feed_type === type)
        .reduce((sum, b) => sum + Number(b.kg_borrowed || 0), 0);

      const borrowedInKg = (borrowsIn || [])
        .filter(b => b.feed_type === type)
        .reduce((sum, b) => sum + Number(b.kg_borrowed || 0), 0);

      availability[type] = {
        purchased: purchasedKg,
        used: usedKg,
        borrowedOut: borrowedOutKg,
        borrowedIn: borrowedInKg,
        available: purchasedKg - usedKg - borrowedOutKg + borrowedInKg,
        avgCostPerKg: purchasedKg > 0 ? purchasedCost / purchasedKg : 0,
      };
    }

    // Calculate totals
    const totalPurchased = Object.values(availability).reduce((sum, a) => sum + a.purchased, 0);
    const totalUsed = Object.values(availability).reduce((sum, a) => sum + a.used, 0);
    const totalBorrowedOut = Object.values(availability).reduce((sum, a) => sum + a.borrowedOut, 0);
    const totalBorrowedIn = Object.values(availability).reduce((sum, a) => sum + a.borrowedIn, 0);
    const totalAvailable = Object.values(availability).reduce((sum, a) => sum + a.available, 0);

    return {
      byType: availability,
      totals: {
        purchased: totalPurchased,
        used: totalUsed,
        borrowedOut: totalBorrowedOut,
        borrowedIn: totalBorrowedIn,
        available: totalAvailable,
      },
    };
  } catch (error) {
    console.error('Error getting feed availability by type:', error);
    return {
      byType: {
        STARTER: { purchased: 0, used: 0, borrowedOut: 0, borrowedIn: 0, available: 0, avgCostPerKg: 0 },
        GROWER: { purchased: 0, used: 0, borrowedOut: 0, borrowedIn: 0, available: 0, avgCostPerKg: 0 },
        FINISHER: { purchased: 0, used: 0, borrowedOut: 0, borrowedIn: 0, available: 0, avgCostPerKg: 0 },
      },
      totals: { purchased: 0, used: 0, borrowedOut: 0, borrowedIn: 0, available: 0 },
    };
  }
}

/**
 * Get average feed cost per kg for a batch
 */
export async function getAvgFeedCostPerKg(batchId: string): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('feed_purchases')
      .select('kg, total_cost')
      .eq('batch_id', batchId)
      .eq('is_deleted', false);

    if (error) throw error;

    const totalKg = data.reduce((sum, f) => sum + Number(f.kg), 0);
    const totalCost = data.reduce((sum, f) => sum + Number(f.total_cost), 0);

    return totalKg > 0 ? totalCost / totalKg : 0;
  } catch (error) {
    console.error('Error calculating avg feed cost:', error);
    return 0;
  }
}

/**
 * Create a feed borrow transaction
 */
export async function createFeedBorrow(
  data: {
    sourceBatchId: string;
    targetBatchId: string;
    feedType: string;
    kg: number;
    feedPurchaseId?: string;
    notes?: string;
  },
  userId?: string
) {
  const supabase = getSupabaseClient();

  // Validate batches exist and are not deleted/closed
  const [sourceResult, targetResult] = await Promise.all([
    supabase.from('batches').select('*').eq('id', data.sourceBatchId).single(),
    supabase.from('batches').select('*').eq('id', data.targetBatchId).single(),
  ]);

  if (sourceResult.error) throw sourceResult.error;
  if (targetResult.error) throw targetResult.error;

  const sourceBatch = sourceResult.data;
  const targetBatch = targetResult.data;

  if (!sourceBatch || sourceBatch.is_deleted) {
    throw new Error('Source batch not found or deleted');
  }
  if (!targetBatch || targetBatch.is_deleted) {
    throw new Error('Target batch not found or deleted');
  }
  if (sourceBatch.status === 'CLOSED') {
    throw new Error('Cannot borrow from a closed batch');
  }
  if (targetBatch.status === 'CLOSED') {
    throw new Error('Cannot borrow to a closed batch');
  }
  if (data.sourceBatchId === data.targetBatchId) {
    throw new Error('Cannot borrow from the same batch');
  }

  // Check if source batch has enough feed
  const feedStats = await getRemainingFeedWithBorrows(data.sourceBatchId);
  if (feedStats.remaining < data.kg) {
    throw new Error(
      `Insufficient feed in source batch. Available: ${feedStats.remaining.toFixed(2)} kg`
    );
  }

  // Calculate cost value based on average cost
  const avgCostPerKg = await getAvgFeedCostPerKg(data.sourceBatchId);
  const costValue = data.kg * avgCostPerKg;

  // Create feed borrow record
  const { data: feedBorrow, error } = await supabase
    .from('feed_borrows')
    .insert({
      source_batch_id: data.sourceBatchId,
      target_batch_id: data.targetBatchId,
      feed_purchase_id: data.feedPurchaseId || null,
      feed_type: data.feedType,
      kg_borrowed: data.kg,
      cost_value: costValue,
      borrow_date: new Date().toISOString(),
      status: 'PENDING',
      notes: data.notes,
      created_by: userId,
    })
    .select(`
      *,
      source_batch:batches!source_batch_id(id, name),
      target_batch:batches!target_batch_id(id, name)
    `)
    .single();

  if (error) throw error;

  return feedBorrow;
}

/**
 * Settle a feed borrow
 */
export async function settleFeedBorrow(
  borrowId: string,
  method: 'RETURNED' | 'PURCHASED' | 'WRITTEN_OFF',
  userId?: string
) {
  const supabase = getSupabaseClient();

  // Verify borrow exists and is pending
  const { data: existingBorrow, error: fetchError } = await supabase
    .from('feed_borrows')
    .select('*')
    .eq('id', borrowId)
    .eq('is_deleted', false)
    .single();

  if (fetchError) throw fetchError;
  if (!existingBorrow) throw new Error('Feed borrow not found');
  if (existingBorrow.status !== 'PENDING') {
    throw new Error('Feed borrow is already settled or cancelled');
  }

  const { data: updatedBorrow, error } = await supabase
    .from('feed_borrows')
    .update({
      status: 'SETTLED',
      settled_date: new Date().toISOString(),
      settled_method: method,
      updated_by: userId,
    })
    .eq('id', borrowId)
    .select(`
      *,
      source_batch:batches!source_batch_id(id, name),
      target_batch:batches!target_batch_id(id, name)
    `)
    .single();

  if (error) throw error;

  return updatedBorrow;
}

/**
 * Cancel a feed borrow
 */
export async function cancelFeedBorrow(borrowId: string, userId?: string) {
  const supabase = getSupabaseClient();

  const { data: existingBorrow, error: fetchError } = await supabase
    .from('feed_borrows')
    .select('*')
    .eq('id', borrowId)
    .eq('is_deleted', false)
    .single();

  if (fetchError) throw fetchError;
  if (!existingBorrow) throw new Error('Feed borrow not found');
  if (existingBorrow.status !== 'PENDING') {
    throw new Error('Only pending borrows can be cancelled');
  }

  const { data: updatedBorrow, error } = await supabase
    .from('feed_borrows')
    .update({
      status: 'CANCELLED',
      updated_by: userId,
    })
    .eq('id', borrowId)
    .select()
    .single();

  if (error) throw error;

  return updatedBorrow;
}

/**
 * Get all feed borrows for a batch (both as source and target)
 */
export async function getFeedBorrowsForBatch(batchId: string) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('feed_borrows')
      .select(`
        *,
        source_batch:batches!source_batch_id(id, name),
        target_batch:batches!target_batch_id(id, name)
      `)
      .or(`source_batch_id.eq.${batchId},target_batch_id.eq.${batchId}`)
      .eq('is_deleted', false)
      .order('borrow_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching feed borrows for batch:', error);
    return [];
  }
}

/**
 * Get all pending feed borrows
 */
export async function getAllPendingBorrows() {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('feed_borrows')
      .select(`
        *,
        source_batch:batches!source_batch_id(id, name),
        target_batch:batches!target_batch_id(id, name)
      `)
      .eq('status', 'PENDING')
      .eq('is_deleted', false)
      .order('borrow_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching pending borrows:', error);
    return [];
  }
}

/**
 * Get feed borrow statistics for a batch
 * Returns the total feed lent out (as source) and borrowed in (as target)
 */
export async function getFeedBorrowStats(batchId: string) {
  try {
    const supabase = getSupabaseClient();

    // Get borrows where this batch is the source (lent out)
    const { data: lentData, error: lentError } = await supabase
      .from('feed_borrows')
      .select('kg_borrowed, cost_value, status')
      .eq('source_batch_id', batchId)
      .eq('is_deleted', false);

    if (lentError) throw lentError;

    // Get borrows where this batch is the target (borrowed in)
    const { data: borrowedData, error: borrowedError } = await supabase
      .from('feed_borrows')
      .select('kg_borrowed, cost_value, status')
      .eq('target_batch_id', batchId)
      .eq('is_deleted', false);

    if (borrowedError) throw borrowedError;

    // Calculate totals (only pending borrows affect available stock)
    const totalLent = (lentData || [])
      .filter(b => b.status === 'PENDING')
      .reduce((sum, b) => sum + (b.kg_borrowed || 0), 0);

    const totalBorrowed = (borrowedData || [])
      .filter(b => b.status === 'PENDING')
      .reduce((sum, b) => sum + (b.kg_borrowed || 0), 0);

    const totalLentValue = (lentData || [])
      .filter(b => b.status === 'PENDING')
      .reduce((sum, b) => sum + (b.cost_value || 0), 0);

    const totalBorrowedValue = (borrowedData || [])
      .filter(b => b.status === 'PENDING')
      .reduce((sum, b) => sum + (b.cost_value || 0), 0);

    return {
      lent: {
        kg: totalLent,
        value: totalLentValue,
        count: (lentData || []).filter(b => b.status === 'PENDING').length,
      },
      borrowed: {
        kg: totalBorrowed,
        value: totalBorrowedValue,
        count: (borrowedData || []).filter(b => b.status === 'PENDING').length,
      },
      netPosition: totalBorrowed - totalLent, // Positive = net borrower, Negative = net lender
    };
  } catch (error) {
    console.error('Error fetching feed borrow stats:', error);
    return {
      lent: { kg: 0, value: 0, count: 0 },
      borrowed: { kg: 0, value: 0, count: 0 },
      netPosition: 0,
    };
  }
}