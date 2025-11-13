import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordFeedUsage } from '@/lib/services/feedService';
import { createClientServiceRole } from '@/lib/supabase';

const createFeedUsageSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  feedId: z.string().min(1, 'Feed ID is required'),
  kg: z.number().positive('KG must be greater than 0'),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    let supabase;
    try {
      supabase = createClientServiceRole();
    } catch (error) {
      console.warn('Supabase service role key not available');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { data: feedUsages, error } = await supabase
      .from('feed_usages')
      .select('kg')
      .eq('is_deleted', false);

    if (error) {
      console.error('Error fetching feed usages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalUsed = feedUsages?.reduce((sum, usage) => sum + usage.kg, 0) || 0;

    return NextResponse.json({ totalUsed });
  } catch (error) {
    console.error('Error fetching total feed usage:', error);
    return NextResponse.json({ error: 'Failed to fetch feed usage' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createFeedUsageSchema.parse(body);

    const feedUsage = await recordFeedUsage({
      batchId: validatedData.batchId,
      feedId: validatedData.feedId,
      kg: validatedData.kg,
      date: new Date(validatedData.date),
      notes: validatedData.notes,
    });

    return NextResponse.json(feedUsage, { status: 201 });
  } catch (error: any) {
    console.error('Error recording feed usage:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: error.message || 'Failed to record feed usage' }, { status: 500 });
  }
}