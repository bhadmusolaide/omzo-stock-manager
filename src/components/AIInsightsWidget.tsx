'use client';

import { useState } from 'react';
import { useTopAIInsights, useRecalculateAIInsights } from '@/hooks/useAIInsights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { RefreshCw, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AIInsightsWidget() {
  const { data: insights, isLoading, error } = useTopAIInsights(3);
  const { mutate: recalculateInsights, isPending: isRecalculating } = useRecalculateAIInsights();
  const [showAll, setShowAll] = useState(false);

  const handleRecalculate = () => {
    recalculateInsights();
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'feed_prediction':
        return <AlertTriangle className="h-4 w-4" />;
      case 'growth_projection':
        return <TrendingUp className="h-4 w-4" />;
      case 'pricing_suggestion':
        return <DollarSign className="h-4 w-4" />;
      case 'order_profitability':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getInsightBadge = (type: string) => {
    switch (type) {
      case 'feed_prediction':
        return <Badge variant="danger">Feed</Badge>;
      case 'growth_projection':
        return <Badge variant="default">Growth</Badge>;
      case 'pricing_suggestion':
        return <Badge variant="secondary">Pricing</Badge>;
      case 'order_profitability':
        return <Badge variant="secondary">Profit</Badge>;
      default:
        return <Badge variant="default">Info</Badge>;
    }
  };

  const displayedInsights = showAll ? insights : insights?.slice(0, 3);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>AI Insights</span>
            <Button variant="outline" size="sm" disabled>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recalculate
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>AI Insights</span>
            <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={isRecalculating}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
              Recalculate
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading insights: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>AI Insights</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRecalculate} 
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayedInsights && displayedInsights.length > 0 ? (
          <div className="space-y-3">
            {displayedInsights.map((insight) => (
              <div key={insight.id} className="flex items-start space-x-2 p-2 rounded-lg border">
                <div className="mt-1 text-muted-foreground">
                  {getInsightIcon(insight.insight_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {getInsightBadge(insight.insight_type)}
                    <p className="text-sm font-medium truncate">
                      {insight.insight_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {insight.insight_value?.insightMessage || 'No message available'}
                  </p>
                </div>
              </div>
            ))}
            {insights && insights.length > 3 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show Less' : `Show ${insights.length - 3} More`}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No insights available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try recalculating to generate new insights
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}