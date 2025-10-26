import { createClientServiceRole } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    let query: Record<string, string> = {};
    if (batchId) {
      query.linked_batch_id = batchId;
    }

    const supabase = createClientServiceRole();
    let queryBuilder = supabase.from('transactions').select('*, batches(*)').eq('type', 'DEBIT');
  
    if (batchId) {
      queryBuilder = queryBuilder.eq('linked_batch_id', batchId);
    }

    const { data: transactions, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by category
    const expensesByCategory = transactions.reduce(
      (acc: Record<string, number>, t: any) => {
        const category = t.category;
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += t.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    const data = Object.entries(expensesByCategory).map(([name, value]) => ({
      name,
      value: parseFloat((value as number).toFixed(2)),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

