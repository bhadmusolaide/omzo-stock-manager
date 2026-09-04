'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, User, Clock, DollarSign, CheckCircle2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { usePendingPayments } from '@/hooks/usePendingPayments';
import { useUpdateOrder } from '@/hooks/useOrders';
import { toast } from '@/store/toast';

interface PendingOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  orderDate: string;
}

function getDaysSinceOrder(orderDate: string) {
  const diffTime = Date.now() - new Date(orderDate).getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getRowUrgencyClass(days: number) {
  if (days >= 15) return 'border-l-red-600 bg-red-50 dark:bg-red-900/10';
  if (days >= 8) return 'border-l-red-400 bg-red-50/50 dark:bg-red-900/5';
  if (days >= 3) return 'border-l-amber-400 bg-amber-50/50 dark:bg-amber-900/5';
  return 'border-l-gray-300 dark:border-l-slate-600';
}

function getUrgencyLabel(days: number) {
  if (days >= 15) return { label: 'Overdue', classes: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40' };
  if (days >= 8) return { label: 'Late', classes: 'text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/30' };
  if (days >= 3) return { label: 'Due', classes: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40' };
  return { label: 'Recent', classes: 'text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800' };
}

const PendingPaymentsCarousel = () => {
  const [expanded, setExpanded] = useState(true);
  const { data: orders = [], isLoading } = usePendingPayments();
  const updateOrder = useUpdateOrder();

  const pendingOrders = Array.isArray(orders)
    ? orders.filter(order => order.paymentStatus === 'PENDING' || order.paymentStatus === 'PARTIAL')
    : [];

  const totalOutstanding = pendingOrders.reduce((sum, o) => sum + o.balanceDue, 0);

  const handleMarkAsPaid = async (order: PendingOrder) => {
    try {
      await updateOrder.mutateAsync({
        id: order.id,
        data: { amountPaid: order.totalAmount }
      });
      toast.success(`${order.orderNumber} marked as paid`);
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  if (isLoading) {
    return (
      <div className="mb-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 animate-spin" />
            <span className="text-sm text-gray-500 dark:text-slate-400">Loading pending payments...</span>
          </div>
        </div>
      </div>
    );
  }

  if (pendingOrders.length === 0) return null;

  return (
    <div className="mb-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden"
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-b border-gray-100 dark:border-slate-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-slate-100">Pending Payments</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {pendingOrders.length} order{pendingOrders.length !== 1 ? 's' : ''} — {formatCurrency(totalOutstanding)} outstanding
              </p>
            </div>
          </div>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </button>

        {/* Expandable list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 space-y-2">
                {pendingOrders.map((order, idx) => {
                  const daysSince = getDaysSinceOrder(order.orderDate);
                  const urgency = getUrgencyLabel(daysSince);
                  const paymentProgress = (order.amountPaid / order.totalAmount) * 100;
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`rounded-lg border border-gray-200 dark:border-slate-600 border-l-4 bg-white dark:bg-slate-800 p-3 ${getRowUrgencyClass(daysSince)}`}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-slate-100">
                            <CreditCard className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="font-medium truncate">{order.orderNumber}</span>
                            <span className="text-gray-300 dark:text-slate-600">•</span>
                            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate text-gray-600 dark:text-slate-300">{order.customerName}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${urgency.classes}`}>
                              <Calendar className="w-3 h-3" />
                              {daysSince}d • {urgency.label}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(order.balanceDue)}</span>
                            {order.paymentStatus === 'PARTIAL' && (
                              <span className="text-gray-500 dark:text-slate-400">({formatCurrency(order.amountPaid)} paid)</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(order); }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all text-sm flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Paid
                        </button>
                      </div>
                      {order.paymentStatus === 'PARTIAL' && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                            <div className="bg-red-500 rounded-full h-1.5 transition-all duration-500" style={{ width: `${paymentProgress}%` }} />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default PendingPaymentsCarousel;