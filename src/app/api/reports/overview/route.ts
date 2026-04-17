import { createClientServiceRole } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // Get all transactions
    const supabase = createClientServiceRole();
    const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
      .select('*, batches!linked_batch_id(id, name), orders!linked_order_id(id, customer_name, linked_batch_id)');

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

    // Get outstanding order balance
    const { data: orders } = await supabase
      .from('orders')
      .select('balance_due, payment_status, linked_batch_id')
      .neq('payment_status', 'PAID')
      .eq('is_deleted', false);

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      return NextResponse.json({ error: batchesError.message }, { status: 500 });
    }

    // Fetch total assigned feed (usages)
    const { data: feedUsages, error: usagesError } = await supabase
      .from('feed_usages')
      .select('kg, batch_id')
      .eq('is_deleted', false);

    if (usagesError) {
      console.error('Error fetching feed usages:', usagesError);
      return NextResponse.json({ error: usagesError.message }, { status: 500 });
    }

    let filteredBatches = batches || [];
    let filteredTransactions = transactions || [];
    let filteredOrders = orders || [];
    let filteredUsages = feedUsages || [];

    if (activeOnly) {
      const activeBatchIds = new Set(filteredBatches.filter((b: any) => b.status !== 'CLOSED').map((b: any) => b.id));

      filteredBatches = filteredBatches.filter((b: any) => activeBatchIds.has(b.id));
      filteredTransactions = filteredTransactions.filter((t: any) => {
        if (t.linked_batch_id && activeBatchIds.has(t.linked_batch_id)) return true;
        if (t.linked_order_id && t.orders?.linked_batch_id && activeBatchIds.has(t.orders.linked_batch_id)) return true;
        return false;
      });
      filteredOrders = filteredOrders.filter((o: any) => o.linked_batch_id && activeBatchIds.has(o.linked_batch_id));
      filteredUsages = filteredUsages.filter((u: any) => u.batch_id && activeBatchIds.has(u.batch_id));
    }

    // Calculate totals
    const totalIncome = filteredTransactions
      .filter((t: any) => t.type === 'CREDIT')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalExpenses = filteredTransactions
      .filter((t: any) => t.type === 'DEBIT')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const overallProfit = totalIncome - totalExpenses;

    // Calculate mortality rate
    const totalBirds = filteredBatches.reduce((sum: number, b: any) => sum + (b.doc_purchased_count + b.doc_free_count), 0);
    const totalMortality = filteredBatches.reduce((sum: number, b: any) => sum + b.total_mortality, 0);
    const mortalityRate = totalBirds > 0 ? (totalMortality / totalBirds) * 100 : 0;

    // Calculate average feed cost per kg
    const totalFeedCost = filteredTransactions
      .filter((t: any) => t.category === 'FEED' && t.type === 'DEBIT')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalFeedKg = filteredBatches.reduce((sum: number, b: any) => {
      const feedKg = b.feed_purchases?.reduce((fSum: number, f: any) => fSum + (f.is_deleted ? 0 : f.kg), 0) || 0;
      return sum + feedKg;
    }, 0);

    const assignedFeedKg = filteredUsages.reduce((sum: number, u: any) => sum + u.kg, 0);
    const remainingFeedKg = totalFeedKg - assignedFeedKg;

    const avgFeedCostPerKg = totalFeedKg > 0 ? totalFeedCost / totalFeedKg : 0;

    // Calculate outstanding order balance
    const outstandingOrderBalance = filteredOrders.reduce((sum: number, order: any) => sum + (order.balance_due || 0), 0);

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      overallProfit,
      mortalityRate: parseFloat(mortalityRate.toFixed(2)),
      avgFeedCostPerKg: parseFloat(avgFeedCostPerKg.toFixed(2)),
      batchCount: filteredBatches.filter((b: any) => b.status !== 'CLOSED').length,
      totalFeedKg,
      assignedFeedKg,
      remainingFeedKg,
      outstandingOrderBalance,
    });
  } catch (error) {
    console.error('Error fetching overview:', error);
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}

