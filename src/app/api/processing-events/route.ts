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
