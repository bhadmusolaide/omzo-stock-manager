import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
        primary: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
        success: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
        warning: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
        error: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100',
        info: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
        pending: 'bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100',
        partial: 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100',
        paid: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-xs px-3 py-1',
        lg: 'text-sm px-4 py-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={clsx(badgeVariants({ variant, size }), className)} {...props} />
  );
}

// Status badge helper
export function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
    PENDING: 'pending',
    PARTIAL: 'partial',
    PAID: 'paid',
    ACTIVE: 'success',
    COMPLETED: 'default',
    BROODING: 'info',
    GROWING: 'primary',
    PROCESSING: 'warning',
    CLOSED: 'default',
  };

  return <Badge variant={statusMap[status] || 'default'}>{status}</Badge>;
}

