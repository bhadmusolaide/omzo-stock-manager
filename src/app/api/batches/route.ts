import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

interface Batch {
  id: string;
  name: string;
  doc_purchased_count: number;
  doc_free_count: number;
  total_doc_cost: number;
  initial_chick_count: number;
  current_live: number;
  total_mortality: number;
  total_weight_kg: number;
  effective_unit_cost: number;
  start_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const createBatchSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  docPurchasedCount: z.number().int().min(0),
  docFreeCount: z.number().int().min(0),
  totalDocCost: z.number().min(0),
  status: z.enum(['BROODING', 'GROWING', 'PROCESSING', 'CLOSED']).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServiceRole();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const hideClosedZeroInventory = searchParams.get('hideClosedZeroInventory') === 'true';
    const offset = (page - 1) * limit;

    let query = supabase
      .from('batches')
      .select(`
        *
      `, { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: batches, error, count } = await query;

    if (error) throw error;

    // Apply client-side filtering for closed batches with zero inventory if requested
    let filteredBatches = batches || [];
    if (hideClosedZeroInventory) {
      // Fetch inventory data for filtering
      const batchIds = filteredBatches.map((batch: any) => batch.id);
      if (batchIds.length > 0) {
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('dressed_inventory')
          .select('batch_id, available_count, available_weight_kg')
          .in('batch_id', batchIds)
          .eq('is_deleted', false);

        if (!inventoryError && inventoryData) {
          // Create a map of batch_id to inventory items
          const inventoryMap: Record<string, any[]> = {};
          inventoryData.forEach((item: any) => {
            if (!inventoryMap[item.batch_id]) {
              inventoryMap[item.batch_id] = [];
            }
            inventoryMap[item.batch_id].push(item);
          });

          // Filter batches
          filteredBatches = filteredBatches.filter((batch: any) => {
            // If batch is not closed, include it
            if (batch.status !== 'CLOSED') return true;
            
            // If batch is closed, check if it has any inventory
            const batchInventory = inventoryMap[batch.id] || [];
            const hasInventory = batchInventory.some((item: any) => 
              (item.available_count && item.available_count > 0) || 
              (item.available_weight_kg && item.available_weight_kg > 0)
            );
            
            // Include closed batches only if they have inventory
            return hasInventory;
          });
        }
      }
    }

    // Transform to camelCase
    const transformedBatches = filteredBatches.map((batch: any) => ({
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
    }));

    // Aggregate totals across ALL batches (not just the paginated page)
    const { data: allBatches } = await supabase
      .from('batches')
      .select('doc_purchased_count, doc_free_count, current_live, total_mortality, status')
      .eq('is_deleted', false);

    const totalBatches = allBatches?.length || 0;
    const activeBatches = allBatches?.filter((b: any) => b.status !== 'CLOSED').length || 0;
    const totalBirds = allBatches?.reduce((sum: number, b: any) => sum + (b.doc_purchased_count || 0) + (b.doc_free_count || 0), 0) || 0;
    const totalMortality = allBatches?.reduce((sum: number, b: any) => sum + (b.total_mortality || 0), 0) || 0;
    const remainingBirds = allBatches?.filter((b: any) => b.status !== 'CLOSED').reduce((sum: number, b: any) => sum + (b.current_live || 0), 0) || 0;
    const processingBatches = allBatches?.filter((b: any) => b.status === 'PROCESSING').length || 0;
    const closedBatches = allBatches?.filter((b: any) => b.status === 'CLOSED').length || 0;

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      batches: transformedBatches,
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      totalBatches,
      activeBatches,
      totalBirds,
      totalMortality,
      remainingBirds,
      processingBatches,
      closedBatches,
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body;
  let validatedData;
  try {
    body = await request.json();
    validatedData = createBatchSchema.parse(body);

    const initialChickCount = validatedData.docPurchasedCount + validatedData.docFreeCount;
    const effectiveUnitCost = initialChickCount > 0 ? validatedData.totalDocCost / validatedData.docPurchasedCount : 0;

    const supabase = createClientServiceRole();

    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .insert({
        name: validatedData.name,
        status: validatedData.status || 'BROODING',
        doc_purchased_count: validatedData.docPurchasedCount,
        doc_free_count: validatedData.docFreeCount,
        total_doc_cost: validatedData.totalDocCost,
        initial_chick_count: initialChickCount,
        current_live: initialChickCount,
        total_mortality: 0,
        total_weight_kg: 0,
        effective_unit_cost: effectiveUnitCost,
        start_date: validatedData.startDate,
        notes: validatedData.notes || null,
      })
      .select()
      .single();

    if (batchError) throw batchError;

    // Auto-log transaction
    const today = new Date().toISOString().split('T')[0];
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        date: today,
        description: `DOC Purchase: ${batch.name}`,
        amount: validatedData.totalDocCost,
        type: 'DEBIT',
        category: 'DOC',
        linked_batch_id: batch.id,
      });

    if (transactionError) throw transactionError;

    return NextResponse.json(batch, { status: 201 });
  } catch (error: any) {
    console.error('=== BATCH CREATION ERROR DEBUG ===');
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message || 'No message');
    console.error('Error stack:', error.stack || 'No stack');
    console.error('Request body:', body || 'No body parsed');
    console.error('Validated data:', validatedData || 'No validation');
    console.error('Full error object:', error);
    console.error('=== END BATCH CREATION ERROR ===');
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
  }
}