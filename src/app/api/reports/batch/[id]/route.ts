import { createClientServiceRole } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { calculateCostPerDressedKg, calculateDressingPercentage, calculateFCR, calculateProfitPerDressedKg } from '@/utils/calculations';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createClientServiceRole();
    const { data: batchReport, error } = await supabase
      .rpc('get_batch_report', { batch_id: id })
      .single();

    if (error) {
      console.error('Error fetching batch report from function:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!batchReport) {
      return NextResponse.json({ error: 'Batch report not found' }, { status: 404 });
    }

    return NextResponse.json(batchReport);
  } catch (error) {
    console.error('Error fetching batch report:', error);
    return NextResponse.json({ error: 'Failed to fetch batch report' }, { status: 500 });
  }
}

