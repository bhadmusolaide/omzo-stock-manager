import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const updateBatchSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  docPurchasedCount: z.number().int().min(0).optional(),
  docFreeCount: z.number().int().min(0).optional(),
  totalDocCost: z.number().min(0).optional(),
  status: z.enum(['BROODING', 'GROWING', 'PROCESSING', 'CLOSED']).optional(),
  currentLive: z.number().int().min(0).optional(),
  totalMortality: z.number().int().min(0).optional(),
  totalWeightKg: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClientServiceRole();

    const { data: batch, error } = await supabase
      .from('batches')
      .select('*')
      .eq('is_deleted', false)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('GET batch error:', error);
      throw error;
    }

    if (!batch) {
      console.log(`GET: Batch ${id} not found or deleted`);
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Transform to camelCase
    const transformedBatch = {
      id: batch.id,
      name: batch.name,
      docPurchasedCount: batch.doc_purchased_count,
      docFreeCount: batch.doc_free_count,
      totalDocCost: batch.total_doc_cost,
      initialChickCount: batch.initial_chick_count,
      currentLive: batch.current_live,
      totalMortality: batch.total_mortality,
      totalWeightKg: batch.total_weight_kg,
      effectiveUnitCost: batch.effective_unit_cost,
      startDate: batch.start_date,
      status: batch.status,
      notes: batch.notes,
      createdAt: batch.created_at,
      updatedAt: batch.updated_at,
    };

    return NextResponse.json(transformedBatch);
  } catch (error) {
    console.error('Error fetching batch:', error);
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateBatchSchema.parse(body);

    const supabase = createClientServiceRole();

    // Fetch the existing batch to get current values
    const { data: existingBatch, error: fetchError } = await supabase
      .from('batches')
      .select('*')
      .eq('is_deleted', false)
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingBatch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Fetch total processed birds for this batch
    const { data: processingData, error: processingError } = await supabase
      .from('processing_events')
      .select('live_birds_processed')
      .eq('batch_id', id);

    if (processingError) throw processingError;
    const totalProcessed = processingData?.reduce((sum, event) => sum + event.live_birds_processed, 0) || 0;

    // Compute new initial_chick_count and effective_unit_cost if doc counts or cost provided
    let initial_chick_count: number | undefined = existingBatch.initial_chick_count || 0;
    let effective_unit_cost: number | undefined = existingBatch.effective_unit_cost || 0;
    if (validatedData.docPurchasedCount !== undefined || validatedData.docFreeCount !== undefined || validatedData.totalDocCost !== undefined) {
      const newPurchased = validatedData.docPurchasedCount ?? (existingBatch.doc_purchased_count || 0);
      const newFree = validatedData.docFreeCount ?? (existingBatch.doc_free_count || 0);
      const newTotalCost = validatedData.totalDocCost ?? (existingBatch.total_doc_cost || 0);
      initial_chick_count = newPurchased + newFree;
      effective_unit_cost = newPurchased > 0 ? newTotalCost / newPurchased : 0;
    }

    // Handle current_live updates carefully to preserve processing deductions
    let current_live: number | undefined;

    if (validatedData.currentLive !== undefined) {
      // Explicit currentLive always takes priority — user is manually correcting the value
      current_live = validatedData.currentLive;
    } else if (validatedData.totalMortality !== undefined) {
      // Auto-calculate only when currentLive is NOT explicitly provided
      const initialCount = initial_chick_count ?? (existingBatch.initial_chick_count || 0);
      current_live = Math.max(0, initialCount - validatedData.totalMortality - totalProcessed);
    } else {
      // Preserve the existing current_live value
      current_live = existingBatch.current_live || 0;
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (validatedData.name !== undefined) updatePayload.name = validatedData.name;
    if (validatedData.startDate !== undefined) updatePayload.start_date = validatedData.startDate;
    if (validatedData.docPurchasedCount !== undefined) updatePayload.doc_purchased_count = validatedData.docPurchasedCount;
    if (validatedData.docFreeCount !== undefined) updatePayload.doc_free_count = validatedData.docFreeCount;
    if (validatedData.totalDocCost !== undefined) updatePayload.total_doc_cost = validatedData.totalDocCost;
    if (initial_chick_count !== undefined) updatePayload.initial_chick_count = initial_chick_count;
    if (effective_unit_cost !== undefined) updatePayload.effective_unit_cost = effective_unit_cost;
    if (validatedData.status !== undefined) updatePayload.status = validatedData.status;
    if (current_live !== undefined) updatePayload.current_live = current_live;
    if (validatedData.totalMortality !== undefined) updatePayload.total_mortality = validatedData.totalMortality;
    if (validatedData.totalWeightKg !== undefined) updatePayload.total_weight_kg = validatedData.totalWeightKg;
    if (validatedData.notes !== undefined) updatePayload.notes = validatedData.notes;

    const { data: updatedBatch, error } = await supabase
      .from('batches')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    // Transform to camelCase
    const transformedBatch = {
      id: updatedBatch.id,
      name: updatedBatch.name,
      docPurchasedCount: updatedBatch.doc_purchased_count || 0,
      docFreeCount: updatedBatch.doc_free_count || 0,
      totalDocCost: updatedBatch.total_doc_cost || 0,
      initialChickCount: updatedBatch.initial_chick_count || 0,
      currentLive: updatedBatch.current_live || 0,
      totalMortality: updatedBatch.total_mortality || 0,
      totalWeightKg: updatedBatch.total_weight_kg || 0,
      effectiveUnitCost: updatedBatch.effective_unit_cost || 0,
      startDate: updatedBatch.start_date,
      status: updatedBatch.status,
      notes: updatedBatch.notes,
      createdAt: updatedBatch.created_at,
      updatedAt: updatedBatch.updated_at,
    };

    return NextResponse.json(transformedBatch);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating batch:', error);
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isHardDelete = searchParams.get('hard') === 'true';

    console.log(`DELETE request received for batch ID: ${id}, hard delete: ${isHardDelete}`);

    const supabase = createClientServiceRole();

    // Test basic connection first
    console.log('Testing basic Supabase connection...');
    const { error: testError } = await supabase
      .from('batches')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('Basic connection test failed:', testError);
      return NextResponse.json({
        error: 'Database connection failed',
        details: testError.message
      }, { status: 500 });
    }

    console.log('Basic connection test successful');

    if (isHardDelete) {
      // Hard delete - permanently remove from database
      console.log(`Performing hard delete for batch: ${id}`);

      const { error: deleteError } = await supabase
        .from('batches')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Hard delete error:', deleteError);
        throw new Error(`Failed to hard delete batch: ${deleteError.message}`);
      }

      console.log(`Batch ${id} hard deleted successfully`);
      return NextResponse.json({ message: 'Batch permanently deleted' });
    } else {
      // Soft delete - mark as deleted
      console.log(`Performing soft delete for batch: ${id}`);

      // First, check if batch exists at all (ignoring is_deleted filter)
      const { data: anyBatch, error: anyError } = await supabase
        .from('batches')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (anyError) {
        console.error('Error fetching any batch:', anyError);
        return NextResponse.json({
          error: 'Database error',
          details: anyError.message
        }, { status: 500 });
      }

      console.log('Query result:', { anyBatch, anyError });

      if (!anyBatch) {
        console.log(`Batch ${id} does not exist in database at all`);
        return NextResponse.json({
          error: 'Batch not found in database'
        }, { status: 404 });
      }

      // Check if it's already deleted
      if (anyBatch.is_deleted) {
        console.log(`Batch ${id} exists but is already deleted - allowing re-deletion`);
      } else {
        console.log(`Batch ${id} found and active: ${anyBatch.name}`);
      }

      console.log(`Proceeding with soft delete for batch: ${anyBatch.name}...`);

      const { softDeleteBatch } = await import('@/lib/services/batchService');
      await softDeleteBatch(id);

      console.log(`Batch ${id} soft deleted successfully`);
      return NextResponse.json({ message: 'Batch deleted successfully' });
    }
  } catch (error) {
    console.error('=== DELETE BATCH ERROR DEBUG ===');
    console.error('Error type:', error?.constructor?.name || 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'No message');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Full error object:', error);
    console.error('=== END DELETE BATCH ERROR ===');

    return NextResponse.json({
      error: 'Failed to delete batch',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}