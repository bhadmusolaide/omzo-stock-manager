import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const updateTransactionSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  amount: z.number().positive('Amount must be greater than 0').optional(),
  type: z.enum(['CREDIT', 'DEBIT']).optional(),
  category: z.enum(['DOC', 'FEED', 'ORDER', 'EXPENSE', 'OTHER']).optional(),
  linkedBatchId: z.string().optional().transform(e => e === "" ? undefined : e),
  linkedOrderId: z.string().optional().transform(e => e === "" ? undefined : e),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClientServiceRole();
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        batches!linked_batch_id (id, name),
        orders!linked_order_id (id, customer_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching transaction:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateTransactionSchema.parse(body);

    const supabase = createClientServiceRole();
    const updateData: any = {};
    if (validatedData.date !== undefined) updateData.date = new Date(validatedData.date).toISOString();
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.category !== undefined) updateData.category = validatedData.category;
    if (validatedData.linkedBatchId !== undefined) updateData.linked_batch_id = validatedData.linkedBatchId;
    if (validatedData.linkedOrderId !== undefined) updateData.linked_order_id = validatedData.linkedOrderId;

    const { data: updatedTransaction, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        batches!linked_batch_id (id, name),
        orders!linked_order_id (id, customer_name)
      `)
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClientServiceRole();
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}