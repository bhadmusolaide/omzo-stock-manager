import { NextResponse } from 'next/server';
import { recalculateAllInsights } from '@/lib/ai/aiService';
import { createClientServiceRole } from '@/lib/supabase';

export async function POST() {
  try {
    // Only allow server-side calls or authenticated admin users
    const supabase = createClientServiceRole();
    
    // In a real implementation, you would check for proper authentication
    // For now, we'll allow the recalculation to proceed
    
    const result = await recalculateAllInsights();
    
    if (result.success) {
      return NextResponse.json({ message: result.message }, { status: 200 });
    } else {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in AI recalculation API:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate AI insights' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get top insights for display
    const supabase = createClientServiceRole();
    
    const { data: insights, error } = await supabase
      .from('ai_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      throw new Error(`Error fetching insights: ${error.message}`);
    }
    
    return NextResponse.json({ insights }, { status: 200 });
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI insights' },
      { status: 500 }
    );
  }
}