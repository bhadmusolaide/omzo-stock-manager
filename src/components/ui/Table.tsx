import React from 'react';

interface Column {
  key: string;
  header: string;
  render?: (value: any, row: any) => React.ReactNode;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  truncate?: boolean;
}

interface TableProps {
  columns: Column[];
  data: any[];
  className?: string;
}

const Table: React.FC<TableProps> = ({ columns, data, className = '' }) => {
  const getValue = (obj: any, path: string) => {
    if (!path) return undefined;
    return path.split('.').reduce((acc: any, key: string) => (acc == null ? undefined : acc[key]), obj);
  };

  // Truncate text with ellipsis
  const truncateText = (text: string, maxLength: number = 20) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 transition-colors duration-300">
      <table className={`min-w-full divide-y divide-gray-200 dark:divide-slate-700 ${className}`}>
        <thead className="bg-gray-50 dark:bg-slate-800">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-slate-200 uppercase tracking-wider border-b border-gray-200 dark:border-slate-700"
                style={{
                  width: col.width,
                  minWidth: col.minWidth || '120px',
                  maxWidth: col.maxWidth,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-700 divide-y divide-gray-100 dark:divide-slate-600">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                <div className="text-gray-600 dark:text-slate-400">
                  <svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium">No data available</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-150">
                {columns.map((col) => {
                  const value = getValue(row, col.key);
                  const cellContent = col.render ? col.render(value, row) : (value as any)?.toString?.() ?? '';
                  const displayText = typeof cellContent === 'string' && col.truncate
                    ? truncateText(cellContent, 20)
                    : cellContent;

                  return (
                    <td
                      key={col.key}
                      className={`px-6 py-4 text-sm text-gray-900 dark:text-slate-200 ${
                        col.truncate ? 'max-w-0' : 'whitespace-nowrap'
                      } ${col.key === 'actions' ? 'space-y-1' : ''}`}
                      style={{
                        width: col.width,
                        minWidth: col.minWidth || '120px',
                        maxWidth: col.maxWidth,
                      }}
                      title={typeof cellContent === 'string' && col.truncate ? cellContent : undefined}
                    >
                      {displayText}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;