'use client';

import type { WeeklyProjection } from '../utils/aviagenData';

interface BatchCalculatorTableProps {
  projections: WeeklyProjection[];
  showActualInput: boolean;
  onActualFeedChange: (weekIndex: number, kg: number | null) => void;
}

export function BatchCalculatorTable({
  projections,
  showActualInput,
  onActualFeedChange,
}: BatchCalculatorTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200 dark:border-slate-600">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-700 p-2 text-sm">Week</th>
            <th className="border border-gray-700 p-2 text-sm">Age (Days)</th>
            <th className="border border-gray-700 p-2 text-sm">Avg Weight (kg)</th>
            <th className="border border-gray-700 p-2 text-sm">Daily Intake (g)</th>
            <th className="border border-gray-700 p-2 text-sm">Weekly Feed (g/bird)</th>
            <th className="border border-gray-700 p-2 text-sm">Cumulative Feed (g/bird)</th>
            <th className="border border-gray-700 p-2 text-sm">Live Birds</th>
            <th className="border border-gray-700 p-2 text-sm">Total Weekly Feed (kg)</th>
            <th className="border border-gray-700 p-2 text-sm">Total Cumulative Feed (kg)</th>
            <th className="border border-gray-700 p-2 text-sm">Bag. (25kg)</th>
            <th className="border border-gray-700 p-2 text-sm">Weight Gain (kg)</th>
            {showActualInput && (
              <th className="border border-gray-700 p-2 text-sm">Actual Feed (kg)</th>
            )}
            {showActualInput && (
              <th className="border border-gray-700 p-2 text-sm">FCR</th>
            )}
            {showActualInput && (
              <th className="border border-gray-700 p-2 text-sm">Cum. FCR</th>
            )}
          </tr>
        </thead>
        <tbody>
          {projections.map((p) => (
            <tr
              key={p.week}
              className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center font-semibold">
                {p.week}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {p.ageDays}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {p.avgWeightKg.toFixed(3)}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {(p.weeklyFeedG / 7).toFixed(0)}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {p.weeklyFeedG.toLocaleString()}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {p.cumulativeFeedG.toLocaleString()}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {p.liveBirds.toLocaleString()}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center font-medium">
                {p.totalWeeklyFeedKg.toFixed(1)}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {p.totalCumulativeFeedKg.toFixed(1)}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {(p.totalCumulativeFeedKg / 25).toFixed(1)}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {p.totalWeightGainKg.toFixed(1)}
              </td>
              {showActualInput && (
                <td className="border border-gray-200 dark:border-slate-600 p-2">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={p.feedConsumedActualKg ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onActualFeedChange(
                        p.week - 1,
                        val === '' ? null : parseFloat(val)
                      );
                    }}
                    placeholder="kg"
                    className="w-24 px-2 py-1 border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
              )}
              {showActualInput && (
                <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                  {p.fcr !== null ? (
                    <span className={`font-medium ${p.fcr > 2.0 ? 'text-red-600' : 'text-green-600'}`}>
                      {p.fcr.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              )}
              {showActualInput && (
                <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                  {p.cumulativeFcr !== null ? (
                    <span className="font-medium text-blue-600">
                      {p.cumulativeFcr.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {projections.length > 0 && (
          <tfoot>
            <tr className="bg-gray-100 dark:bg-slate-700 font-semibold">
              <td colSpan={7} className="border border-gray-200 dark:border-slate-600 p-2 text-right">
                Totals (6 Weeks)
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {projections.reduce((s, p) => s + p.totalWeeklyFeedKg, 0).toFixed(1)}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {projections[projections.length - 1].totalCumulativeFeedKg.toFixed(1)}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {(projections[projections.length - 1].totalCumulativeFeedKg / 25).toFixed(1)}
              </td>
              <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                {projections[projections.length - 1].cumulativeWeightGainKg.toFixed(1)}
              </td>
              {showActualInput && <td colSpan={2} className="border border-gray-200 dark:border-slate-600 p-2"></td>}
              {showActualInput && (
                <td className="border border-gray-200 dark:border-slate-600 p-2 text-center">
                  {projections[projections.length - 1].cumulativeFcr !== null
                    ? projections[projections.length - 1].cumulativeFcr!.toFixed(2)
                    : <span className="text-gray-400">—</span>}
                </td>
              )}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}