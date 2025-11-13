import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const createTransactionSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  type: z.enum(['CREDIT', 'DEBIT']),
  category: z.enum(['DOC', 'FEED', 'ORDER', 'EXPENSE', 'OTHER']),
  linkedBatchId: z.string().optional().transform(e => e === "" ? undefined : e),
  linkedOrderId: z.string().optional().transform(e => e === "" ? undefined : e),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServiceRole();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        batches!linked_batch_id (
          id,
          name
        ),
        orders!linked_order_id (
          id,
          customer_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (search) {
      query = query.ilike('description', `%${search}%`);
    }

    const { data: transactions, error, count } = await query;

    if (error) throw error;

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      transactions: transactions || [],
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body;
  let validatedData;
  try {
    body = await request.json();
    validatedData = createTransactionSchema.parse(body);

    const supabase = createClientServiceRole();

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        date: new Date(validatedData.date).toISOString(),
        description: validatedData.description,
        amount: validatedData.amount,
        type: validatedData.type,
        category: validatedData.category,
        linked_batch_id: validatedData.linkedBatchId,
        linked_order_id: validatedData.linkedOrderId,
      })
      .select(`
        *,
        batches!linked_batch_id (
          id,
          name
        ),
        orders!linked_order_id (
          id,
          customer_name
        )
      `)
      .single();

    if (transactionError) throw transactionError;

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    console.error('=== TRANSACTION CREATION ERROR DEBUG ===');
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message || 'No message');
    console.error('Error stack:', error.stack || 'No stack');
    console.error('Request body:', body || 'No body parsed');
    console.error('Validated data:', validatedData || 'No validation');
    console.error('Full error object:', error);
    console.error('=== END TRANSACTION CREATION ERROR ===');
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}