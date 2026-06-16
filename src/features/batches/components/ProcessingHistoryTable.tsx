'use client';

import { useState, useEffect } from 'react';
import Table from '@/components/ui/Table';
import Loading from '@/components/ui/Loading';

interface ProcessingHistoryTableProps {
  batchId?: string | null;
}

export default function ProcessingHistoryTable({ batchId }: ProcessingHistoryTableProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
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
    }
    
    fetchHistory();
  }, [batchId]);

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
    }
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
    </div>
  );
}
