'use client';

import { useState } from 'react';
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Loading from "@/components/ui/Loading";
import AddTransactionModal from "@/features/transactions/components/AddTransactionModal";
import { formatCurrency } from "@/utils/currency";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { useUiStore } from "@/store/ui";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  category: 'DOC' | 'FEED' | 'ORDER' | 'EXPENSE' | 'OTHER';
  linkedBatchId?: string;
  linkedOrderId?: string;
  batch?: {
    id: string;
    name: string;
  };
  order?: {
    id: string;
    customerName: string;
  };
}



export default function Transactions() {
  const { addTransactionOpen, setAddTransactionOpen } = useUiStore();
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  const { data: transactions, isLoading, error } = useTransactions(filters);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddSuccess = () => {
    setAddTransactionOpen(false);
  };


  const columns = [
    {
      key: "id",
      header: "ID",
      width: "100px",
      minWidth: "80px",
      maxWidth: "120px",
      truncate: true,
      render: (value: string) => (
        <span className="font-mono text-xs" title={value}>
          {value.substring(0, 8)}...
        </span>
      )
    },
    { key: "date", header: "Date", minWidth: "100px", render: (value: string) => new Date(value).toLocaleDateString() },
    { key: "description", header: "Description", minWidth: "150px" },
    {
      key: "type",
      header: "Type",
      minWidth: "80px",
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'CREDIT'
            ? 'bg-green-100 dark:bg-green-900/20 text-green-900 dark:text-green-400 border border-green-200 dark:border-green-600'
            : 'bg-red-100 dark:bg-red-900/20 text-red-900 dark:text-red-400 border border-red-200 dark:border-red-600'
        }`}>
          {value}
        </span>
      )
    },
    { key: "category", header: "Category", minWidth: "100px" },
    { key: "amount", header: "Amount", minWidth: "100px", render: (value: number) => formatCurrency(value) },
    { key: "batch.name", header: "Batch", minWidth: "120px" },
    { key: "order.customerName", header: "Order", minWidth: "120px" },
  ];
  const totalIncome = transactions?.filter((t: Transaction) => t.type === 'CREDIT').reduce((sum: number, t: Transaction) => sum + t.amount, 0) || 0;
  const totalExpenses = transactions?.filter((t: Transaction) => t.type === 'DEBIT').reduce((sum: number, t: Transaction) => sum + t.amount, 0) || 0;
  const netProfit = totalIncome - totalExpenses;

  if (isLoading) {
    return <Loading text="Loading transactions..." className="p-6" />;
  }

  if (error) {
    return <div className="p-6">Error loading transactions</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 transition-colors duration-300">
       <div className="mb-8">
         <div className="flex justify-between items-start mb-2">
           <div>
             <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Transactions</h1>
             <p className="text-gray-600 dark:text-slate-400 mt-1">Financial transactions and payment records</p>
           </div>
           <div className="flex gap-3">
             <Button onClick={() => setAddTransactionOpen(true)} className="flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
               </svg>
               Add Transaction
             </Button>
           </div>
         </div>

         {/* Summary Cards */}
         {transactions && transactions.length > 0 && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Income</div>
               <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Expenses</div>
               <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalExpenses)}</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Net Profit</div>
               <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                 {formatCurrency(netProfit)}
               </div>
             </div>
           </div>
         )}
       </div>

       {/* Filters */}
       <div className="bg-white dark:bg-slate-700 shadow rounded-lg overflow-hidden mb-6 transition-colors duration-300">
         <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
           <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Filters</h2>
           <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Filter transactions by type, category, or date range</p>
         </div>
         <div className="p-6">
           <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input
            label="Search"
            placeholder="Search description"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
            >
              <option value="">All Types</option>
              <option value="CREDIT">Credit</option>
              <option value="DEBIT">Debit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
            >
              <option value="">All Categories</option>
              <option value="DOC">DOC</option>
              <option value="FEED">Feed</option>
              <option value="ORDER">Order</option>
              <option value="EXPENSE">Expense</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <Input
            label="Start Date"
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
         </div>
       </div>
     </div>


       <div className="bg-white dark:bg-slate-700 shadow-lg dark:shadow-slate-900/50 rounded-lg overflow-hidden transition-colors duration-300">
         <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
           <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">All Transactions</h2>
           <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Financial transactions and records</p>
         </div>
         <div className="p-6">
           <Table columns={columns} data={transactions || []} />
         </div>
       </div>
      <AddTransactionModal
        isOpen={addTransactionOpen}
        onClose={() => setAddTransactionOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}

