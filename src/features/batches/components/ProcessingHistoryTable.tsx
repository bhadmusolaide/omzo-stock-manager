'use client';

import { useState, useEffect, useCallback } from 'react';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { toast } from '@/store/toast';

interface ProcessingHistoryTableProps {
  batchId?: string | null;
}

export default function ProcessingHistoryTable({ batchId }: ProcessingHistoryTableProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (batchId) {
        params.set('batchId', batchId);
      }
      const response = await fetch(`/api/processing-events?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data || []);
      } else {
        console.error('Failed to fetch processing history');
      }
    } catch (error) {
      console.error('Error fetching processing history:', error);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (eventId: string) => {
    setDeletingId(eventId);
    try {
      const response = await fetch(`/api/processing-events?id=${eventId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Processing event deleted, changes reversed');
        fetchHistory();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Failed to delete processing event');
      }
    } catch (error) {
      console.error('Error deleting processing event:', error);
      toast.error('Failed to delete processing event');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const columns = [
    { 
      key: 'created_at', 
      header: 'Date', 
      render: (value: string) => new Date(value).toLocaleDateString() 
    },
    { 
      key: 'batches', 
      header: 'Batch', 
      render: (batch: any) => batch?.name || 'Unknown' 
    },
    { 
      key: 'live_birds_processed', 
      header: 'Birds Processed' 
    },
    { 
      key: 'avg_live_weight_kg', 
      header: 'Avg Live Wt (kg)',
      render: (val: number) => val?.toFixed(3) || '-'
    },
    {
      key: 'processing_outputs',
      header: 'Yield Output',
      minWidth: '250px',
      render: (outputs: any[]) => {
        if (!outputs || outputs.length === 0) return '-';
        return (
          <ul className="text-sm">
            {outputs.map(o => (
              <li key={o.id}>
                {o.output_type || o.product_name}: {o.unit_count || o.count || 0} units, {(o.total_weight_kg || o.quantity || 0).toFixed(2)} kg
              </li>
            ))}
          </ul>
        );
      }
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (_: unknown, row: any) => (
        <Button
          size="sm"
          variant="outline"
          disabled={deletingId === row.id}
          onClick={() => setConfirmDeleteId(row.id)}
          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
        >
          {deletingId === row.id ? '...' : 'Delete'}
        </Button>
      ),
    },
  ];

  if (loading) {
    return <Loading text="Loading history..." />;
  }

  if (history.length === 0) {
    return <p className="text-gray-500 p-4 text-center border rounded dark:border-slate-700 bg-white dark:bg-slate-800">No processing history found.</p>;
  }

  return (
    <div className="overflow-auto bg-white dark:bg-slate-800 rounded shadow-sm">
      <Table columns={columns} data={history} />
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Delete Processing Event"
        message="This will delete the processing event, reverse the dressed inventory changes, and restore the live bird count. Are you sure?"
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={!!deletingId}
        onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); }}
        onCancel={() => { setConfirmDeleteId(null); }}
      />
    </div>
  );
}
