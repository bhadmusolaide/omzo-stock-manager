import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const createFeedPurchaseSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  feedType: z.enum(['STARTER', 'GROWER', 'FINISHER']),
  brand: z.enum(['Ultima +', 'BreedWell', 'New Hope', 'Happy Chicken', 'Chikum', 'TopFeeds']).optional(),
  kg: z.number().positive('KG must be greater than 0'),
  bagCost: z.number().positive('Bag cost must be greater than 0'),
  supplier: z.string().optional(),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServiceRole();
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('feed_purchases')
      .select(`
        *,
        batches!batch_id (
          id,
          name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    const { data: feedPurchases, error, count } = await query;

    if (error) throw error;

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      feedPurchases: feedPurchases || [],
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    });
  } catch (error) {
    console.error('Error fetching feed purchases:', error);
    return NextResponse.json({ error: 'Failed to fetch feed purchases' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body;
  let validatedData;
  try {
    body = await request.json();
    validatedData = createFeedPurchaseSchema.parse(body);

    const totalCost = validatedData.kg / 25 * validatedData.bagCost;

    const supabase = createClientServiceRole();

    const { data: feedPurchase, error: feedError } = await supabase
      .from('feed_purchases')
      .insert({
        batch_id: validatedData.batchId,
        feed_type: validatedData.feedType,
        brand: validatedData.brand,
        kg: validatedData.kg,
        unit_cost: validatedData.bagCost,
        total_cost: totalCost,
        supplier: validatedData.supplier,
        purchase_date: new Date(validatedData.purchaseDate).toISOString(),
        notes: validatedData.notes,
      })
      .select(`
        *,
        batches!batch_id (
          id,
          name
        )
      `)
      .single();

    if (feedError) throw feedError;

    // Auto-log transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        date: new Date().toISOString(),
        description: `Feed Purchase: ${feedPurchase.feed_type} for Batch ${feedPurchase.batches?.name ?? feedPurchase.batch_id}`,
        amount: totalCost,
        type: 'DEBIT',
        category: 'FEED',
        linked_batch_id: feedPurchase.batch_id,
      });

    if (transactionError) throw transactionError;

    return NextResponse.json(feedPurchase, { status: 201 });
  } catch (error: any) {
    console.error('=== FEED CREATION ERROR DEBUG ===');
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message || 'No message');
    console.error('Error stack:', error.stack || 'No stack');
    console.error('Request body:', body || 'No body parsed');
    console.error('Validated data:', validatedData || 'No validation');
    console.error('Full error object:', error);
    console.error('=== END FEED CREATION ERROR ===');
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create feed purchase' }, { status: 500 });
  }
}