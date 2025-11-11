import React from 'react';

type FeedType = 'STARTER' | 'GROWER' | 'FINISHER';

interface FeedTypeBadgeProps {
  feedType: FeedType;
}

const FeedTypeBadge: React.FC<FeedTypeBadgeProps> = ({ feedType }) => {
  const feedTypeConfig = {
    STARTER: { label: 'Starter', color: 'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-400' },
    GROWER: { label: 'Grower', color: 'bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-400' },
    FINISHER: { label: 'Finisher', color: 'bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-400' },
  };

  const config = feedTypeConfig[feedType];

  // Fallback for invalid or undefined feedType
  if (!config) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
        {feedType || 'Unknown'}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

export default FeedTypeBadge;