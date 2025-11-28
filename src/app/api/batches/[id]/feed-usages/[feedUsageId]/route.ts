import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const updateFeedUsageSchema = z.object({
  feedId: z.string().min(1, 'Feed ID is required').optional(),
  kg: z.number().positive('KG must be greater than 0').optional(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; feedUsageId: string }> }
) {
  try {
    const { id: batchId, feedUsageId } = await params;
    const supabase = createClientServiceRole();

    const { data: feedUsage, error } = await supabase
      .from('feed_usages')
      .select(`
        *,
        feed_purchases (
          feed_type,
          brand,
          supplier
        )
      `)
      .eq('id', feedUsageId)
      .eq('batch_id', batchId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw error;
    if (!feedUsage) {
      return NextResponse.json({ error: 'Feed usage not found' }, { status: 404 });
    }

    return NextResponse.json(feedUsage);
  } catch (error) {
    console.error('Error fetching feed usage:', error);
    return NextResponse.json({ error: 'Failed to fetch feed usage' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; feedUsageId: string }> }
) {
  try {
    const { id: batchId, feedUsageId } = await params;
    const body = await request.json();
    const validatedData = updateFeedUsageSchema.parse(body);

    const supabase = createClientServiceRole();

    // Verify feed usage exists and belongs to the batch
    const { data: existingFeedUsage, error: fetchError } = await supabase
      .from('feed_usages')
      .select('*')
      .eq('id', feedUsageId)
      .eq('batch_id', batchId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingFeedUsage) {
      return NextResponse.json({ error: 'Feed usage not found' }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.feedId !== undefined) updatePayload.feed_id = validatedData.feedId;
    if (validatedData.kg !== undefined) updatePayload.kg = validatedData.kg;
    if (validatedData.date !== undefined) updatePayload.date = validatedData.date;
    if (validatedData.notes !== undefined) updatePayload.notes = validatedData.notes;

    const { data: updatedFeedUsage, error } = await supabase
      .from('feed_usages')
      .update(updatePayload)
      .eq('id', feedUsageId)
      .select(`
        *,
        feed_purchases (
          feed_type,
          brand,
          supplier
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(updatedFeedUsage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating feed usage:', error);
    return NextResponse.json({ error: 'Failed to update feed usage' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; feedUsageId: string }> }
) {
  try {
    const { id: batchId, feedUsageId } = await params;
    const supabase = createClientServiceRole();

    // Verify feed usage exists and belongs to the batch
    const { data: existingFeedUsage, error: fetchError } = await supabase
      .from('feed_usages')
      .select('*')
      .eq('id', feedUsageId)
      .eq('batch_id', batchId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingFeedUsage) {
      return NextResponse.json({ error: 'Feed usage not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('feed_usages')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedUsageId);

    if (error) throw error;

    return NextResponse.json({ message: 'Feed usage deleted successfully' });
  } catch (error) {
    console.error('Error deleting feed usage:', error);
    return NextResponse.json({ error: 'Failed to delete feed usage' }, { status: 500 });
  }
}