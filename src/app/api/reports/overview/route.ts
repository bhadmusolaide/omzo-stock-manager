import { createClientServiceRole } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getEstimatedDailyFeedConsumption } from '@/utils/calculations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const supabase = createClientServiceRole();

    // Get all batches with related data
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select(`
        *,
        feed_purchases (*),
        orders (*, order_items(*)),
        transactions (*)
      `)
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
    let filteredUsages = feedUsages || [];

    if (activeOnly) {
      const activeBatchIds = new Set(filteredBatches.filter((b: any) => b.status !== 'CLOSED').map((b: any) => b.id));

      filteredBatches = filteredBatches.filter((b: any) => activeBatchIds.has(b.id));
      filteredUsages = filteredUsages.filter((u: any) => u.batch_id && activeBatchIds.has(u.batch_id));
    }

    // Calculate totals from batch data (consistent with individual batch reports)
    const totalIncome = filteredBatches.reduce((sum: number, b: any) => {
      const batchRevenue = (b.orders || [])
        .reduce((oSum: number, o: any) => oSum + parseFloat(o.total_amount || 0), 0);
      return sum + batchRevenue;
    }, 0);

    const totalExpenses = filteredBatches.reduce((sum: number, b: any) => {
      const batchExpenses = (b.transactions || [])
        .filter((t: any) => t.type === 'DEBIT')
        .reduce((tSum: number, t: any) => tSum + parseFloat(t.amount || 0), 0);
      return sum + batchExpenses;
    }, 0);

    const overallProfit = totalIncome - totalExpenses;

    // Calculate mortality rate (aggregate across all batches)
    const totalBirds = filteredBatches.reduce((sum: number, b: any) =>
      sum + ((b.doc_purchased_count || 0) + (b.doc_free_count || 0)), 0);
    const totalMortality = filteredBatches.reduce((sum: number, b: any) =>
      sum + (b.total_mortality || 0), 0);
    const mortalityRate = totalBirds > 0 ? (totalMortality / totalBirds) * 100 : 0;

    // Calculate average feed cost per kg from feed_purchases (consistent with batch reports)
    const totalFeedCost = filteredBatches.reduce((sum: number, b: any) => {
      const batchFeedCost = (b.feed_purchases || [])
        .filter((f: any) => !f.is_deleted)
        .reduce((fSum: number, f: any) => fSum + parseFloat(f.total_cost || 0), 0);
      return sum + batchFeedCost;
    }, 0);

    const totalFeedKg = filteredBatches.reduce((sum: number, b: any) => {
      const feedKg = (b.feed_purchases || [])
        .filter((f: any) => !f.is_deleted)
        .reduce((fSum: number, f: any) => fSum + parseFloat(f.kg || 0), 0) || 0;
      return sum + feedKg;
    }, 0);

    const assignedFeedKg = filteredUsages.reduce((sum: number, u: any) =>
      sum + (u.kg || 0), 0);
    const remainingFeedKg = totalFeedKg - assignedFeedKg;

    const avgFeedCostPerKg = totalFeedKg > 0 ? totalFeedCost / totalFeedKg : 0;

    // Calculate outstanding order balance from batches (consistent with batch revenue)
    const outstandingOrderBalance = filteredBatches.reduce((sum: number, b: any) => {
      const batchBalance = (b.orders || [])
        .filter((o: any) => o.payment_status !== 'PAID')
        .reduce((oSum: number, o: any) => oSum + parseFloat(o.balance_due || 0), 0);
      return sum + batchBalance;
    }, 0);

    // Calculate total estimated daily feed consumption for active batches
    const totalEstDailyFeedKg = filteredBatches
      .filter((b: any) => b.status !== 'CLOSED')
      .reduce((sum: number, b: any) => {
        const currentLive = b.current_live || 0;

        const consumption = getEstimatedDailyFeedConsumption({
          currentLive,
          startDate: b.start_date
        });

        return sum + (consumption.estimatedConsumptionKg || 0);
      }, 0);

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
      totalEstDailyFeedKg: parseFloat(totalEstDailyFeedKg.toFixed(2)),
    });
  } catch (error) {
    console.error('Error fetching overview:', error);
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}

