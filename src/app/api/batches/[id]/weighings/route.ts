import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const createWeighingSchema = z.object({
  takenAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  sampleCount: z.number().int().min(1, 'Sample count must be greater than 0'),
  avgWeightKg: z.number().min(0.001, 'Average weight must be greater than 0'),
  notes: z.string().optional(),
});

const getWeighingsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  orderBy: z.enum(['taken_at', 'created_at']).optional().default('taken_at'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    let supabase;
    try {
      supabase = createClientServiceRole();
    } catch (error) {
      console.warn('Supabase service role key not available, returning empty array');
      return NextResponse.json({
        weighings: [],
        count: 0,
      });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderBy = searchParams.get('orderBy') || 'taken_at';

    const validatedQuery = getWeighingsSchema.parse({
      limit,
      offset,
      orderBy,
    });

    const { data: weighings, error, count } = await supabase
      .from('weighings')
      .select('*', { count: 'exact' })
      .eq('batch_id', id)
      .order(validatedQuery.orderBy, { ascending: false })
      .range(validatedQuery.offset, validatedQuery.offset + validatedQuery.limit - 1);

    if (error) throw error;

    // Transform to camelCase
    const transformedWeighings = weighings?.map((w) => ({
      id: w.id,
      batchId: w.batch_id,
      takenAt: w.taken_at,
      sampleCount: w.sample_count,
      avgWeightKg: w.avg_weight_kg,
      totalSampleWeightKg: w.total_sample_weight_kg,
      notes: w.notes,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    })) || [];

    return NextResponse.json({
      weighings: transformedWeighings,
      count: count || 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error fetching weighings:', error);
    return NextResponse.json({ error: 'Failed to fetch weighings' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = createWeighingSchema.parse(body);

    let supabase;
    try {
      supabase = createClientServiceRole();
    } catch (error) {
      console.error('Supabase service role key not available');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Verify batch exists
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('id')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (batchError) throw batchError;
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const insertPayload = {
      batch_id: id,
      taken_at: validatedData.takenAt ? new Date(validatedData.takenAt).toISOString() : new Date().toISOString(),
      sample_count: validatedData.sampleCount,
      avg_weight_kg: validatedData.avgWeightKg,
      notes: validatedData.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: weighing, error } = await supabase
      .from('weighings')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

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

    return NextResponse.json(transformedWeighing, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating weighing:', error);
    return NextResponse.json({ error: 'Failed to create weighing' }, { status: 500 });
  }
}