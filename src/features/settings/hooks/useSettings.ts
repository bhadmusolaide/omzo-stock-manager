import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Settings {
  id: string;
  currency: string;
  currencySymbol: string;
  feedConversionPresets: string;
  lowStockThreshold: number;
  companyName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedConversionPresets {
  STARTER: number;
  GROWER: number;
  FINISHER: number;
}

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function parseFeedConversionPresets(presets: string): FeedConversionPresets {
  try {
    return JSON.parse(presets);
  } catch {
    return { STARTER: 1.8, GROWER: 2.0, FINISHER: 2.2 };
  }
}

