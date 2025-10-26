import { NextResponse } from 'next/server';
import { getBatchInsights } from '@/lib/ai/aiService';
import { createClientServiceRole } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;
    
    // Validate batch exists
    const supabase = createClientServiceRole();
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('id')
      .eq('id', batchId)
      .single();
      
    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }
    
    // Get batch insights
    const insights = await getBatchInsights(batchId);
    
    return NextResponse.json({ insights }, { status: 200 });
  } catch (error) {
    console.error('Error fetching batch insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch insights' },
      { status: 500 }
    );
  }
}