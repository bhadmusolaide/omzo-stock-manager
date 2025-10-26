import { createClientServiceRole } from '@/lib/supabase';

/**
 * Batch Service - Handles batch lifecycle and related operations
 */

export interface BatchSummary {
  batchId: string;
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  mortalityRate: number;
  feedCostPerKg: number;
  avgWeightPerBird: number;
  fcr: number;
}

/**
 * Get batch with all related data
 */
export async function getBatchWithRelations(batchId: string) {
  const supabase = createClientServiceRole();

  const { data: batch, error } = await supabase
    .from('batches')
    .select(`
      *,
      feed_purchases (
        *
      ),
      feed_usages (
        *
      ),
      mortality_records (
        *
      ),
      processing_outputs (
        *
      ),
      expenses (
        *
      ),
      transactions (
        *
      ),
      orders (
        *,
        order_items (
          *
        )
      )
    `)
    .eq('id', batchId)
    .eq('is_deleted', false)
    .single();

  if (error) throw error;

  return batch;
}

/**
 * Calculate batch summary metrics
 */
export async function calculateBatchSummary(batchId: string): Promise<BatchSummary> {
  const batch = await getBatchWithRelations(batchId);

  if (!batch) {
    throw new Error(`Batch ${batchId} not found`);
  }

  // Calculate income from credit transactions
  const totalIncome = batch.transactions
    .filter((t: Record<string, unknown>) => (t as { type: string }).type === 'CREDIT')
    .reduce((sum: number, t: Record<string, unknown>) => sum + Number((t as { amount: number }).amount), 0);

  // Calculate expenses from debit transactions
  const totalExpenses = batch.transactions
    .filter((t: Record<string, unknown>) => (t as { type: string }).type === 'DEBIT')
    .reduce((sum: number, t: Record<string, unknown>) => sum + Number((t as { amount: number }).amount), 0);

  const profit = totalIncome - totalExpenses;

  // Calculate mortality rate
  const mortalityRate = (batch.initial_chick_count ?? 0) > 0 ? ((batch.total_mortality ?? 0) / (batch.initial_chick_count ?? 0)) * 100 : 0;

  // Calculate feed cost per kg
  const totalFeedKg = batch.feed_purchases.reduce((sum: number, f: Record<string, unknown>) => sum + Number((f as { kg: number }).kg), 0);
  const totalFeedCost = batch.feed_purchases.reduce((sum: number, f: Record<string, unknown>) => sum + Number((f as { total_cost: number }).total_cost), 0);
  const feedCostPerKg = totalFeedKg > 0 ? totalFeedCost / totalFeedKg : 0;

  // Calculate average weight per bird
  const avgWeightPerBird = (batch.current_live ?? 0) > 0 ? (batch.total_weight_kg ?? 0) / (batch.current_live ?? 0) : 0;

  // Calculate FCR (Feed Conversion Ratio)
  const totalWeightGained = batch.total_weight_kg ?? 0;
  const fcr = totalWeightGained > 0 ? totalFeedKg / totalWeightGained : 0;

  return {
    batchId,
    totalIncome,
    totalExpenses,
    profit,
    mortalityRate,
    feedCostPerKg,
    avgWeightPerBird,
    fcr,
  };
}

/**
 * Close batch and generate summary
 */
export async function closeBatch(batchId: string, userId?: string) {
  const batch = await getBatchWithRelations(batchId);

  if (!batch) {
    throw new Error(`Batch ${batchId} not found`);
  }

  if (batch.status === 'CLOSED') {
    throw new Error('Batch is already closed');
  }

  // Calculate summary
  const summary = await calculateBatchSummary(batchId);

  const supabase = createClientServiceRole();

  const { data: updatedBatch, error } = await supabase
    .from('batches')
    .update({ 
      status: 'CLOSED',
      updated_by: userId 
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;

  return { batch: updatedBatch, summary };
}

/**
 * Soft delete batch and related records
 */
export async function softDeleteBatch(batchId: string, userId?: string) {
  try {
    console.log(`Starting soft delete for batch: ${batchId}`);
    const supabase = createClientServiceRole();

    // First, verify the batch exists (allow already deleted batches)
    const { data: existingBatch, error: fetchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching batch for deletion:', fetchError);
      throw new Error(`Failed to fetch batch: ${fetchError.message}`);
    }

    if (!existingBatch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    // Log if batch is already deleted but continue with deletion
    if (existingBatch.is_deleted) {
      console.log(`Batch ${batchId} is already deleted, proceeding with re-deletion`);
    }

    console.log(`Batch found, proceeding with soft delete: ${existingBatch.name}`);

    // Soft delete batch
    const { error: batchError } = await supabase
      .from('batches')
      .update({
        is_deleted: true,
        updated_by: userId
      })
      .eq('id', batchId);

    if (batchError) {
      console.error('Error updating batch:', batchError);
      throw new Error(`Failed to delete batch: ${batchError.message}`);
    }

    console.log('Batch marked as deleted, updating related records...');

    // Soft delete related records (continue even if some fail)
    const updatePromises = [
      { table: 'batches', column: 'id', query: supabase.from('batches').update({ is_deleted: true, updated_by: userId }).eq('id', batchId) },
      { table: 'feed_purchases', column: 'batch_id', query: supabase.from('feed_purchases').update({ is_deleted: true, updated_by: userId }).eq('batch_id', batchId) },
      { table: 'feed_usages', column: 'batch_id', query: supabase.from('feed_usages').update({ is_deleted: true, updated_by: userId }).eq('batch_id', batchId) },
      { table: 'mortality_records', column: 'batch_id', query: supabase.from('mortality_records').update({ is_deleted: true, updated_by: userId }).eq('batch_id', batchId) },
      { table: 'processing_outputs', column: 'batch_id', query: supabase.from('processing_outputs').update({ is_deleted: true, updated_by: userId }).eq('batch_id', batchId) },
      { table: 'expenses', column: 'batch_id', query: supabase.from('expenses').update({ is_deleted: true, updated_by: userId }).eq('batch_id', batchId) },
      { table: 'transactions', column: 'linked_batch_id', query: supabase.from('transactions').update({ is_deleted: true, updated_by: userId }).eq('linked_batch_id', batchId) },
      { table: 'orders', column: 'linked_batch_id', query: supabase.from('orders').update({ is_deleted: true, updated_by: userId }).eq('linked_batch_id', batchId) },
    ];

    console.log('Updating related records...');
    for (const { table, query } of updatePromises) {
      try {
        const result = await query;
        if (result.error) {
          console.warn(`Warning: Failed to update ${table}:`, result.error.message);
        } else {
          console.log(`Successfully updated ${table}`);
        }
      } catch (error) {
        console.warn(`Warning: Exception updating ${table}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log(`Soft delete completed successfully for batch: ${batchId}`);
    return { success: true, batchId };
  } catch (error) {
    console.error('Soft delete failed:', error);
    throw error;
  }
}

/**
 * Validate batch state before operations
 */
export async function validateBatchState(batchId: string, requiredStatus?: string) {
  const supabase = createClientServiceRole();

  const { data: batch, error } = await supabase
    .from('batches')
    .select('*')
    .eq('id', batchId)
    .maybeSingle();

  if (error) throw error;

  if (!batch) {
    throw new Error(`Batch ${batchId} not found`);
  }

  if (batch.is_deleted) {
    throw new Error(`Batch ${batchId} is deleted`);
  }

  if (requiredStatus && batch.status !== requiredStatus) {
    throw new Error(`Batch must be in ${requiredStatus} status, current: ${batch.status}`);
  }

  return batch;
}
