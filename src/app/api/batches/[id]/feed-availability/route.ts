import { NextRequest, NextResponse } from 'next/server';
import { getFeedAvailabilityByType } from '@/lib/services/feedService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const availability = await getFeedAvailabilityByType(batchId);

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error fetching feed availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed availability' },
      { status: 500 }
    );
  }
}

