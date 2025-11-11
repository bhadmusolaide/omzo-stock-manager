'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';

interface InsightBadgeProps {
  batchId?: string;
  orderId?: string;
}

export default function InsightBadges({ batchId, orderId }: InsightBadgeProps) {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        let url = '/api/ai/recalculate';
        
        if (batchId) {
          url = `/api/ai/batch/${batchId}`;
        } else if (orderId) {
          url = `/api/ai/order/${orderId}`;
        }
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setInsights(data.insights || []);
        }
      } catch (error) {
        console.error('Error fetching insights:', error);
      } finally {
        setLoading(false);
      }
    };

    if (batchId || orderId) {
      fetchInsights();
    }
  }, [batchId, orderId]);

  if (loading) {
    return (
      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary" className="h-5">Loading...</Badge>
      </div>
    );
  }

  if (!insights.length) {
    return null;
  }

  // Get the most critical insights to display
  const criticalInsights = insights.slice(0, 2);

  return (
    <div className="flex flex-wrap gap-1">
      {criticalInsights.map((insight) => {
        // Determine badge variant based on insight type and value
        let variant: 'default' | 'secondary' | 'success' | 'danger' = 'default';
        let icon = null;
        
        switch (insight.insight_type) {
          case 'feed_prediction':
            // Check if feed is running low
            if (insight.insight_value?.feedWillRunOutInDays !== null && 
                insight.insight_value?.feedWillRunOutInDays <= 7) {
              variant = 'danger';
              icon = <AlertTriangle className="h-3 w-3 mr-1" />;
            } else {
              variant = 'secondary';
            }
            break;
          case 'growth_projection':
            variant = 'default';
            icon = <TrendingUp className="h-3 w-3 mr-1" />;
            break;
          case 'pricing_suggestion':
            variant = 'secondary';
            icon = <DollarSign className="h-3 w-3 mr-1" />;
            break;
          case 'order_profitability':
            // Check if margin is low
            if (insight.insight_value?.isLowMargin) {
              variant = 'danger';
              icon = <AlertTriangle className="h-3 w-3 mr-1" />;
            } else if (insight.insight_value?.isHighMargin) {
              variant = 'default';
              icon = <TrendingUp className="h-3 w-3 mr-1" />;
            } else {
              variant = 'secondary';
            }
            break;
          default:
            variant = 'secondary';
        }

        return (
          <Badge key={insight.id} variant={variant as 'default' | 'secondary' | 'success' | 'danger' | undefined} className="h-5 text-xs">
            {icon}
            {insight.insight_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()).substring(0, 12)}
            {insight.insight_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()).length > 12 ? '...' : ''}
          </Badge>
        );
      })}
    </div>
  );
}