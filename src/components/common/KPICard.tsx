'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'green' | 'blue' | 'orange' | 'red' | 'purple';
  loading?: boolean;
}

const colorMap = {
  green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
};

export function KPICard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  color = 'green',
  loading = false,
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl p-4 sm:p-6 shadow-md dark:shadow-lg hover:shadow-lg dark:hover:shadow-xl transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">
            {title}
          </p>
          {loading ? (
            <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20 sm:w-24" />
          ) : (
            <div className="flex items-baseline gap-1 sm:gap-2">
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                {value}
              </h3>
              {unit && (
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {unit}
                </span>
              )}
            </div>
          )}
          {trend && (
            <div className="mt-1 sm:mt-2 flex items-center gap-1">
              <span
                className={clsx(
                  'text-xs font-medium',
                  trend.isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx('p-2 sm:p-3 rounded-xl', colorMap[color])}>
            <Icon size={20} className="sm:w-6 sm:h-6" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Skeleton loader
export function KPICardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl p-4 sm:p-6 shadow-md dark:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 sm:w-24 mb-1 sm:mb-2" />
          <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 sm:w-32" />
        </div>
        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}