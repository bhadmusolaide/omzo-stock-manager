'use client';

import { Search, Moon, Sun, Bell, User, Wallet } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { motion } from 'framer-motion';
import { useOverviewMetrics } from '@/features/reports/hooks/useReports';
import { formatCurrency } from '@/utils/currency';
import { useState } from 'react';

const Topbar = () => {
  const { isDark, setTheme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { data: metrics, isLoading } = useOverviewMetrics();

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

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
            {isLoading ? (
              <div className="h-4 w-16 bg-white/30 rounded animate-pulse"></div>
            ) : (
              <span className="font-bold text-sm">
                {formatCurrency(metrics?.overallProfit || 0)}
              </span>
            )}
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors relative"
        >
          <Bell size={20} className="text-gray-600 dark:text-gray-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </motion.button>

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