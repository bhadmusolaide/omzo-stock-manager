'use client';

import { useState, useCallback, useMemo } from 'react';
import { computeProjections, WeeklyProjection } from '../utils/aviagenData';

export interface CalculatorState {
  birdCount: number;
  mortalityRate: number;
  actualFeedByWeek: (number | null)[];
}

export function useBatchCalculator(initialBirdCount?: number, initialMortalityRate?: number) {
  const [state, setState] = useState<CalculatorState>({
    birdCount: initialBirdCount ?? 1000,
    mortalityRate: initialMortalityRate ?? 5,
    actualFeedByWeek: Array(6).fill(null),
  });

  const setBirdCount = useCallback((birdCount: number) => {
    setState(prev => ({
      ...prev,
      birdCount: Math.max(1, birdCount),
      actualFeedByWeek: Array(6).fill(null),
    }));
  }, []);

  const setMortalityRate = useCallback((mortalityRate: number) => {
    setState(prev => ({
      ...prev,
      mortalityRate: Math.max(0, Math.min(100, mortalityRate)),
    }));
  }, []);

  const setActualFeed = useCallback((weekIndex: number, kg: number | null) => {
    setState(prev => {
      const updated = [...prev.actualFeedByWeek];
      updated[weekIndex] = kg;
      return { ...prev, actualFeedByWeek: updated };
    });
  }, []);

  const resetActualFeed = useCallback(() => {
    setState(prev => ({ ...prev, actualFeedByWeek: Array(6).fill(null) }));
  }, []);

  const projections: WeeklyProjection[] = useMemo(
    () => computeProjections(state.birdCount, state.mortalityRate, state.actualFeedByWeek),
    [state.birdCount, state.mortalityRate, state.actualFeedByWeek]
  );

  const totals = useMemo(() => {
    const last = projections[projections.length - 1];
    if (!last) return null;
    const totalFeedProjected = projections.reduce((s, p) => s + p.totalWeeklyFeedKg, 0);
    const totalActual = state.actualFeedByWeek.filter((v): v is number => v !== null).reduce((s, v) => s + v, 0);
    return {
      totalFeedProjected,
      totalActual,
      finalWeight: last.avgWeightKg,
      finalLiveBirds: last.liveBirds,
      totalCumulativeFeed: last.totalCumulativeFeedKg,
      finalCumulativeFcr: last.cumulativeFcr,
    };
  }, [projections, state.actualFeedByWeek]);

  const hasActualData = state.actualFeedByWeek.some(v => v !== null);

  return {
    state,
    projections,
    totals,
    hasActualData,
    setBirdCount,
    setMortalityRate,
    setActualFeed,
    resetActualFeed,
  };
}