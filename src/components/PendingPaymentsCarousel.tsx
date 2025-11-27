'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CreditCard, User } from 'lucide-react';
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
    }, 5000); // Change slide every 5 seconds

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

  if (!isVisible || pendingOrders.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg p-3 mb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-xs">Loading pending payments...</span>
          </div>
        </div>
      </div>
    );
  }

  // Get current order to display
  const currentOrder = pendingOrders[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg p-3 mb-4 shadow-sm relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={16} />
            <h3 className="font-bold text-sm">Pending Payment</h3>
          </div>
          <div className="flex items-center gap-1">
            {pendingOrders.length > 1 && (
              <span className="text-xs opacity-90">
                {currentIndex + 1}/{pendingOrders.length}
              </span>
            )}
            <button 
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={14} />
              <span className="font-medium text-sm truncate">{currentOrder.orderNumber}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <User size={14} />
              <span className="truncate text-xs">{currentOrder.customerName}</span>
            </div>
            <div className="text-xs opacity-90">
              Amount Due: <span className="font-bold">{formatCurrency(currentOrder.balanceDue)}</span>
            </div>
          </div>
          <button
            onClick={() => handleMarkAsPaid(currentOrder.id)}
            className="px-2 py-1 bg-white text-indigo-600 rounded-full text-xs font-medium hover:bg-opacity-90 transition-colors whitespace-nowrap"
          >
            Mark Paid
          </button>
        </div>

        {pendingOrders.length > 1 && (
          <div className="flex gap-1 mt-2 justify-center">
            {pendingOrders.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  currentIndex === index ? 'bg-white' : 'bg-white/40'
                }`}
                aria-label={`Go to payment ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PendingPaymentsCarousel;