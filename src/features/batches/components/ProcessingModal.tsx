'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currency';
import { allocateCostsToProcessing, calculateDressingPercentage, calculateAvgDressedWeightPerBird, calculateCostPerDressedKg, AllocationMode } from '@/utils/calculations';

const processingSchema = z.object({
  liveBirdsProcessed: z.number().int().min(1, 'Live birds processed must be at least 1'),
  avgLiveWeightKg: z.number().min(0.001, 'Average live weight must be greater than 0').optional(),
  yieldMap: z.array(z.object({
    productType: z.string().min(1, 'Product type is required'),
    unitCount: z.number().int().min(0, 'Unit count must be non-negative'),
    totalWeightKg: z.number().min(0, 'Total weight must be non-negative'),
  })).min(1, 'At least one product output required'),
  notes: z.string().optional(),
});

type ProcessingFormData = z.infer<typeof processingSchema>;

interface ProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchId: string;
  currentLive: number;
  allocationMode: AllocationMode;
  totalBatchCost: number;
  survivingBirds: number;
  lastAvgWeightKg?: number;
}

const DRESSING_PRESETS = {
  whole: { percentage: 0.70, productType: 'whole' },
  quarter: { percentage: 0.20, productType: 'quarter' },
  combo: { percentage: 0.10, productType: 'dogfood_combo' },
  // Add more as needed
};

export default function ProcessingModal({
  isOpen,
  onClose,
  onSuccess,
  batchId,
  currentLive,
  allocationMode,
  totalBatchCost,
  survivingBirds,
  lastAvgWeightKg = 0,
}: ProcessingModalProps) {
  const [preview, setPreview] = useState<any>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProcessingFormData>({
    resolver: zodResolver(processingSchema),
    defaultValues: {
      liveBirdsProcessed: 1,
      avgLiveWeightKg: lastAvgWeightKg,
      yieldMap: [{ productType: 'whole', unitCount: 1, totalWeightKg: 1.5 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'yieldMap',
  });

  const watchedLiveBirds = watch('liveBirdsProcessed');
  const watchedAvgLiveWeight = watch('avgLiveWeightKg') || lastAvgWeightKg;
  const watchedYieldMap = watch('yieldMap') || [];

  const totalLiveWeightForProcessing = watchedLiveBirds * watchedAvgLiveWeight;
  const totalDressedWeightKg = watchedYieldMap.reduce((sum, item) => sum + item.totalWeightKg, 0);

  useEffect(() => {
    // Auto-suggest yields based on presets
    if (watchedLiveBirds > 0 && totalDressedWeightKg === 0) {
      const suggestedYield = Object.entries(DRESSING_PRESETS).map(([key, preset]) => ({
        productType: preset.productType,
        unitCount: Math.floor(watchedLiveBirds * 1), // Assume 1 unit per bird for simplicity
        totalWeightKg: watchedLiveBirds * watchedAvgLiveWeight * preset.percentage,
      }));
      setValue('yieldMap', suggestedYield);
    }

    // Calculate preview
    const allocation = allocateCostsToProcessing(totalBatchCost, allocationMode, survivingBirds, 0); // totalLiveWeightKgForBatch not available here
    let allocatedCost = 0;
    if (allocationMode === 'per_bird') {
      const costPerBird = allocation.costPerBird || 0;
      allocatedCost = costPerBird * watchedLiveBirds;
    } else {
      const costPerKg = allocation.costPerKg || 0;
      allocatedCost = costPerKg * totalLiveWeightForProcessing;
    }
    const dressingPct = calculateDressingPercentage(totalDressedWeightKg, totalLiveWeightForProcessing);
    const avgDressedPerBird = calculateAvgDressedWeightPerBird(totalDressedWeightKg, watchedLiveBirds);
    const costPerDressedKg = calculateCostPerDressedKg(allocatedCost, totalDressedWeightKg);

    setPreview({
      allocatedCost,
      dressingPercentage: dressingPct,
      avgDressedWeightPerBird: avgDressedPerBird,
      costPerDressedKg,
      totalDressedWeightKg,
      inventoryChanges: watchedYieldMap.map(item => ({
        productType: item.productType,
        count: item.unitCount,
        weightKg: item.totalWeightKg,
        unitPrice: costPerDressedKg,
      })),
    });
  }, [watchedLiveBirds, watchedAvgLiveWeight, watchedYieldMap, allocationMode, totalBatchCost, survivingBirds, lastAvgWeightKg, setValue]);

  const onSubmit = async (data: ProcessingFormData) => {
    try {
      const response = await fetch(`/api/batches/${batchId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        // Invalidate batches query cache to refresh live counts
        queryClient.invalidateQueries({ queryKey: ['batches'] });
        onClose();
        onSuccess();
      } else {
        const err = await response.json();
        console.error('Processing failed:', err);
      }
    } catch (error) {
      console.error('Error processing batch:', error);
    }
  };

  const addYieldItem = () => {
    append({ productType: '', unitCount: 0, totalWeightKg: 0 });
  };

  const updateYieldItem = (index: number, field: 'productType' | 'unitCount' | 'totalWeightKg', value: string | number) => {
    const current = watch(`yieldMap.${index}`);
    setValue(`yieldMap.${index}`, { ...current, [field]: value });
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Batch">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Live Birds Processed"
          type="number"
          {...register('liveBirdsProcessed', { valueAsNumber: true })}
          error={errors.liveBirdsProcessed?.message}
          max={currentLive}

        />
        <Input
          label="Average Live Weight (kg)"
          type="number"
          step="0.001"
          {...register('avgLiveWeightKg', { valueAsNumber: true })}
          error={errors.avgLiveWeightKg?.message}
          placeholder={lastAvgWeightKg.toString()}
        />
        <Input
          label="Notes"
          {...register('notes')}
          error={errors.notes?.message}
        />

        <Card>
          <CardHeader>
            <CardTitle>Yield Map</CardTitle>
            <Button type="button" onClick={addYieldItem}>Add Product</Button>
          </CardHeader>
          <CardContent>
            {fields.map((field, index) => (
              <div key={field.id} className="border p-4 mb-2 rounded">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Type</label>
                  <select
                    value={watch(`yieldMap.${index}.productType`) || ''}
                    onChange={(e) => updateYieldItem(index, 'productType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select Product Type</option>
                    <option value="whole">Whole</option>
                    <option value="quarter">Quarter</option>
                    <option value="dogfood_combo">Dog Food Combo</option>
                    <option value="gizzards">Gizzards</option>
                    <option value="liver">Liver</option>
                    <option value="hearts">Hearts</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Unit Count"
                    type="number"
                    value={watch(`yieldMap.${index}.unitCount`) || ''}
                    onChange={(e) => updateYieldItem(index, 'unitCount', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                  />
                  <Input
                    label="Total Weight (kg)"
                    type="number"
                    step="0.001"
                    value={watch(`yieldMap.${index}.totalWeightKg`) || ''}
                    onChange={(e) => updateYieldItem(index, 'totalWeightKg', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </div>
                <Button type="button" variant="outline" className="text-red-500" onClick={() => remove(index)}>Remove</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {preview && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Total Live Weight: {totalLiveWeightForProcessing.toFixed(3)} kg</p>
              <p>Total Dressed Weight: {totalDressedWeightKg.toFixed(3)} kg</p>
              <p>Dressing Percentage: {preview.dressingPercentage.toFixed(2)}%</p>
              <p>Avg Dressed per Bird: {preview.avgDressedWeightPerBird.toFixed(3)} kg</p>
              <p>Allocated Cost: {formatCurrency(preview.allocatedCost)}</p>
              <p>Cost per Dressed kg: {formatCurrency(preview.costPerDressedKg)}</p>
              <div>
                <strong>Inventory Changes:</strong>
                <ul className="list-disc pl-5">
                  {preview.inventoryChanges.map((change: any, i: number) => (
                    <li key={i}>
                      {change.productType}: {change.count} units, {change.weightKg.toFixed(3)} kg at {formatCurrency(change.unitPrice)}/kg
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={watchedYieldMap.length === 0}>Process Batch</Button>
        </div>
      </form>
    </Modal>
  );
}