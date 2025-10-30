import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServiceRole();
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const productType = searchParams.get('productType');
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Fetch settings to get the low stock threshold
    let lowStockThreshold = 50; // Default value
    try {
      const { data: settings } = await supabase.from('settings').select('low_stock_threshold').single();
      if (settings && settings.low_stock_threshold !== undefined) {
        lowStockThreshold = settings.low_stock_threshold;
      }
    } catch (settingsError) {
      console.warn('Could not fetch settings, using default low stock threshold of 50');
    }

    let query = supabase
      .from('dressed_inventory')
      .select(`
        *,
        batches!batch_id (
          id,
          name
        )
      `, { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    if (productType) {
      query = query.eq('product_type', productType);
    }

    if (lowStockOnly) {
      // Use the low stock threshold from settings
      query = query.lt('available_count', lowStockThreshold);
    }

    const { data: inventory, error, count } = await query;

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
      lowStock: item.available_count < lowStockThreshold,  // Use settings threshold
    })) || [];

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      inventory: transformedInventory,
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