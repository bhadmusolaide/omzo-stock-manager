import { NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createClientServiceRole();

    const { data: feedPurchases, error } = await supabase
      .from('feed_purchases')
      .select('id, feed_type, brand, kg, supplier, purchase_date, feed_usages(kg)')
      .eq('batch_id', id)
      .eq('is_deleted', false)
      .order('purchase_date', { ascending: false });

    if (error) {
      console.error('Error fetching feed purchases:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const feedPurchasesWithRemaining = await Promise.all(
      (feedPurchases || []).map(async (purchase) => {
        const totalUsedKg = purchase.feed_usages.reduce((sum, usage) => sum + usage.kg, 0);
        const remainingKg = purchase.kg - totalUsedKg;
        return {
          ...purchase,
          remaining_kg: remainingKg,
        };
      })
    );

    return NextResponse.json(feedPurchasesWithRemaining || []);
  } catch (error) {
    console.error('Error fetching feed purchases for batch:', error);
    return NextResponse.json({ error: 'Failed to fetch feed purchases' }, { status: 500 });
  }
}