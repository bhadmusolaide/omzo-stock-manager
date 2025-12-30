import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';
import { settleFeedBorrow, cancelFeedBorrow } from '@/lib/services/feedService';

const settleFeedBorrowSchema = z.object({
  action: z.enum(['settle', 'cancel']),
  settledMethod: z.enum(['RETURNED', 'PURCHASED', 'WRITTEN_OFF']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClientServiceRole();

    const { data: feedBorrow, error } = await supabase
      .from('feed_borrows')
      .select(`
        *,
        source_batch:batches!source_batch_id(id, name),
        target_batch:batches!target_batch_id(id, name)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Error fetching feed borrow:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!feedBorrow) {
      return NextResponse.json({ error: 'Feed borrow not found' }, { status: 404 });
    }

    return NextResponse.json(feedBorrow);
  } catch (error) {
    console.error('Error in feed borrow GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed borrow' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = settleFeedBorrowSchema.parse(body);

    let result;
    if (validatedData.action === 'settle') {
      if (!validatedData.settledMethod) {
        return NextResponse.json(
          { error: 'Settled method is required for settling a borrow' },
          { status: 400 }
        );
      }
      result = await settleFeedBorrow(id, validatedData.settledMethod);
    } else if (validatedData.action === 'cancel') {
      result = await cancelFeedBorrow(id);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating feed borrow:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to update feed borrow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClientServiceRole();

    // Soft delete the feed borrow
    const { data, error } = await supabase
      .from('feed_borrows')
      .update({ is_deleted: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting feed borrow:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Feed borrow not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error in feed borrow DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to delete feed borrow' },
      { status: 500 }
    );
  }
}

