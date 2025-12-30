'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import FeedTypeBadge from '@/components/ui/FeedTypeBadge';
import Loading from '@/components/ui/Loading';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { formatCurrency } from '@/utils/currency';
import { useFeedBorrows, useSettleFeedBorrow, useCancelFeedBorrow, FeedBorrow } from '@/hooks/useFeedBorrows';
import { toast } from '@/store/toast';

interface FeedBorrowsTableProps {
  batchId?: string;
  showAllBatches?: boolean;
}

type StatusBadgeColor = 'yellow' | 'green' | 'gray';

const statusColors: Record<string, StatusBadgeColor> = {
  PENDING: 'yellow',
  SETTLED: 'green',
  CANCELLED: 'gray',
};

export default function FeedBorrowsTable({ batchId, showAllBatches = false }: FeedBorrowsTableProps) {
  const { data: borrowsData, isLoading, error, refetch } = useFeedBorrows(batchId);
  const borrows: FeedBorrow[] = borrowsData?.feedBorrows || [];
  const settleFeedBorrow = useSettleFeedBorrow();
  const cancelFeedBorrow = useCancelFeedBorrow();

  const [settlingBorrowId, setSettlingBorrowId] = useState<string | null>(null);
  const [cancellingBorrowId, setCancellingBorrowId] = useState<string | null>(null);
  const [selectedSettleMethod, setSelectedSettleMethod] = useState<'RETURNED' | 'PURCHASED' | 'WRITTEN_OFF'>('RETURNED');

  const handleSettle = async () => {
    if (!settlingBorrowId) return;
    try {
      await settleFeedBorrow.mutateAsync({
        id: settlingBorrowId,
        action: 'settle',
        settledMethod: selectedSettleMethod,
      });
      toast.success('Feed borrow settled successfully');
      setSettlingBorrowId(null);
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to settle borrow';
      toast.error(message);
    }
  };

  const handleCancel = async () => {
    if (!cancellingBorrowId) return;
    try {
      await cancelFeedBorrow.mutateAsync(cancellingBorrowId);
      toast.success('Feed borrow cancelled');
      setCancellingBorrowId(null);
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel borrow';
      toast.error(message);
    }
  };

  if (isLoading) {
    return <Loading text="Loading feed borrows..." className="p-4" />;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading feed borrows</div>;
  }

  if (borrows.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <p>No feed borrows recorded yet.</p>
      </div>
    );
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const color = statusColors[status] || 'gray';
    const colorClasses = {
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses[color]}`}>
        {status}
      </span>
    );
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                From → To
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Feed Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Cost Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
            {borrows.map((borrow) => (
              <tr key={borrow.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {new Date(borrow.borrow_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {borrow.source_batch?.name || 'Unknown'}
                  </span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {borrow.target_batch?.name || 'Unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <FeedTypeBadge feedType={borrow.feed_type as 'STARTER' | 'GROWER' | 'FINISHER'} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {borrow.kg_borrowed.toFixed(2)} kg
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {formatCurrency(borrow.cost_value)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={borrow.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {borrow.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSettlingBorrowId(borrow.id)}
                        className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400">
                        Settle
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCancellingBorrowId(borrow.id)}
                        className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400">
                        Cancel
                      </Button>
                    </div>
                  )}
                  {borrow.status === 'SETTLED' && borrow.settled_method && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {borrow.settled_method}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Settle Modal */}
      {settlingBorrowId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSettlingBorrowId(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Settle Feed Borrow
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              How was this feed borrow settled?
            </p>
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                <input
                  type="radio"
                  name="settleMethod"
                  value="RETURNED"
                  checked={selectedSettleMethod === 'RETURNED'}
                  onChange={() => setSelectedSettleMethod('RETURNED')}
                  className="text-green-600"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Returned</div>
                  <div className="text-xs text-gray-500">Feed was returned to the source batch</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                <input
                  type="radio"
                  name="settleMethod"
                  value="PURCHASED"
                  checked={selectedSettleMethod === 'PURCHASED'}
                  onChange={() => setSelectedSettleMethod('PURCHASED')}
                  className="text-green-600"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Purchased</div>
                  <div className="text-xs text-gray-500">Target batch purchased replacement feed</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                <input
                  type="radio"
                  name="settleMethod"
                  value="WRITTEN_OFF"
                  checked={selectedSettleMethod === 'WRITTEN_OFF'}
                  onChange={() => setSelectedSettleMethod('WRITTEN_OFF')}
                  className="text-green-600"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Written Off</div>
                  <div className="text-xs text-gray-500">Cost allocated to target batch expenses</div>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSettlingBorrowId(null)}>
                Cancel
              </Button>
              <Button onClick={handleSettle} disabled={settleFeedBorrow.isPending}>
                {settleFeedBorrow.isPending ? 'Settling...' : 'Confirm Settlement'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={!!cancellingBorrowId}
        title="Cancel Feed Borrow"
        message="Are you sure you want to cancel this feed borrow? The borrowed feed will be returned to the source batch's available stock."
        confirmText="Cancel Borrow"
        cancelText="Keep"
        isDangerous={true}
        isLoading={cancelFeedBorrow.isPending}
        onConfirm={handleCancel}
        onCancel={() => setCancellingBorrowId(null)}
      />
    </>
  );
}

