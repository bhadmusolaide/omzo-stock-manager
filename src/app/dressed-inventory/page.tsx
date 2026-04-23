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
import ProcessingHistoryModal from "@/features/batches/components/ProcessingHistoryModal";

interface DressedInventoryItem {
  id: string;
  productType: string;
  batchId: string | null;
  batchName: string;
  batchStatus: string;
  processedCount?: number;
  processedWeightKg?: number;
  availableCount: number;
  availableWeightKg: number;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
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
  const [showClosedBatches, setShowClosedBatches] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [batchSummaries, setBatchSummaries] = useState<Record<string, any>>({});

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const fetchInventory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '1000'); // Fetch all to group by batch properly

      const response = await fetch(`/api/dressed_inventory?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory || data);
        setBatchSummaries(data.batchSummaries || {});
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

  // Filter inventory
  const filteredInventory = inventory.filter(item => {
    if (!showClosedBatches && item.batchStatus === 'CLOSED') return false;
    return true;
  });

  // Calculate inventory metrics
  const totalProducts = filteredInventory.length;
  const totalWeight = filteredInventory.reduce((sum, item) => sum + item.availableWeightKg, 0);
  const totalValue = filteredInventory.reduce((sum, item) => sum + ((item.availableWeightKg && item.availableWeightKg > 0) ? (item.availableWeightKg * item.unitPrice) : (item.availableCount * item.unitPrice)), 0);
  const uniqueProductTypes = [...new Set(filteredInventory.map(item => item.productType))].length;

  // Group inventory by batchName
  const groupedInventory = filteredInventory.reduce((acc, item) => {
    const batchName = item.batchName || 'Unassigned';
    if (!acc[batchName]) acc[batchName] = [];
    acc[batchName].push(item);
    return acc;
  }, {} as Record<string, DressedInventoryItem[]>);

  const batchNames = Object.keys(groupedInventory).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;

    const maxDateA = Math.max(...groupedInventory[a].map(item => new Date(item.createdAt).getTime()));
    const maxDateB = Math.max(...groupedInventory[b].map(item => new Date(item.createdAt).getTime()));

    return maxDateB - maxDateA;
  });

  const columns = [
    { key: 'productType', header: 'Product Type', minWidth: '120px' },
    { key: 'batchName', header: 'Batch', minWidth: '100px' },
    { key: 'processedCount', header: 'Processed Count', minWidth: '100px' },
    {
      key: 'processedWeightKg',
      header: 'Processed Weight (kg)',
      minWidth: '120px',
      render: (value: number) => value?.toFixed(3) || '0.000'
    },
    { key: 'availableCount', header: 'Available Count', minWidth: '100px' },
    {
      key: 'availableWeightKg',
      header: 'Available Weight (kg)',
      minWidth: '120px',
      render: (value: number) => value?.toFixed(3)
    },
    {
      key: 'unitPrice',
      header: 'Unit Cost',
      minWidth: '100px',
      render: (value: number) => formatCurrency(value)
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

  return (
    <div className="max-w-7xl mx-auto p-6 transition-colors duration-300">
       <div className="mb-8">
         <div className="flex justify-between items-start mb-2">
           <div>
             <h1 className="text-33xl font-bold text-gray-900 dark:text-slate-100">Dressed Inventory</h1>
             <p className="text-gray-600 dark:text-slate-400 mt-1">Manage processed poultry products and stock levels</p>
           </div>
           <div className="flex gap-2">
             <Button
               variant="outline"
               onClick={() => setIsHistoryModalOpen(true)}
               className="flex items-center gap-2"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               Processing History
             </Button>
             <Button
               variant="outline"
               onClick={() => setShowClosedBatches(!showClosedBatches)}
             >
               {showClosedBatches ? 'Hide Closed Batches' : 'Show Closed Batches'}
             </Button>
             <Button onClick={() => setShowNewProductModal(true)}>Create New Product Type</Button>
           </div>
         </div>

         {/* Summary Cards */}
         {filteredInventory.length > 0 && (
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

      <div className="space-y-6">
        {batchNames.map(batchName => {
          const items = groupedInventory[batchName];
          const batchId = items[0]?.batchId;
          const summary = batchId ? batchSummaries[batchId] : null;
          const batchValue = items.reduce((sum, item) => sum + ((item.availableWeightKg && item.availableWeightKg > 0) ? (item.availableWeightKg * item.unitPrice) : (item.availableCount * item.unitPrice)), 0);

          return (
          <div key={batchName} className="bg-white dark:bg-slate-700 shadow-lg dark:shadow-slate-900/50 rounded-lg overflow-hidden transition-colors duration-300">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {batchName}
                  {summary?.status === 'CLOSED' && (
                    <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-gray-300">CLOSED</span>
                  )}
                </h2>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  Processed inventory for this batch
                </p>
              </div>

              {summary && summary.dressingPercentage > 0 && (
                <div className="flex gap-4 text-sm">
                  <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded border border-gray-200 dark:border-slate-600 shadow-sm flex flex-col items-end">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Yield / Dressing %</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{summary.dressingPercentage}%</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded border border-gray-200 dark:border-slate-600 shadow-sm flex flex-col items-end">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Est. Retail Value</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(batchValue)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6">
              <Table
                columns={columns.filter(c => c.key !== 'batchName')}
                data={items}
              />
            </div>
          </div>
        )})}

        {batchNames.length === 0 && (
          <div className="bg-white dark:bg-slate-700 shadow-lg dark:shadow-slate-900/50 rounded-lg overflow-hidden transition-colors duration-300">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Available Stock</h2>
            </div>
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No inventory found.
            </div>
          </div>
        )}
      </div>

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

      <ProcessingHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
}
