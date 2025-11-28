'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CreditCard, User, Clock, DollarSign, CheckCircle2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
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

const PendingPaymentsCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { data: orders = [], isLoading } = usePendingPayments();
  const updateOrder = useUpdateOrder();

  // Helper function to calculate days since order
  const getDaysSinceOrder = (orderDate: string) => {
    const orderDateTime = new Date(orderDate).getTime();
    const now = new Date().getTime();
    const diffTime = now - orderDateTime;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filter to only show PENDING and PARTIAL orders
  const pendingOrders = Array.isArray(orders)
    ? orders.filter(order => order.paymentStatus === 'PENDING' || order.paymentStatus === 'PARTIAL')
    : [];

  // Auto-hide carousel when there are no pending orders
  useEffect(() => {
    if (pendingOrders.length === 0) {
      setIsVisible(false);
    } else if (!isVisible) {
      setIsVisible(true);
    }
  }, [pendingOrders.length, isVisible]);

  // Auto-advance carousel
  useEffect(() => {
    if (pendingOrders.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % pendingOrders.length);
    }, 6000); // Change slide every 6 seconds

    return () => clearInterval(interval);
  }, [pendingOrders.length]);

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      const order = pendingOrders.find(o => o.id === orderId);
      if (!order) return;

      await updateOrder.mutateAsync({
        id: orderId,
        data: { amountPaid: order.totalAmount }
      });

      toast.success('Payment status updated successfully');
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const nextSlide = () => {
    setCurrentIndex(prev => (prev + 1) % pendingOrders.length);
  };

  const prevSlide = () => {
    setCurrentIndex(prev => (prev - 1 + pendingOrders.length) % pendingOrders.length);
  };

  if (!isVisible || pendingOrders.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mb-4">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
            <span className="text-sm text-amber-800 dark:text-amber-200">Loading pending payments...</span>
          </div>
        </div>
      </div>
    );
  }

  // Get current order to display
  const currentOrder = pendingOrders[currentIndex];
  const paymentProgress = ((currentOrder.amountPaid / currentOrder.totalAmount) * 100);

  const daysSinceOrder = getDaysSinceOrder(currentOrder.orderDate);

  return (
    <div className="mb-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-xl shadow-lg overflow-hidden"
      >
        <div className="p-4 text-white">
          {/* Header - Compact */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Pending Payments</h3>
                <p className="text-xs opacity-90">
                  {pendingOrders.length} outstanding
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center hover:bg-white/30 transition-colors"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Main Content - Horizontal Layout */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-3"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left side - Order info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-4 h-4 opacity-80" />
                    <span className="font-medium text-sm">{currentOrder.orderNumber}</span>
                    <span className="text-xs opacity-75">•</span>
                    <User className="w-4 h-4 opacity-80" />
                    <span className="text-sm opacity-90 truncate">{currentOrder.customerName}</span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 opacity-80" />
                      <span className="opacity-90">{daysSinceOrder} day{daysSinceOrder !== 1 ? 's' : ''} ago</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 opacity-80" />
                      <span className="font-semibold">{formatCurrency(currentOrder.balanceDue)}</span>
                    </div>
                    {currentOrder.paymentStatus === 'PARTIAL' && (
                      <div className="text-xs opacity-80">
                        ({formatCurrency(currentOrder.amountPaid)} paid)
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side - Action button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleMarkAsPaid(currentOrder.id)}
                  className="px-3 py-1.5 bg-white text-orange-600 rounded-lg font-medium hover:bg-opacity-90 transition-all text-sm flex items-center gap-1.5 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark Paid
                </motion.button>
              </div>

              {/* Progress bar for partial payments */}
              {currentOrder.paymentStatus === 'PARTIAL' && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1 opacity-90">
                    <span>Payment Progress</span>
                    <span>{paymentProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5">
                    <div
                      className="bg-white rounded-full h-1.5 transition-all duration-500"
                      style={{ width: `${paymentProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation dots - Compact */}
          {pendingOrders.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {pendingOrders.map((_, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.2 }}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    currentIndex === index
                      ? 'bg-white'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Go to payment ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PendingPaymentsCarousel;