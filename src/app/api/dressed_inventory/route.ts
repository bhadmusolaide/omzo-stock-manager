import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServiceRole();
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const productType = searchParams.get('productType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('dressed_inventory')
      .select(`
        *,
        batches!batch_id (
          id,
          name,
          status
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    if (productType) {
      query = query.eq('product_type', productType);
    }

    const { data: inventory, error, count } = await query;

    if (error) throw error;

    // Fetch batch data for summaries separately to avoid grouping issues
    const batchSummaries: Record<string, any> = {};
    if (inventory && inventory.length > 0) {
      const batchIds = [...new Set(inventory.map((item: any) => item.batch_id).filter(Boolean))];

      if (batchIds.length > 0) {
        const { data: batchesData } = await supabase
          .from('batches')
          .select(`
            id,
            name,
            status,
            total_weight_kg,
            processing_events (
              live_birds_processed,
              avg_live_weight_kg
            ),
            processing_outputs (
              total_weight_kg,
              quantity,
              output_type,
              unit_count
            )
          `)
          .in('id', batchIds);

        if (batchesData) {
          for (const batch of batchesData) {
            // Calculate Dressing Percentage
            let finalLiveWeight = batch.total_weight_kg || 0;
            if (finalLiveWeight === 0 && batch.processing_events && batch.processing_events.length > 0) {
              finalLiveWeight = batch.processing_events.reduce((sum: number, event: any) => {
                const avgWeight = parseFloat(event.avg_live_weight_kg || 0);
                const liveBirds = parseInt(event.live_birds_processed || 0);
                return sum + (avgWeight * liveBirds);
              }, 0);
            }

            const totalDressedWeightKg = batch.processing_outputs?.reduce((sum: number, po: any) =>
              sum + parseFloat(po.total_weight_kg || po.quantity || 0), 0) || 0;

            const dressingPercentage = finalLiveWeight > 0 ? (totalDressedWeightKg / finalLiveWeight) * 100 : 0;

            const productStats: Record<string, { count: number, weight: number }> = {};
            batch.processing_outputs?.forEach((po: any) => {
              const pType = po.output_type || po.product_name; // Handle both schemas
              if (pType) {
                if (!productStats[pType]) productStats[pType] = { count: 0, weight: 0 };
                productStats[pType].count += parseFloat(po.unit_count || po.count || 0);
                productStats[pType].weight += parseFloat(po.total_weight_kg || po.quantity || 0);
              }
            });

            batchSummaries[batch.id] = {
              id: batch.id,
              name: batch.name,
              status: batch.status,
              dressingPercentage: parseFloat(dressingPercentage.toFixed(2)),
              totalDressedWeightKg: parseFloat(totalDressedWeightKg.toFixed(2)),
              finalLiveWeight: parseFloat(finalLiveWeight.toFixed(2)),
              productStats,
            };
          }
        }
      }
    }

    // Transform to camelCase
    const transformedInventory = inventory?.map((item: any) => {
      const stats = item.batch_id && batchSummaries[item.batch_id]?.productStats?.[item.product_type];
      return {
        id: item.id,
        productType: item.product_type,
        batchId: item.batch_id,
        batchName: item.batches?.name || 'Unassigned',
        batchStatus: item.batches?.status || 'UNKNOWN',
        availableCount: item.available_count,
        availableWeightKg: item.available_weight_kg,
        processedCount: stats?.count || 0,
        processedWeightKg: stats?.weight || 0,
        unitPrice: item.unit_price,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    }) || [];

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      inventory: transformedInventory,
      batchSummaries,
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    });
  } catch (error) {
    console.error('Error fetching dressed inventory:', error);
    return NextResponse.json({ error: 'Failed to fetch dressed inventory' }, { status: 500 });
  }
}