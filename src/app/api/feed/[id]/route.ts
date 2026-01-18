import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const updateFeedPurchaseSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required').optional(),
  feedType: z.enum(['STARTER', 'GROWER', 'FINISHER']).optional(),
  brand: z.enum(['Ultima +', 'Peak Feeds', 'BreedWell', 'New Hope', 'Happy Chicken', 'Chikum', 'TopFeeds']).optional(),
  kg: z.number().positive('KG must be greater than 0').optional(),
  bagCost: z.number().positive('Bag cost must be greater than 0').optional(),
  supplier: z.string().optional(),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  notes: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClientServiceRole();
    const { data: feedPurchase, error } = await supabase
      .from('feed_purchases')
      .select(`
        *,
        batches!batch_id (id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching feed purchase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!feedPurchase) {
      return NextResponse.json({ error: 'Feed purchase not found' }, { status: 404 });
    }

    return NextResponse.json(feedPurchase);
  } catch (error) {
    console.error('Error fetching feed purchase:', error);
    return NextResponse.json({ error: 'Failed to fetch feed purchase' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateFeedPurchaseSchema.parse(body);

    // Recalculate totalCost if kg or bagCost is updated
    let totalCost = undefined;
    if (validatedData.kg !== undefined || validatedData.bagCost !== undefined) {
      const supabase = createClientServiceRole();
    const { data: feedPurchase, error } = await supabase
      .from('feed_purchases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching feed purchase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
      if (feedPurchase) {
        const newKg = validatedData.kg ?? feedPurchase.kg;
        const newBagCost = validatedData.bagCost ?? feedPurchase.unit_cost;
        totalCost = newKg / 25 * newBagCost;
      }
    }

    const supabase = createClientServiceRole();

    const updateData: any = {};
    if (validatedData.batchId !== undefined) updateData.batch_id = validatedData.batchId;
    if (validatedData.feedType !== undefined) updateData.feed_type = validatedData.feedType;
    if (validatedData.brand !== undefined) updateData.brand = validatedData.brand;
    if (validatedData.kg !== undefined) updateData.kg = validatedData.kg;
    if (validatedData.bagCost !== undefined) updateData.unit_cost = validatedData.bagCost;
    if (totalCost !== undefined) updateData.total_cost = totalCost;
    if (validatedData.supplier !== undefined) updateData.supplier = validatedData.supplier;
    if (validatedData.purchaseDate !== undefined) updateData.purchase_date = new Date(validatedData.purchaseDate).toISOString();
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;

    const { data: updatedFeedPurchase, error } = await supabase
      .from('feed_purchases')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        batches!batch_id (id, name)
      `)
      .single();

    if (error) {
      console.error('Error updating feed purchase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updatedFeedPurchase);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating feed purchase:', error);
    return NextResponse.json({ error: 'Failed to update feed purchase' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClientServiceRole();
    const { error } = await supabase.from('feed_purchases').delete().eq('id', id);

    if (error) {
      console.error('Error deleting feed purchase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }


    return NextResponse.json({ message: 'Feed purchase deleted successfully' });
  } catch (error) {
    console.error('Error deleting feed purchase:', error);
    return NextResponse.json({ error: 'Failed to delete feed purchase' }, { status: 500 });
  }
}