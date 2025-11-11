import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientServiceRole();

    // List of tables to reset (soft delete where possible)
    const tablesToReset = [
      'batches',
      'feed_purchases',
      'feed_usages',
      'orders',
      'transactions',
      'dressed_inventory',
      'order_items',
      // Add other tables like weighings, processing if needed
    ];

    // Soft delete for tables with is_deleted column
    const softDeleteTables = ['batches', 'feed_purchases', 'feed_usages', 'orders', 'transactions', 'dressed_inventory', 'order_items'];
    for (const table of softDeleteTables) {
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: true })
        .neq('is_deleted', true); // Only update non-deleted

      if (error) {
        console.error(`Error resetting ${table}:`, error);
        return NextResponse.json({ error: `Failed to reset ${table}` }, { status: 500 });
      }
    }

    // Hard delete for tables without is_deleted (e.g., order_items if no is_deleted)
    const hardDeleteTables: string[] = []; // Assuming no is_deleted
    for (const table of hardDeleteTables) {
      const { error } = await supabase.from(table).delete();

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        return NextResponse.json({ error: `Failed to delete from ${table}` }, { status: 500 });
      }
    }

    // Reset any auto-increment sequences if needed (PostgreSQL specific, optional)
    // For Supabase, IDs are UUIDs, so no need.

    return NextResponse.json({ success: true, message: 'All data tables have been reset to a clean slate.' });
  } catch (error) {
    console.error('Error during reset:', error);
    return NextResponse.json({ error: 'Failed to reset data' }, { status: 500 });
  }
}