'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useBatches } from '@/hooks/useBatches';
import { getBatchAgeInDays } from '@/utils/calculations';
import { getPhaseForDay, getUpcomingPhases, MEDICATION_SCHEDULE, CATEGORY_COLORS } from '@/lib/healthSchedule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BatchSummary {
  id: string;
  name: string;
  startDate: string;
  currentLive: number;
  status: string;
}

export default function TodaysMedicationWidget() {
  const router = useRouter();
  const { data: batchesData, isLoading } = useBatches();

  const batches = useMemo(() => {
    const raw = Array.isArray(batchesData)
      ? batchesData
      : (batchesData as any)?.batches ?? [];
    return raw.filter((b: BatchSummary) => b.status !== 'CLOSED');
  }, [batchesData]);

  const batchDays = useMemo(() => {
    return batches
      .map((b: BatchSummary) => ({
        ...b,
        ageInDays: getBatchAgeInDays(b.startDate),
      }))
      .filter((b: any) => b.ageInDays > 0);
  }, [batches]);

  const relevantBatch = useMemo(() => {
    if (batchDays.length === 0) return null;
    return batchDays.sort((a: any, b: any) => a.ageInDays - b.ageInDays)[0];
  }, [batchDays]);

  const currentPhase = useMemo(() => {
    if (!relevantBatch) return null;
    return getPhaseForDay(relevantBatch.ageInDays);
  }, [relevantBatch]);

  const upcoming = useMemo(() => {
    if (!relevantBatch) return [];
    return getUpcomingPhases(relevantBatch.ageInDays, 2);
  }, [relevantBatch]);

  if (isLoading) {
    return (
      <Card className="animate-pulse border-gray-200 dark:border-slate-700">
        <CardHeader><CardTitle>Today&apos;s Medication</CardTitle></CardHeader>
        <CardContent>
          <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!relevantBatch || !currentPhase) {
    return null;
  }

  return (
    <Card className="border-green-200 dark:border-green-800 shadow-sm transition-colors duration-300">
      <CardHeader className="bg-green-50/50 dark:bg-green-900/10 border-b border-green-100 dark:border-green-900/50 pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-green-800 dark:text-green-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 5h3M6 20h12"/><path d="M12 3v16"/><path d="M8 8h8l-1 12H9L8 8Z"/></svg>
          Today&apos;s Medication
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <button
          onClick={() => router.push(`/batches/${relevantBatch.id}`)}
          className="w-full text-left group"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                {relevantBatch.name}
              </span>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Day {relevantBatch.ageInDays} — {relevantBatch.currentLive} birds
              </p>
            </div>
            <span className="text-xs text-gray-400 dark:text-slate-500 group-hover:text-gray-600 transition-colors">
              View →
            </span>
          </div>

          <div className={`rounded-lg border px-3 py-2 font-semibold text-sm ${CATEGORY_COLORS[currentPhase.category]}`}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider">Today:</span>
              <span>{currentPhase.label}</span>
            </div>
            {currentPhase.note && (
              <p className="text-xs font-normal mt-1 opacity-80">{currentPhase.note}</p>
            )}
          </div>

          {upcoming.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {upcoming.map(p => (
                <span
                  key={`${p.fromDay}-${p.toDay}`}
                  className={`text-xs rounded-full px-2 py-0.5 border ${CATEGORY_COLORS[p.category]}`}
                >
                  Day {p.fromDay}–{p.toDay}: {p.label.split(' (')[0]}
                </span>
              ))}
            </div>
          )}
        </button>
      </CardContent>
    </Card>
  );
}