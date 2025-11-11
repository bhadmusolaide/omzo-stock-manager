import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface AIInsight {
  id: string;
  related_batch_id: string | null;
  insight_type: string;
  insight_value: any;
  created_at: string;
}

/**
 * Hook to fetch top AI insights for dashboard
 */
export function useTopAIInsights(limit: number = 3) {
  return useQuery<AIInsight[]>({
    queryKey: ['ai-insights', 'top', limit],
    queryFn: async () => {
      const res = await fetch('/api/ai/recalculate');
      if (!res.ok) throw new Error('Failed to fetch AI insights');
      const data = await res.json();
      return data.insights || [];
    },
  });
}

/**
 * Hook to fetch AI insights for a specific batch
 */
export function useBatchAIInsights(batchId: string | null) {
  return useQuery<AIInsight[]>({
    queryKey: ['ai-insights', 'batch', batchId],
    queryFn: async () => {
      if (!batchId) return [];
      const res = await fetch(`/api/ai/batch/${batchId}`);
      if (!res.ok) throw new Error('Failed to fetch batch AI insights');
      const data = await res.json();
      return data.insights || [];
    },
    enabled: !!batchId,
  });
}

/**
 * Hook to trigger AI insights recalculation
 */
export function useRecalculateAIInsights() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/recalculate', {
        method: 'POST',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to recalculate AI insights');
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all AI insights queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    },
  });
}