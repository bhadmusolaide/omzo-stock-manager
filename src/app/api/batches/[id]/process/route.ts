import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';
import { allocateCostsToProcessing, calculateCostPerDressedKg, AllocationMode } from '@/utils/calculations';

const processBatchSchema = z.object({
  liveBirdsProcessed: z.number().int().min(1, 'Live birds processed must be greater than 0'),
  avgLiveWeightKg: z.number().min(0.001, 'Average live weight must be greater than 0').optional(),
  yieldMap: z.array(z.object({
    productType: z.string().min(1, 'Product type is required'),
    unitCount: z.number().int().min(0, 'Unit count must be non-negative'),
    totalWeightKg: z.number().min(0, 'Total weight must be non-negative'),
  })).min(1, 'At least one product output required'),
  notes: z.string().optional(),
});

interface YieldItem {
  processing_event_id: string;
  batch_id: string;
  output_type: string;
  unit_count: number;
  total_weight_kg: number;
  avg_weight_kg: number | null;
  date: string;
  quantity: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = processBatchSchema.parse(body);

    const supabase = createClientServiceRole();

    // Fetch batch
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select(`
        *,
        feed_purchases(total_cost),
        expenses(amount)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (batchError) throw batchError;
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const currentLive = batch.current_live || 0;
    if (validatedData.liveBirdsProcessed > currentLive) {
      return NextResponse.json({ error: 'Cannot process more birds than available' }, { status: 400 });
    }

    // Calculate total_batch_cost
    const docCost = batch.total_doc_cost || 0;
    const feedCost = (batch.feed_purchases || []).reduce((sum: number, fp: any) => sum + (fp.total_cost || 0), 0);
    const otherExpenses = (batch.expenses || []).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    const totalBatchCost = docCost + feedCost + otherExpenses;

    // Surviving birds before processing
    const initialChicks = batch.initial_chick_count || 0;
    const totalMortality = batch.total_mortality || 0;
    const survivingBirds = Math.max(0, initialChicks - totalMortality);

    // Fetch last weighing for total live weight estimation if needed
    const { data: lastWeighing } = await supabase
      .from('weighings')
      .select('avg_weight_kg')
      .eq('batch_id', id)
      .order('taken_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch settings for allocation mode
    const { data: settings } = await supabase
      .from('settings')
      .select('allocation_mode')
      .single();

    const allocationMode: AllocationMode = settings?.allocation_mode || 'per_bird';

    let totalLiveWeightKgForBatch = 0;
    if (allocationMode === 'per_kg' && lastWeighing) {
      totalLiveWeightKgForBatch = lastWeighing.avg_weight_kg * currentLive;
    }

    // Allocate costs
    const allocation = allocateCostsToProcessing(
      totalBatchCost,
      allocationMode,
      survivingBirds,
      totalLiveWeightKgForBatch
    );

    const avgLiveWeightKg = validatedData.avgLiveWeightKg || (lastWeighing?.avg_weight_kg || 0);
    const totalLiveWeightForProcessing = validatedData.liveBirdsProcessed * avgLiveWeightKg;

    let allocatedCost = 0;
    if (allocationMode === 'per_bird') {
      const costPerBird = allocation.costPerBird || 0;
      allocatedCost = costPerBird * validatedData.liveBirdsProcessed;
    } else {
      const costPerKg = allocation.costPerKg || 0;
      allocatedCost = costPerKg * totalLiveWeightForProcessing;
    }

    const totalDressedWeightKg = validatedData.yieldMap.reduce((sum: number, item) => sum + item.totalWeightKg, 0);
    const costPerDressedKg = calculateCostPerDressedKg(allocatedCost, totalDressedWeightKg);

    // Create processing event
    const processingPayload = {
      batch_id: id,
      processed_date: new Date().toISOString(),
      live_birds_processed: validatedData.liveBirdsProcessed,
      avg_live_weight_kg: avgLiveWeightKg,
      notes: validatedData.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: processingEvent, error: eventError } = await supabase
      .from('processing_events')
      .insert(processingPayload)
      .select()
      .single();

    if (eventError) throw eventError;

    // Create processing outputs
    const outputs: YieldItem[] = validatedData.yieldMap.map(item => ({
      processing_event_id: processingEvent.id,
      batch_id: id,
      output_type: item.productType,
      unit_count: item.unitCount,
      total_weight_kg: item.totalWeightKg,
      avg_weight_kg: item.unitCount > 0 ? item.totalWeightKg / item.unitCount : null,
      date: new Date().toISOString(),
      quantity: item.totalWeightKg,
    }));

    const { data: processingOutputs, error: outputsError } = await supabase
      .from('processing_outputs')
      .insert(outputs)
      .select();

    if (outputsError) throw outputsError;

    // Update batch current_live
    const newCurrentLive = currentLive - validatedData.liveBirdsProcessed;
    const { error: batchUpdateError } = await supabase
      .from('batches')
      .update({
        current_live: newCurrentLive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (batchUpdateError) throw batchUpdateError;

    // Update or create dressed_inventory entries
    for (const item of validatedData.yieldMap) {
      // Check if an inventory entry already exists for this product type and batch
      const { data: existingInventory, error: fetchError } = await supabase
        .from('dressed_inventory')
        .select('*')
        .eq('product_type', item.productType)
        .eq('batch_id', id)
        .eq('is_deleted', false)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingInventory) {
        // Update existing entry by adding to the current counts
        const { error: updateError } = await supabase
          .from('dressed_inventory')
          .update({
            available_count: existingInventory.available_count + item.unitCount,
            available_weight_kg: existingInventory.available_weight_kg + item.totalWeightKg,
            unit_price: costPerDressedKg,  // Update with latest cost
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingInventory.id);

        if (updateError) throw updateError;
      } else {
        // Create new entry if none exists
        const inventoryPayload = {
          product_type: item.productType,
          batch_id: id,
          available_count: item.unitCount,
          available_weight_kg: item.totalWeightKg,
          unit_price: costPerDressedKg,  // Cost per kg
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabase
          .from('dressed_inventory')
          .insert(inventoryPayload);
      }
    }

    // Transform response
    const transformedEvent = {
      id: processingEvent.id,
      batchId: processingEvent.batch_id,
      processedDate: processingEvent.processed_date,
      liveBirdsProcessed: processingEvent.live_birds_processed,
      avgLiveWeightKg: processingEvent.avg_live_weight_kg,
      notes: processingEvent.notes,
      createdAt: processingEvent.created_at,
      updatedAt: processingEvent.updated_at,
      outputs: processingOutputs?.map((o: any) => ({
        id: o.id,
        productType: o.product_type,
        unitCount: o.unit_count,
        totalWeightKg: o.total_weight_kg,
        avgWeightKg: o.avg_weight_kg,
        createdAt: o.created_at,
      })) || [],
      costPerDressedKg,
      totalBatchCost,
      allocatedCost,
    };

    return NextResponse.json(transformedEvent, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error processing batch:', error);
    return NextResponse.json({ error: 'Failed to process batch' }, { status: 500 });
  }
}
