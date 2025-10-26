import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServiceRole();
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const productType = searchParams.get('productType');
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';

    let query = supabase
      .from('dressed_inventory')
      .select(`
        *,
        batches!batch_id (
          id,
          name
        )
      `)
      .order('updated_at', { ascending: false });

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    if (productType) {
      query = query.eq('product_type', productType);
    }

    if (lowStockOnly) {
      // Assuming low_stock_threshold from settings, but for now filter available_count < 50
      query = query.lt('available_count', 50);
    }

    const { data: inventory, error } = await query;

    if (error) throw error;

    // Transform to camelCase
    const transformedInventory = inventory?.map((item: any) => ({
      id: item.id,
      productType: item.product_type,
      batchId: item.batch_id,
      batchName: item.batches?.name || 'Unassigned',
      availableCount: item.available_count,
      availableWeightKg: item.available_weight_kg,
      unitPrice: item.unit_price,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      lowStock: item.available_count < 50,  // Use settings in future
    })) || [];

    return NextResponse.json(transformedInventory);
  } catch (error) {
    console.error('Error fetching dressed inventory:', error);
    return NextResponse.json({ error: 'Failed to fetch dressed inventory' }, { status: 500 });
  }
}