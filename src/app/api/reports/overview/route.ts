import { createClientServiceRole } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get all transactions
    const supabase = createClientServiceRole();
    const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
      .select('*, batches!linked_batch_id(id, name), orders!linked_order_id(id, customer_name)');

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json({ error: transactionsError.message }, { status: 500 });
    }

    // Get all batches with related data
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select(`
        *,
        feed_purchases (*),
        orders (*, order_items(*)),
        transactions (*)
      `);

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      return NextResponse.json({ error: batchesError.message }, { status: 500 });
    }

    // Fetch total assigned feed (usages)
    const { data: feedUsages, error: usagesError } = await supabase
      .from('feed_usages')
      .select('kg')
      .eq('is_deleted', false);

    if (usagesError) {
      console.error('Error fetching feed usages:', usagesError);
      return NextResponse.json({ error: usagesError.message }, { status: 500 });
    }

    // Calculate totals
    const totalIncome = transactions
      .filter((t: any) => t.type === 'CREDIT')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t: any) => t.type === 'DEBIT')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const overallProfit = totalIncome - totalExpenses;

    // Calculate mortality rate
    const totalBirds = batches.reduce((sum: number, b: any) => sum + (b.doc_purchased_count + b.doc_free_count), 0);
    const totalMortality = batches.reduce((sum: number, b: any) => sum + b.total_mortality, 0);
    const mortalityRate = totalBirds > 0 ? (totalMortality / totalBirds) * 100 : 0;

    // Calculate average feed cost per kg
    const totalFeedCost = transactions
      .filter((t: any) => t.category === 'FEED' && t.type === 'DEBIT')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalFeedKg = batches.reduce((sum: number, b: any) => {
      const feedKg = b.feed_purchases.reduce((fSum: number, f: any) => fSum + (f.is_deleted ? 0 : f.kg), 0);
      return sum + feedKg;
    }, 0);

    const assignedFeedKg = feedUsages ? feedUsages.reduce((sum: number, u: any) => sum + u.kg, 0) : 0;
    const remainingFeedKg = totalFeedKg - assignedFeedKg;

    const avgFeedCostPerKg = totalFeedKg > 0 ? totalFeedCost / totalFeedKg : 0;

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      overallProfit,
      mortalityRate: parseFloat(mortalityRate.toFixed(2)),
      avgFeedCostPerKg: parseFloat(avgFeedCostPerKg.toFixed(2)),
      batchCount: batches.length,
      totalFeedKg,
      assignedFeedKg,
      remainingFeedKg,
    });
  } catch (error) {
    console.error('Error fetching overview:', error);
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}

