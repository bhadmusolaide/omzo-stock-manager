'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CreditCard, User, Calendar } from 'lucide-react';
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
  const { data: orders = [], isLoading, refetch } = usePendingPayments();
  const updateOrder = useUpdateOrder();

  // Filter to only show PENDING and PARTIAL orders
  const pendingOrders = orders.filter(
    order => order.paymentStatus === 'PENDING' || order.paymentStatus === 'PARTIAL'
  );

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
    if (pendingOrders.length <= 3) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % (pendingOrders.length - 2));
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [pendingOrders.length]);

  // Reset index when orders change
  useEffect(() => {
    setCurrentIndex(0);
  }, [orders.length]);

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      const order = pendingOrders.find(o => o.id === orderId);
      if (!order) return;

      await updateOrder.mutateAsync({
        id: orderId,
        data: { amountPaid: order.totalAmount }
      });

      toast.success('Payment status updated successfully');
      
      // Refetch to update the list
      refetch();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleOrderUpdate = useCallback(() => {
    refetch();
  }, [refetch]);

  // Auto-hide when all orders are paid
  useEffect(() => {
    if (pendingOrders.length === 0 && isVisible) {
      setIsVisible(false);
    }
  }, [pendingOrders.length, isVisible]);

  if (!isVisible || pendingOrders.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg p-4 mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            <span className="text-sm sm:text-base">Loading pending payments...</span>
          </div>
        </div>
      </div>
    );
  }

  // Get the orders to display (3 at a time)
  const getDisplayOrders = () => {
    if (pendingOrders.length <= 3) {
      return pendingOrders;
    }
    
    // For looping effect, we show 3 orders at a time
    const displayOrders = [];
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % pendingOrders.length;
      displayOrders.push(pendingOrders[index]);
    }
    return displayOrders;
  };

  const displayOrders = getDisplayOrders();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-r from-blue-400 to-indigo-400 text-white rounded-lg p-4 mb-6 shadow-lg relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white/10 rounded-full translate-y-8 -translate-x-8 sm:translate-y-12 sm:-translate-x-12"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <h3 className="font-bold text-lg">Pending Payments</h3>
          </div>
          <button 
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AnimatePresence mode="wait">
            {displayOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard size={16} />
                    <span className="font-medium text-sm truncate">{order.orderNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <User size={16} />
                    <span className="truncate text-sm">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-90 mb-2">
                    <Calendar size={14} />
                    <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-col items-start justify-between">
                  <div className="mb-2">
                    <div className="text-xs opacity-90">Amount Due</div>
                    <div className="text-base font-bold">{formatCurrency(order.balanceDue)}</div>
                    <div className="text-xs opacity-90">
                      Paid: {formatCurrency(order.amountPaid)} of {formatCurrency(order.totalAmount)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleMarkAsPaid(order.id)}
                    className="px-2 py-1 bg-white text-orange-600 rounded-full text-xs font-medium hover:bg-opacity-90 transition-colors"
                  >
                    Mark as Paid
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {pendingOrders.length > 3 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20">
            <div className="text-xs opacity-90">
              Showing {Math.min(3, pendingOrders.length)} of {pendingOrders.length} pending payments
            </div>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.ceil(pendingOrders.length / 3) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index * 3)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    Math.floor(currentIndex / 3) === index ? 'bg-white' : 'bg-white/40'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PendingPaymentsCarousel;