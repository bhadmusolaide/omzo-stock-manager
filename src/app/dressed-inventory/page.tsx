'use client';

import { useState, useEffect, useCallback } from 'react'; // Add useCallback import
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Table from '@/components/ui/Table';
import Loading from '@/components/ui/Loading';
import { formatCurrency } from '@/utils/currency';
import { useSettings } from '@/features/settings/hooks/useSettings';
import { toast } from '@/store/toast';

interface DressedInventoryItem {
  id: string;
  productType: string;
  batchId: string | null;
  batchName: string;
  availableCount: number;
  availableWeightKg: number;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
  lowStock: boolean;
}

interface AdjustInventoryForm {
  productType: string;
  batchId?: string;
  adjustmentCount?: number;
  adjustmentWeightKg?: number;
  reason?: string;
}

// Add interface for new product form
interface NewProductForm {
  productType: string;
  batchId?: string;
  initialCount?: number;
  initialWeightKg?: number;
}

export default function DressedInventoryPage() {
  const [inventory, setInventory] = useState<DressedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false); // Add state for new product modal
  const [selectedItem, setSelectedItem] = useState<DressedInventoryItem | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustInventoryForm>({ productType: '' });
  const [newProductForm, setNewProductForm] = useState<NewProductForm>({ productType: '' }); // Add state for new product form
  const { data: settings } = useSettings();
  const lowStockThreshold = settings?.lowStockThreshold || 50;

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const fetchInventory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('lowStockOnly', 'false');
      params.append('page', pagination.currentPage.toString());
      params.append('limit', pagination.itemsPerPage.toString());

      const response = await fetch(`/api/dressed_inventory?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory || data);
        setPagination(prev => ({
          ...prev,
          currentPage: data.currentPage || prev.currentPage,
          totalPages: data.totalPages || 1,
          totalItems: data.totalItems || (data.inventory?.length || data.length),
        }));
      } else {
        setError('Failed to fetch inventory');
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      const response = await fetch('/api/dressed_inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType: selectedItem.productType,
          batchId: selectedItem.batchId,
          adjustmentCount: adjustForm.adjustmentCount,
          adjustmentWeightKg: adjustForm.adjustmentWeightKg,
          reason: adjustForm.reason,
        }),
      });

      if (response.ok) {
        toast.success('Inventory adjusted successfully');
        setShowAdjustModal(false);
        setAdjustForm({ productType: '' });
        setSelectedItem(null);
        fetchInventory();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Failed to adjust inventory');
      }
    } catch (error) {
      console.error('Error adjusting inventory:', error); // Log the error
      toast.error('Failed to adjust inventory');
    }
  };

  const handleCreateNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/dressed_inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType: newProductForm.productType,
          batchId: newProductForm.batchId,
          adjustmentCount: newProductForm.initialCount,
          adjustmentWeightKg: newProductForm.initialWeightKg,
          reason: 'Initial product creation',
        }),
      });

      if (response.ok) {
        toast.success('New product type created successfully');
        setShowNewProductModal(false);
        setNewProductForm({ productType: '' });
        fetchInventory();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Failed to create new product type');
      }
    } catch (error) {
      console.error('Error creating new product type:', error); // Log the error
      toast.error('Failed to create new product type');
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]); // Now this is correct

  if (loading) return <Loading text="Loading inventory..." className="p-6" />;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  const lowStockItems = inventory.filter(item => item.lowStock);
  const hasLowStock = lowStockItems.length > 0;

  // Calculate inventory metrics
  const totalProducts = inventory.length;
  const totalWeight = inventory.reduce((sum, item) => sum + item.availableWeightKg, 0);
  const totalValue = inventory.reduce((sum, item) => sum + (item.availableCount * item.unitPrice), 0);
  const uniqueProductTypes = [...new Set(inventory.map(item => item.productType))].length;

  const columns = [
    { key: 'productType', header: 'Product Type', minWidth: '120px' },
    { key: 'batchName', header: 'Batch', minWidth: '100px' },
    { key: 'availableCount', header: 'Available Count', minWidth: '100px' },
    {
      key: 'availableWeightKg',
      header: 'Available Weight (kg)',
      minWidth: '120px',
      render: (value: number) => value?.toFixed(3)
    },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      minWidth: '100px',
      render: (value: number) => formatCurrency(value)
    },
    {
      key: 'lowStock',
      header: 'Low Stock',
      minWidth: '90px',
      render: (value: boolean) => value ? (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-900 dark:text-red-400 border border-red-200 dark:border-red-600">
          Low Stock
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-900 dark:text-green-400 border border-green-200 dark:border-green-600">
          In Stock
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: "100px",
      minWidth: "100px",
      render: (_: unknown, row: DressedInventoryItem) => ( // Fixed: specified type for _
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSelectedItem(row);
            setAdjustForm({
              productType: row.productType,
              batchId: row.batchId || undefined,
            });
            setShowAdjustModal(true);
          }}
          className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-300"
        >
          Adjust
        </Button>
      )
    },
  ];

  const lowStockColumns = [
    { key: 'productType', header: 'Product', minWidth: '120px', render: (_: unknown, row: DressedInventoryItem) => <span className="font-medium text-gray-900 dark:text-slate-100">{row.productType}</span> }, // Fixed: specified type for _
    { key: 'availableCount', header: 'Available', minWidth: '100px', render: (_: unknown, row: DressedInventoryItem) => <span className="text-red-600 dark:text-red-400 font-semibold">{row.availableCount}</span> }, // Fixed: specified type for _
    { key: 'batchName', header: 'Batch', minWidth: '100px' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 transition-colors duration-300">
       <div className="mb-8">
         <div className="flex justify-between items-start mb-2">
           <div>
             <h1 className="text-33xl font-bold text-gray-900 dark:text-slate-100">Dressed Inventory</h1>
             <p className="text-gray-600 dark:text-slate-400 mt-1">Manage processed poultry products and stock levels</p>
           </div>
           <div className="flex gap-2">
             <Button onClick={() => setShowNewProductModal(true)}>Create New Product Type</Button>
             {hasLowStock && (
               <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-lg flex items-center gap-2 transition-colors duration-300">
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                 </svg>
                 {lowStockItems.length} low stock items
               </div>
             )}
           </div>
         </div>

         {/* Summary Cards */}
         {inventory.length > 0 && (
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Products</div>
               <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalProducts}</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Weight</div>
               <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalWeight.toFixed(1)} kg</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Value</div>
               <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(totalValue)}</div>
             </div>
             <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none transition-colors duration-300">
               <div className="text-sm font-medium text-gray-600 dark:text-slate-400">Product Types</div>
               <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{uniqueProductTypes}</div>
             </div>
           </div>
         )}
       </div>

       <div className="bg-white dark:bg-slate-700 shadow-lg dark:shadow-slate-900/50 rounded-lg overflow-hidden transition-colors duration-300">
         <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
           <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Available Stock</h2>
           <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Current inventory levels and product details</p>
         </div>
         <div className="p-6">
           <Table
             columns={columns}
             data={inventory}
             pagination={{
               currentPage: pagination.currentPage,
               totalPages: pagination.totalPages,
               totalItems: pagination.totalItems,
               itemsPerPage: pagination.itemsPerPage,
               onPageChange: handlePageChange,
             }}
           />
         </div>
       </div>

      {/* Low Stock Warnings */}
      {hasLowStock && (
        <div className="bg-white dark:bg-slate-700 shadow-lg dark:shadow-slate-900/50 rounded-lg overflow-hidden mt-6 transition-colors duration-300">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Low Stock Warnings</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Items below {lowStockThreshold} units requiring attention</p>
          </div>
          <div className="p-6">
            <Table columns={lowStockColumns} data={lowStockItems} />
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/60 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-white dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-slate-100">Create New Product Type</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleCreateNewProduct} className="space-y-4">
                <Input
                  label="Product Type Name"
                  value={newProductForm.productType || ''}
                  onChange={(e) => setNewProductForm({ ...newProductForm, productType: e.target.value })}
                  placeholder="e.g., breast-fillets, wings, etc."
                  required
                />
                <Input
                  label="Initial Count (optional)"
                  type="number"
                  value={newProductForm.initialCount || ''}
                  onChange={(e) => setNewProductForm({ ...newProductForm, initialCount: parseInt(e.target.value) || undefined })}
                />
                <Input
                  label="Initial Weight (kg) (optional)"
                  type="number"
                  step="0.001"
                  value={newProductForm.initialWeightKg || ''}
                  onChange={(e) => setNewProductForm({ ...newProductForm, initialWeightKg: parseFloat(e.target.value) || undefined })}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowNewProductModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Product Type</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/60 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-white dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-slate-100">Adjust {selectedItem.productType}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAdjust} className="space-y-4">
                <Input
                  label="Adjustment Count (positive to add, negative to remove)"
                  type="number"
                  value={adjustForm.adjustmentCount || ''}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentCount: parseInt(e.target.value) || undefined })}
                />
                <Input
                  label="Adjustment Weight (kg)"
                  type="number"
                  step="0.001"
                  value={adjustForm.adjustmentWeightKg || ''}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentWeightKg: parseFloat(e.target.value) || undefined })}
                />
                <Input
                  label="Reason"
                  value={adjustForm.reason || ''}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="e.g., spoilage, recount"
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowAdjustModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Adjust Inventory</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
