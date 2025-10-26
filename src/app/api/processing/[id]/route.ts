import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const getProcessingSchema = z.object({
  includeOutputs: z.boolean().optional().default(true),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClientServiceRole();

    const { searchParams } = new URL(request.url);
    const includeOutputs = searchParams.get('includeOutputs') === 'true';

    const validatedQuery = getProcessingSchema.parse({
      includeOutputs,
    });

    let query = supabase
      .from('processing_events')
      .select('*')
      .eq('id', id)
      .single();

    if (validatedQuery.includeOutputs) {
      query = supabase
        .from('processing_events')
        .select(`
          *,
          processing_outputs!inner(*)
        `)
        .eq('id', id)
        .single();
    }

    const { data: processingEvent, error } = await query;

    if (error) throw error;

    if (!processingEvent) {
      return NextResponse.json({ error: 'Processing event not found' }, { status: 404 });
    }

    // Transform to camelCase
    interface TransformedProcessingEvent {
      id: string;
      batchId: string;
      processedDate: string;
      liveBirdsProcessed: number;
      avgLiveWeightKg: number;
      processedBy: string;
      notes: string | null;
      createdAt: string;
      updatedAt: string;
      outputs?: Array<{
        id: string;
        productType: string;
        unitCount: number;
        totalWeightKg: number;
        avgWeightKg: number;
        createdAt: string;
      }>;
    }

    const transformedEvent: TransformedProcessingEvent = {
      id: processingEvent.id,
      batchId: processingEvent.batch_id,
      processedDate: processingEvent.processed_date,
      liveBirdsProcessed: processingEvent.live_birds_processed,
      avgLiveWeightKg: processingEvent.avg_live_weight_kg,
      processedBy: processingEvent.processed_by,
      notes: processingEvent.notes,
      createdAt: processingEvent.created_at,
      updatedAt: processingEvent.updated_at,
    };

    if (validatedQuery.includeOutputs && processingEvent.processing_outputs) {
      transformedEvent.outputs = processingEvent.processing_outputs.map((o: any) => ({
        id: o.id,
        productType: o.product_type,
        unitCount: o.unit_count,
        totalWeightKg: o.total_weight_kg,
        avgWeightKg: o.avg_weight_kg,
        createdAt: o.created_at,
      }));
    }

    return NextResponse.json(transformedEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error fetching processing event:', error);
    return NextResponse.json({ error: 'Failed to fetch processing event' }, { status: 500 });
  }
}