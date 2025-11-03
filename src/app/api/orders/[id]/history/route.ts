import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClientServiceRole();
    
    const { data: history, error } = await supabase
      .from('order_history')
      .select('*')
      .eq('order_id', id)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Error fetching order history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching order history:', error);
    return NextResponse.json({ error: 'Failed to fetch order history' }, { status: 500 });
  }
}