'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function DashboardLayout({
  children,
  title,
  subtitle,
  actions,
  className,
}: DashboardLayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={clsx('flex-1 flex flex-col', className)}
    >
      {/* Header */}
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              {title && (
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-slate-900">
        {children}
      </div>
    </motion.div>
  );
}

// Page container for consistent spacing
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('max-w-7xl mx-auto', className)}>
      {children}
    </div>
  );
}

// Section component for grouping content
export function Section({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('mb-6', className)}>
      {title && (
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

