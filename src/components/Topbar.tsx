'use client';

import { Search, Moon, Sun, Bell, User, Wallet, CreditCard, AlertCircle } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { motion } from 'framer-motion';
import { useOverviewMetrics } from '@/features/reports/hooks/useReports';
import { formatCurrency } from '@/utils/currency';
import { useState, useRef, useEffect } from 'react';
import { usePendingPayments } from '@/hooks/usePendingPayments';
import { useTransactions } from '@/hooks/useTransactions';

// Format date helper function (replaces date-fns format function)
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Topbar = () => {
  const { isDark, setTheme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { data: metrics, isLoading } = useOverviewMetrics();
  const { data: pendingPayments = [] } = usePendingPayments();
  const { data: transactionsData, isLoading: txLoading } = useTransactions({ limit: 1000 });

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  // Filter to only show PENDING and PARTIAL payments
  const pendingPaymentItems = pendingPayments.filter(payment => 
    payment.paymentStatus === 'PENDING' || payment.paymentStatus === 'PARTIAL'
  );

  // Calculate balance from transactions (CREDIT - DEBIT)
  const transactions = transactionsData?.transactions || [];
  const totalCredit = transactions?.filter((t: any) => t.type === 'CREDIT').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const totalDebit = transactions?.filter((t: any) => t.type === 'DEBIT').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const transactionBalance = totalCredit - totalDebit;

  return (
    <header className="border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shadow-sm">
      {/* Mobile search toggle */}
      <div className="flex items-center gap-2 sm:hidden">
        <button 
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Search size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Omzo Farmz</h1>
      </div>

      {/* Search Bar */}
      <div className={`flex-1 max-w-md ${isSearchOpen ? 'block' : 'hidden'} sm:block`}>
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            type="text"
            placeholder="Search batches, orders..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-6">
        {/* Current Balance Display */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="hidden md:flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-lg shadow"
        >
          <Wallet size={18} />
          <div className="flex flex-col">
            <span className="text-xs opacity-90">Balance</span>
            {isLoading || txLoading ? (
              <div className="h-4 w-16 bg-white/30 rounded animate-pulse"></div>
            ) : (
              <span className="font-bold text-sm">
                {formatCurrency(transactionBalance)}
              </span>
            )}
          </div>
        </motion.div>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors relative"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          >
            <Bell size={20} className="text-gray-600 dark:text-gray-400" />
            {pendingPaymentItems.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingPaymentItems.length}
              </span>
            )}
          </motion.button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50"
            >
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Pending Payments</h3>
                {pendingPaymentItems.length > 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {pendingPaymentItems.length} pending payment{pendingPaymentItems.length !== 1 ? 's' : ''} requiring attention
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No pending payments
                  </p>
                )}
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {pendingPaymentItems.length > 0 ? (
                  pendingPaymentItems.map((payment) => (
                    <div 
                      key={payment.id} 
                      className="p-4 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <CreditCard size={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {payment.orderNumber}
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(payment.orderDate)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {payment.customerName}
                          </p>
                          <div className="flex justify-between items-center mt-2">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(payment.balanceDue)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Paid: {formatCurrency(payment.amountPaid)} of {formatCurrency(payment.totalAmount)}
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              payment.paymentStatus === 'PENDING' 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' 
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                            }`}>
                              {payment.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <div className="mx-auto bg-gray-100 dark:bg-slate-700 rounded-full p-3 w-12 h-12 flex items-center justify-center mb-4">
                      <AlertCircle className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">All caught up!</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      No pending payments right now.
                    </p>
                  </div>
                )}
              </div>
              
              {pendingPaymentItems.length > 0 && (
                <div className="p-3 bg-gray-50 dark:bg-slate-700/50 text-center border-t border-gray-200 dark:border-slate-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Click on payments in the Orders section to mark as paid
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          {isDark ? (
            <Sun size={20} className="text-yellow-500" />
          ) : (
            <Moon size={20} className="text-gray-600" />
          )}
        </motion.button>

        {/* User Menu */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <User size={18} className="text-white" />
          </div>
        </motion.button>
      </div>
    </header>
  );
};

export default Topbar;