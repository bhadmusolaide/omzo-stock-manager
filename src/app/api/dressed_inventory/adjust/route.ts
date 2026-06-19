import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const adjustInventorySchema = z.object({
  productType: z.string().min(1, 'Product type is required'),
  batchId: z.string().uuid().optional(),
  adjustmentCount: z.number().int().optional(),
  adjustmentWeightKg: z.number().optional(),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = adjustInventorySchema.parse(body);

    const supabase = createClientServiceRole();

    let query = supabase
      .from('dressed_inventory')
      .select('*')
      .eq('product_type', validatedData.productType)
      .is('batch_id', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (validatedData.batchId) {
      query = supabase
        .from('dressed_inventory')
        .select('*')
        .eq('product_type', validatedData.productType)
        .eq('batch_id', validatedData.batchId)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .limit(1);
    }

    const { data: existingInventory, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      console.error('Error fetching inventory for adjustment:', fetchError);
      throw fetchError;
    }

    let inventoryId: string | null = null;
    let newAvailableCount = 0;
    let newAvailableWeightKg = 0;

    if (existingInventory) {
      inventoryId = existingInventory.id;
      const currentCount = existingInventory.available_count || 0;
      const currentWeight = existingInventory.available_weight_kg || 0;
      const adjustCount = validatedData.adjustmentCount || 0;
      const adjustWeight = validatedData.adjustmentWeightKg || 0;

      newAvailableCount = currentCount + adjustCount;
      newAvailableWeightKg = currentWeight + adjustWeight;

      if (newAvailableCount < 0 || newAvailableWeightKg < 0) {
        return NextResponse.json({
          error: `Inventory cannot go negative. Current count: ${currentCount}, adjustment: ${adjustCount}, result: ${newAvailableCount}. Current weight: ${currentWeight}, adjustment: ${adjustWeight}, result: ${newAvailableWeightKg}`,
        }, { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('dressed_inventory')
        .update({
          available_count: newAvailableCount,
          available_weight_kg: newAvailableWeightKg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inventoryId);

      if (updateError) throw updateError;
    } else {
      newAvailableCount = validatedData.adjustmentCount || 0;
      newAvailableWeightKg = validatedData.adjustmentWeightKg || 0;

      if (newAvailableCount < 0 || newAvailableWeightKg < 0) {
        return NextResponse.json({ error: 'Cannot create negative inventory' }, { status: 400 });
      }

      const insertPayload = {
        product_type: validatedData.productType,
        batch_id: validatedData.batchId || null,
        available_count: newAvailableCount,
        available_weight_kg: newAvailableWeightKg,
        unit_price: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newInventory, error: insertError } = await supabase
        .from('dressed_inventory')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) throw insertError;
      inventoryId = newInventory.id;
    }

    // Cleanup: when an assigned entry exists, soft-delete any orphaned NULL-batch_id rows for same product_type
    if (validatedData.batchId) {
      const { data: orphaned } = await supabase
        .from('dressed_inventory')
        .select('id')
        .eq('product_type', validatedData.productType)
        .is('batch_id', null)
        .eq('is_deleted', false);

      if (orphaned && orphaned.length > 0) {
        await supabase
          .from('dressed_inventory')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .in('id', orphaned.map((r: { id: string }) => r.id));
      }
    }

    const { data: updatedInventory, error: finalError } = await supabase
      .from('dressed_inventory')
      .select('*')
      .eq('id', inventoryId)
      .single();

    if (finalError) throw finalError;

    const transformedInventory = {
      id: updatedInventory.id,
      productType: updatedInventory.product_type,
      batchId: updatedInventory.batch_id,
      availableCount: updatedInventory.available_count,
      availableWeightKg: updatedInventory.available_weight_kg,
      unitPrice: updatedInventory.unit_price,
      createdAt: updatedInventory.created_at,
      updatedAt: updatedInventory.updated_at,
    };

    if (updatedInventory.batch_id) {
      const batchId = updatedInventory.batch_id;
      const { data: batchData } = await supabase
        .from('batches')
        .select('current_live, status')
        .eq('id', batchId)
        .single();

      if (batchData && batchData.status !== 'CLOSED') {
        const currentLive = batchData.current_live || 0;

        const { data: dressedInventory } = await supabase
          .from('dressed_inventory')
          .select('available_count, available_weight_kg')
          .eq('batch_id', batchId)
          .eq('is_deleted', false);

        const totalDressedCount = dressedInventory?.reduce((sum, item) => sum + (item.available_count || 0), 0) || 0;
        const totalDressedWeight = dressedInventory?.reduce((sum, item) => sum + (item.available_weight_kg || 0), 0) || 0;

        if (currentLive <= 0 && totalDressedCount <= 0 && totalDressedWeight <= 0) {
          await supabase
            .from('batches')
            .update({
              status: 'CLOSED',
              updated_at: new Date().toISOString()
            })
            .eq('id', batchId);

          console.log(`Auto-closed batch ${batchId} after manual adjustment as inventory is empty.`);
        }
      }
    }

    return NextResponse.json({
      message: 'Inventory adjusted successfully',
      inventory: transformedInventory,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error adjusting inventory:', error);
    return NextResponse.json({ error: 'Failed to adjust inventory' }, { status: 500 });
  }
}
