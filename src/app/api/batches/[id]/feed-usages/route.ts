import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Import the service function
    const { createClientServiceRole } = await import('@/lib/supabase');

    let supabase;
    try {
      supabase = createClientServiceRole();
    } catch (error) {
      console.warn('Supabase service role key not available');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { data: feedUsages, error } = await supabase
      .from('feed_usages')
      .select(`
        *,
        feed_purchases (
          feed_type,
          brand,
          supplier
        )
      `)
      .eq('batch_id', id)
      .eq('is_deleted', false)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching feed usages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(feedUsages || []);
  } catch (error) {
    console.error('Error fetching feed usages for batch:', error);
    return NextResponse.json({ error: 'Failed to fetch feed usages' }, { status: 500 });
  }
}