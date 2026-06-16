import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServiceRole();
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    let query = supabase
      .from('processing_events')
      .select(`
        *,
        batches(name),
        processing_outputs(*)
      `)
      .order('created_at', { ascending: false });

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching processing events:', error);
    return NextResponse.json({ error: 'Failed to fetch processing events' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClientServiceRole();
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Fetch the processing event with its outputs
    const { data: event, error: fetchError } = await supabase
      .from('processing_events')
      .select('*, processing_outputs(*)')
      .eq('id', eventId)
      .single();

    if (fetchError) throw fetchError;
    if (!event) {
      return NextResponse.json({ error: 'Processing event not found' }, { status: 404 });
    }

    const batchId = event.batch_id;
    const birdsToRestore = event.live_birds_processed || 0;

    // Delete processing outputs first
    if (event.processing_outputs && event.processing_outputs.length > 0) {
      const outputIds = event.processing_outputs.map((o: any) => o.id);
      const { error: deleteOutputsError } = await supabase
        .from('processing_outputs')
        .delete()
        .in('id', outputIds);

      if (deleteOutputsError) throw deleteOutputsError;

      // Reverse dressed_inventory changes
      for (const output of event.processing_outputs) {
        const { data: inv } = await supabase
          .from('dressed_inventory')
          .select('*')
          .eq('product_type', output.output_type)
          .eq('batch_id', batchId)
          .maybeSingle();

        if (inv) {
          const newCount = Math.max(0, (inv.available_count || 0) - (output.unit_count || output.quantity || 0));
          const newWeight = Math.max(0, (inv.available_weight_kg || 0) - (output.total_weight_kg || output.quantity || 0));
          await supabase
            .from('dressed_inventory')
            .update({
              available_count: newCount,
              available_weight_kg: newWeight,
              updated_at: new Date().toISOString(),
            })
            .eq('id', inv.id);
        }
      }
    }

    // Delete the processing event
    const { error: deleteEventError } = await supabase
      .from('processing_events')
      .delete()
      .eq('id', eventId);

    if (deleteEventError) throw deleteEventError;

    // Restore live birds to the batch
    if (batchId && birdsToRestore > 0) {
      const { data: batch } = await supabase
        .from('batches')
        .select('current_live')
        .eq('id', batchId)
        .single();

      if (batch) {
        await supabase
          .from('batches')
          .update({
            current_live: (batch.current_live || 0) + birdsToRestore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', batchId);
      }
    }

    return NextResponse.json({ message: 'Processing event deleted and changes reversed' });
  } catch (error) {
    console.error('Error deleting processing event:', error);
    return NextResponse.json({ error: 'Failed to delete processing event' }, { status: 500 });
  }
}
