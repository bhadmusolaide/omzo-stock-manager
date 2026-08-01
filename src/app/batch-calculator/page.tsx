'use client';

import { BatchCalculator } from '@/features/calculator/components/BatchCalculator';

export default function BatchCalculatorPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 transition-colors duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
          Batch Calculator
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mt-1">
          Plan feed consumption and weight gain projections based on Aviagen Arbor Acres 2022 standards
        </p>
      </div>
      <BatchCalculator />
    </div>
  );
}