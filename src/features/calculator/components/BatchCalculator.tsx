'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BatchCalculatorForm } from './BatchCalculatorForm';
import { BatchCalculatorTable } from './BatchCalculatorTable';
import { useBatchCalculator } from '../hooks/useBatchCalculator';
import { RefreshCw, Calculator } from 'lucide-react';
import Button from '@/components/ui/Button';

interface BatchCalculatorProps {
  initialBirdCount?: number;
  initialMortalityRate?: number;
  showActualInput?: boolean;
}

export function BatchCalculator({
  initialBirdCount,
  initialMortalityRate,
  showActualInput = true,
}: BatchCalculatorProps) {
  const {
    state,
    projections,
    totals,
    hasActualData,
    setBirdCount,
    setMortalityRate,
    setActualFeed,
    resetActualFeed,
  } = useBatchCalculator(initialBirdCount, initialMortalityRate);

  const isLocked = initialBirdCount !== undefined;
  const birdCount = initialBirdCount ?? state.birdCount;
  const mortalityRate = initialMortalityRate ?? state.mortalityRate;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            Batch Calculator
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Estimates based on Aviagen Arbor Acres 2022 Broiler Performance Objectives
          </p>
        </CardHeader>
        <CardContent>
          <BatchCalculatorForm
            birdCount={birdCount}
            mortalityRate={mortalityRate}
            onBirdCountChange={isLocked ? () => {} : setBirdCount}
            onMortalityRateChange={isLocked ? () => {} : setMortalityRate}
          />
          {isLocked && (
            <p className="text-xs text-gray-500 mt-2">
              Values are locked to match this batch. Use the dedicated Calculator page for custom scenarios.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Weekly Projections</CardTitle>
            {showActualInput && hasActualData && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetActualFeed}
                className="flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Actuals
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <BatchCalculatorTable
            projections={projections}
            showActualInput={showActualInput}
            onActualFeedChange={setActualFeed}
          />
        </CardContent>
      </Card>

      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm">
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Est. Total Feed</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totals.totalFeedProjected.toFixed(1)} kg
            </p>
            <p className="text-xs text-gray-500">({(totals.totalFeedProjected / 25).toFixed(1)} bags)</p>
          </div>
          <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm">
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Est. Final Weight</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {totals.finalWeight.toFixed(3)} kg
            </p>
            <p className="text-xs text-gray-500">per bird @ {totals.finalLiveBirds} live birds</p>
          </div>
          <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm">
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Est. FCR</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {totals.finalCumulativeFcr
                ? totals.finalCumulativeFcr.toFixed(2)
                : (totals.totalFeedProjected / (totals.finalWeight * totals.finalLiveBirds)).toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm">
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Live Weight</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {(totals.finalWeight * totals.finalLiveBirds).toFixed(1)} kg
            </p>
          </div>
        </div>
      )}

      {hasActualData && totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Actual Feed Consumed</p>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{totals.totalActual.toFixed(1)} kg</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              vs {totals.totalFeedProjected.toFixed(1)} kg projected
              ({((totals.totalActual - totals.totalFeedProjected) / totals.totalFeedProjected * 100).toFixed(1)}% diff)
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Final Cumulative FCR</p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">
              {totals.finalCumulativeFcr !== null ? totals.finalCumulativeFcr!.toFixed(2) : '—'}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              (Feed / Weight Gain)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}