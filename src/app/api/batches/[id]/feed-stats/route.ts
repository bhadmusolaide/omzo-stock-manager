import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;
    
    // Try to create Supabase client, but handle case where service role key is missing
    let supabase;
    try {
      supabase = createClientServiceRole();
    } catch (error) {
      console.warn('Supabase service role key not available, using fallback');
      // Return default values if Supabase is not properly configured
      return NextResponse.json({
        purchased: 0,
        used: 0,
        remaining: 0
      });
    }

    // Fetch total feed purchased
    const { data: purchasedData, error: purchasedError } = await supabase
      .from('feed_purchases')
      .select('kg')
      .eq('batch_id', batchId)
      .eq('is_deleted', false);

    if (purchasedError) {
      console.error('Error fetching purchased feed:', purchasedError);
      // Return default values on error
      return NextResponse.json({
        purchased: 0,
        used: 0,
        remaining: 0
      });
    }

    const totalPurchased = purchasedData?.reduce((sum, f) => sum + f.kg, 0) || 0;

    // Fetch total feed used
    const { data: usedData, error: usedError } = await supabase
      .from('feed_usages')
      .select('kg')
      .eq('batch_id', batchId)
      .eq('is_deleted', false);

    if (usedError) {
      console.error('Error fetching used feed:', usedError);
      // Return default values on error
      return NextResponse.json({
        purchased: totalPurchased,
        used: 0,
        remaining: totalPurchased
      });
    }

    const totalUsed = usedData?.reduce((sum, f) => sum + f.kg, 0) || 0;

    return NextResponse.json({
      purchased: totalPurchased,
      used: totalUsed,
      remaining: totalPurchased - totalUsed
    });
  } catch (error) {
    console.error('Error in feed-stats API:', error);
    // Return default values on any error
    return NextResponse.json({
      purchased: 0,
      used: 0,
      remaining: 0
    });
  }
}