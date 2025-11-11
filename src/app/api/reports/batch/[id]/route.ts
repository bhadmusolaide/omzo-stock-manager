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

    // Get batch data with related information
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select(`
        *,
        feed_purchases (*),
        orders (*, order_items(*)),
        transactions (*),
        processing_outputs (*),
        processing_events (*)
      `)
      .eq('id', id)
      .single();

    if (batchError) {
      console.error('Error fetching batch:', batchError);
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    if (!batches) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Calculate totals using correct snake_case field names
    const batch = batches;
    const totalBirds = (batch.doc_purchased_count || 0) + (batch.doc_free_count || 0);
    const totalMortality = batch.total_mortality || 0;
    const currentLive = batch.current_live || 0;
    const totalFeedKg = batch.feed_purchases?.reduce((sum: number, fp: any) => 
      sum + (fp.is_deleted ? 0 : parseFloat(fp.kg) || 0), 0) || 0;
    
    // Calculate total feed cost from feed purchases
    const totalFeedCost = batch.feed_purchases?.reduce((sum: number, fp: any) => 
      sum + (fp.is_deleted ? 0 : parseFloat(fp.total_cost) || 0), 0) || 0;
    
    // Calculate total revenue from orders
    const totalRevenue = batch.orders?.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total_amount || 0), 0) || 0;
    
    // Calculate total expenses from transactions
    const totalExpenses = batch.transactions?.filter((t: any) => t.type === 'DEBIT')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0) || 0;

    // Calculate DOC cost from transactions
    const docCost = batch.transactions?.filter((t: any) => 
      t.type === 'DEBIT' && t.category === 'DOC')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0) || 0;

    // Calculate misc expenses (non-DOC, non-FEED)
    const miscExpenses = batch.transactions?.filter((t: any) => 
      t.type === 'DEBIT' && !['DOC', 'FEED'].includes(t.category))
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0) || 0;

    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const mortalityPercent = totalBirds > 0 ? (totalMortality / totalBirds) * 100 : 0;
    const feedCostPerKg = totalFeedKg > 0 ? totalFeedCost / totalFeedKg : 0;

    console.log('Batch data:', batch);
    console.log('Processing events:', batch.processing_events);
    console.log('Processing outputs:', batch.processing_outputs);
    
    // Calculate processing metrics
    // Handle both old and new schema for processing outputs
    // Filter for all processing outputs as dressed products (all outputs are dressed products)
    const totalProcessedBirds = batch.processing_outputs?.reduce((sum: number, po: any) => 
      sum + parseFloat(po.unit_count || po.count || 0), 0) || 0;

    const totalDressedWeightKg = batch.processing_outputs?.reduce((sum: number, po: any) => 
      sum + parseFloat(po.total_weight_kg || po.quantity || 0), 0) || 0;

    // Calculate final live weight (before processing)
    // If batch.total_weight_kg is 0, try to calculate from processing events
    let finalLiveWeight = batch.total_weight_kg || 0;
    
    if (finalLiveWeight === 0 && batch.processing_events && batch.processing_events.length > 0) {
      // Calculate from processing events: sum of (avg_live_weight_kg * live_birds_processed)
      finalLiveWeight = batch.processing_events.reduce((sum: number, event: any) => {
        const avgWeight = parseFloat(event.avg_live_weight_kg || 0);
        const liveBirds = parseInt(event.live_birds_processed || 0);
        return sum + (avgWeight * liveBirds);
      }, 0);
    }

    // Calculate FCR using proper formula (feed consumed per kg weight gain)
    // Weight gain = final live weight - initial weight (assuming initial weight is negligible)
    const fcr = calculateFCR(totalFeedKg, finalLiveWeight);

    // Calculate dressing percentage using weights
    const dressingPercentage = calculateDressingPercentage(totalDressedWeightKg, finalLiveWeight);
    
    console.log('Final live weight used for calculations:', finalLiveWeight);
    console.log('Calculated FCR:', fcr);
    console.log('Calculated dressing percentage:', dressingPercentage);

    const costPerDressedKg = calculateCostPerDressedKg(totalExpenses, totalDressedWeightKg);
    const profitPerDressedKg = totalDressedWeightKg > 0 ? profit / totalDressedWeightKg : 0;
    const weightLossPercentage = finalLiveWeight > 0 ? ((finalLiveWeight - totalDressedWeightKg) / finalLiveWeight) * 100 : 0;

    const batchReport = {
      id: batch.id,
      name: batch.name,
      totalBirds,
      mortalityCount: totalMortality,
      mortalityPercent,
      currentLive,
      totalFeedKg,
      totalFeedCost,
      docCost,
      miscExpenses,
      totalExpenses,
      totalRevenue,
      profit,
      profitMargin,
      fcr,
      feedCostPerKg,
      dressingPercentage,
      costPerDressedKg,
      profitPerDressedKg,
      weightLossPercentage,
      totalProcessedBirds,
      totalDressedWeightKg,
      status: batch.status,
      startDate: batch.start_date
    };

    return NextResponse.json(batchReport);
  } catch (error) {
    console.error('Error fetching batch report:', error);
    return NextResponse.json({ error: 'Failed to fetch batch report' }, { status: 500 });
  }
}
