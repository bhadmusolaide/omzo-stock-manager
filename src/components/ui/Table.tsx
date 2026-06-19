import React, { useState, useRef, useEffect, useCallback } from 'react';

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
  configurable?: boolean;
  tableId?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
  };
}

interface ColumnConfig {
  key: string;
  visible: boolean;
}

function getConfigStorageKey(tableId: string) {
  return `table-col-config-${tableId}`;
}

function loadColumnConfig(tableId: string): ColumnConfig[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(getConfigStorageKey(tableId));
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveColumnConfig(tableId: string, config: ColumnConfig[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getConfigStorageKey(tableId), JSON.stringify(config));
  } catch {}
}

const Table: React.FC<TableProps> = ({ columns, data, className = '', configurable = false, tableId, pagination }) => {
  const [columnOrder, setColumnOrder] = useState<string[]>(() => columns.map(c => c.key));
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    columns.forEach(c => { init[c.key] = true; });
    return init;
  });
  const [showConfig, setShowConfig] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const configRef = useRef<HTMLDivElement>(null);
  const configLoaded = useRef(false);

  const allColKeys = columns.map(c => c.key);

  useEffect(() => {
    if (!configurable || !tableId || configLoaded.current) return;
    configLoaded.current = true;
    const saved = loadColumnConfig(tableId);
    if (saved && saved.length > 0) {
      const visMap: Record<string, boolean> = {};
      const orderKeys: string[] = [];
      const savedKeys = new Set(saved.map(c => c.key));
      saved.forEach(c => {
        visMap[c.key] = c.visible;
        orderKeys.push(c.key);
      });
      allColKeys.forEach(k => {
        if (!savedKeys.has(k)) {
          orderKeys.push(k);
          visMap[k] = true;
        }
      });
      setColumnOrder(orderKeys);
      setColumnVisibility(visMap);
    }
  }, [configurable, tableId]);

  useEffect(() => {
    if (!configurable || !tableId) return;
    const config: ColumnConfig[] = columnOrder.map(k => ({
      key: k,
      visible: columnVisibility[k] !== false,
    }));
    saveColumnConfig(tableId, config);
  }, [columnOrder, columnVisibility, configurable, tableId]);

  useEffect(() => {
    if (!showConfig) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (configRef.current && !configRef.current.contains(e.target as Node)) {
        setShowConfig(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showConfig]);

  const orderedColumns = columnOrder
    .map(key => columns.find(c => c.key === key))
    .filter(Boolean) as Column[];

  const dataCols = orderedColumns.filter(col => col.key !== 'actions' && columnVisibility[col.key] !== false);
  const actionsCol = columns.find(col => col.key === 'actions');
  const showActions = actionsCol && columnVisibility['actions'] !== false;

  const getValue = (obj: any, path: string) => {
    if (!path) return undefined;
    return path.split('.').reduce((acc: any, key: string) => (acc == null ? undefined : acc[key]), obj);
  };

  const truncateText = (text: string, maxLength: number = 20) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null) return;
    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, moved);
    setColumnOrder(newOrder);
    setDragIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const toggleColumn = (key: string) => {
    setColumnVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetConfig = () => {
    const defaultOrder = columns.map(c => c.key);
    const defaultVis: Record<string, boolean> = {};
    columns.forEach(c => { defaultVis[c.key] = true; });
    setColumnOrder(defaultOrder);
    setColumnVisibility(defaultVis);
  };

  const configurableCols = orderedColumns.filter(c => c.key !== 'actions');

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 transition-colors duration-300 relative">
      {configurable && (
        <div className="absolute top-2 right-2 z-20" ref={configRef}>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-1.5 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
            title="Configure columns"
          >
            <svg className="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {showConfig && (
            <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Columns</span>
                <button
                  onClick={resetConfig}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Reset
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto p-1">
                {configurableCols.map((col, index) => (
                  <div
                    key={col.key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-grab active:cursor-grabbing hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                      dragIndex === index ? 'opacity-50 bg-gray-100 dark:bg-slate-600' : ''
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm8-16a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={columnVisibility[col.key] !== false}
                        onChange={() => toggleColumn(col.key)}
                        className="w-3.5 h-3.5 rounded border-gray-300 dark:border-slate-500 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-slate-300 truncate">{col.header}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <table className={`min-w-full divide-y divide-gray-200 dark:divide-slate-700 ${className}`}>
        <thead className="bg-gray-50 dark:bg-slate-800">
          <tr>
            {dataCols.map((col) => (
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
              <td colSpan={dataCols.length + (showActions ? 1 : 0)} className="px-6 py-12 text-center">
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
              <tr key={index} className="group relative hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-150">
                {dataCols.map((col, colIndex) => {
                  const value = getValue(row, col.key);
                  const cellContent = col.render ? col.render(value, row) : (value as any)?.toString?.() ?? '';
                  const displayText = typeof cellContent === 'string' && col.truncate
                    ? truncateText(cellContent, 20)
                    : cellContent;

                  const isLast = colIndex === dataCols.length - 1;

                  return (
                    <td
                      key={col.key}
                      className={`px-6 py-4 text-sm text-gray-900 dark:text-slate-200 ${
                        col.truncate ? 'max-w-0' : 'whitespace-nowrap'
                      }`}
                      style={{
                        width: col.width,
                        minWidth: col.minWidth || '120px',
                        maxWidth: col.maxWidth,
                      }}
                      title={typeof cellContent === 'string' && col.truncate ? cellContent : undefined}
                    >
                      {displayText}
                      {isLast && showActions && actionsCol && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border border-gray-200 dark:border-slate-600 flex items-center gap-2 z-10 pointer-events-none group-hover:pointer-events-auto">
                          {actionsCol.render ? actionsCol.render(getValue(row, actionsCol.key), row) : null}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white dark:bg-slate-700 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-slate-600 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
              disabled={pagination.currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
              disabled={pagination.currentPage === pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-slate-300">
                Showing{' '}
                <span className="font-medium">
                  {Math.min((pagination.currentPage - 1) * pagination.itemsPerPage + 1, pagination.totalItems)}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.totalItems}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
                  disabled={pagination.currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>

                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
                  if (pageNum > pagination.totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => pagination.onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === pagination.currentPage
                          ? 'z-10 bg-green-50 dark:bg-green-900/20 border-green-500 text-green-600 dark:text-green-400'
                          : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
