import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordFeedUsage } from '@/lib/services/feedService';

const createFeedUsageSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  feedId: z.string().min(1, 'Feed ID is required'),
  kg: z.number().positive('KG must be greater than 0'),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  notes: z.string().optional(),
});

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