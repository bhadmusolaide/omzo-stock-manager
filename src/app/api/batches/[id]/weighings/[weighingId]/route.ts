import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const updateWeighingSchema = z.object({
  takenAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  sampleCount: z.number().int().min(1, 'Sample count must be greater than 0').optional(),
  avgWeightKg: z.number().min(0.001, 'Average weight must be greater than 0').optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; weighingId: string }> }
) {
  try {
    const { id: batchId, weighingId } = await params;
    const supabase = createClientServiceRole();

    const { data: weighing, error } = await supabase
      .from('weighings')
      .select('*')
      .eq('id', weighingId)
      .eq('batch_id', batchId)
      .maybeSingle();

    if (error) throw error;
    if (!weighing) {
      return NextResponse.json({ error: 'Weighing not found' }, { status: 404 });
    }

    // Transform to camelCase
    const transformedWeighing = {
      id: weighing.id,
      batchId: weighing.batch_id,
      takenAt: weighing.taken_at,
      sampleCount: weighing.sample_count,
      avgWeightKg: weighing.avg_weight_kg,
      totalSampleWeightKg: weighing.total_sample_weight_kg,
      notes: weighing.notes,
      createdAt: weighing.created_at,
      updatedAt: weighing.updated_at,
    };

    return NextResponse.json(transformedWeighing);
  } catch (error) {
    console.error('Error fetching weighing:', error);
    return NextResponse.json({ error: 'Failed to fetch weighing' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; weighingId: string }> }
) {
  try {
    const { id: batchId, weighingId } = await params;
    const body = await request.json();
    const validatedData = updateWeighingSchema.parse(body);

    const supabase = createClientServiceRole();

    // Verify weighing exists and belongs to the batch
    const { data: existingWeighing, error: fetchError } = await supabase
      .from('weighings')
      .select('*')
      .eq('id', weighingId)
      .eq('batch_id', batchId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingWeighing) {
      return NextResponse.json({ error: 'Weighing not found' }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.takenAt !== undefined) updatePayload.taken_at = validatedData.takenAt;
    if (validatedData.sampleCount !== undefined) updatePayload.sample_count = validatedData.sampleCount;
    if (validatedData.avgWeightKg !== undefined) updatePayload.avg_weight_kg = validatedData.avgWeightKg;
    if (validatedData.notes !== undefined) updatePayload.notes = validatedData.notes;

    const { data: updatedWeighing, error } = await supabase
      .from('weighings')
      .update(updatePayload)
      .eq('id', weighingId)
      .select()
      .single();

    if (error) throw error;

    // Transform to camelCase
    const transformedWeighing = {
      id: updatedWeighing.id,
      batchId: updatedWeighing.batch_id,
      takenAt: updatedWeighing.taken_at,
      sampleCount: updatedWeighing.sample_count,
      avgWeightKg: updatedWeighing.avg_weight_kg,
      totalSampleWeightKg: updatedWeighing.total_sample_weight_kg,
      notes: updatedWeighing.notes,
      createdAt: updatedWeighing.created_at,
      updatedAt: updatedWeighing.updated_at,
    };

    return NextResponse.json(transformedWeighing);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating weighing:', error);
    return NextResponse.json({ error: 'Failed to update weighing' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; weighingId: string }> }
) {
  try {
    const { id: batchId, weighingId } = await params;
    const supabase = createClientServiceRole();

    // Verify weighing exists and belongs to the batch
    const { data: existingWeighing, error: fetchError } = await supabase
      .from('weighings')
      .select('*')
      .eq('id', weighingId)
      .eq('batch_id', batchId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingWeighing) {
      return NextResponse.json({ error: 'Weighing not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('weighings')
      .delete()
      .eq('id', weighingId);

    if (error) throw error;

    return NextResponse.json({ message: 'Weighing deleted successfully' });
  } catch (error) {
    console.error('Error deleting weighing:', error);
    return NextResponse.json({ error: 'Failed to delete weighing' }, { status: 500 });
  }
}