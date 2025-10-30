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
        processing_outputs (*)
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

    // Calculate FCR (Feed Conversion Ratio)
    const finalWeight = batch.total_weight_kg || 0;
    const fcr = finalWeight > 0 ? totalFeedKg / finalWeight : 0;

    // Calculate processing metrics
    const totalProcessedBirds = batch.processing_outputs?.filter((po: any) => po.output_type === 'dressed')
      .reduce((sum: number, po: any) => sum + parseFloat(po.quantity || 0), 0) || 0;
    
    const totalDressedWeightKg = batch.processing_outputs?.filter((po: any) => po.output_type === 'dressed')
      .reduce((sum: number, po: any) => sum + parseFloat(po.quantity || 0), 0) || 0;

    const dressingPercentage = totalBirds > 0 ? (totalProcessedBirds / totalBirds) * 100 : 0;
    const costPerDressedKg = totalDressedWeightKg > 0 ? totalExpenses / totalDressedWeightKg : 0;
    const profitPerDressedKg = totalDressedWeightKg > 0 ? profit / totalDressedWeightKg : 0;
    const weightLossPercentage = finalWeight > 0 ? ((finalWeight - totalDressedWeightKg) / finalWeight) * 100 : 0;

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
