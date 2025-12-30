import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';
import { createFeedBorrow } from '@/lib/services/feedService';

const createFeedBorrowSchema = z.object({
  sourceBatchId: z.string().min(1, 'Source batch is required'),
  targetBatchId: z.string().min(1, 'Target batch is required'),
  feedType: z.enum(['STARTER', 'GROWER', 'FINISHER']),
  kg: z.number().positive('KG must be greater than 0'),
  feedPurchaseId: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServiceRole();
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('feed_borrows')
      .select(`
        *,
        source_batch:batches!source_batch_id(id, name),
        target_batch:batches!target_batch_id(id, name)
      `, { count: 'exact' })
      .eq('is_deleted', false)
      .order('borrow_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (batchId) {
      query = query.or(`source_batch_id.eq.${batchId},target_batch_id.eq.${batchId}`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: feedBorrows, error, count } = await query;

    if (error) {
      console.error('Error fetching feed borrows:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      feedBorrows: feedBorrows || [],
      currentPage: page,
      totalPages: Math.ceil((count || 0) / limit),
      totalItems: count || 0,
    });
  } catch (error) {
    console.error('Error in feed borrows GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed borrows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body;
  let validatedData;
  try {
    body = await request.json();
    validatedData = createFeedBorrowSchema.parse(body);

    const feedBorrow = await createFeedBorrow({
      sourceBatchId: validatedData.sourceBatchId,
      targetBatchId: validatedData.targetBatchId,
      feedType: validatedData.feedType,
      kg: validatedData.kg,
      feedPurchaseId: validatedData.feedPurchaseId,
      notes: validatedData.notes,
    });

    return NextResponse.json(feedBorrow, { status: 201 });
  } catch (error) {
    console.error('Error creating feed borrow:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to create feed borrow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

