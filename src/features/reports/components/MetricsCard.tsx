'use client';

interface MetricsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export function MetricsCard({ label, value, icon, trend }: MetricsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-700 rounded-lg shadow-sm dark:shadow p-6 border border-gray-200 dark:border-slate-600 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-2">{value}</p>
        </div>
        {icon && <div className="text-3xl text-blue-500 dark:text-blue-400">{icon}</div>}
      </div>
      {trend && (
        <div className={`mt-2 text-sm font-medium ${
          trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-slate-400'
        }`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trend}
        </div>
      )}
    </div>
  );
}

