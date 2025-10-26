import React from 'react';

type BatchStatus = 'BROODING' | 'GROWING' | 'PROCESSING' | 'CLOSED';

interface BatchStatusBadgeProps {
  status: BatchStatus;
}

const BatchStatusBadge: React.FC<BatchStatusBadgeProps> = ({ status }) => {
  const statusConfig = {
    BROODING: { label: 'Brooding', color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-400' },
    GROWING: { label: 'Growing', color: 'bg-green-100 dark:bg-green-900/20 text-green-900 dark:text-green-400' },
    PROCESSING: { label: 'Processing', color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-900 dark:text-blue-400' },
    CLOSED: { label: 'Closed', color: 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-300' },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

export default BatchStatusBadge;