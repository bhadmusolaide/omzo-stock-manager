'use client';

import { Input } from '@/components/ui/Input';

interface BatchCalculatorFormProps {
  birdCount: number;
  mortalityRate: number;
  onBirdCountChange: (value: number) => void;
  onMortalityRateChange: (value: number) => void;
}

export function BatchCalculatorForm({
  birdCount,
  mortalityRate,
  onBirdCountChange,
  onMortalityRateChange,
}: BatchCalculatorFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Input
        label="Number of Birds (DOC)"
        type="number"
        min={1}
        value={birdCount}
        onChange={(e) => onBirdCountChange(parseInt(e.target.value) || 0)}
        placeholder="e.g. 1000"
      />
      <Input
        label="Expected Mortality Rate (%)"
        type="number"
        min={0}
        max={100}
        step={0.5}
        value={mortalityRate}
        onChange={(e) => onMortalityRateChange(parseFloat(e.target.value) || 0)}
        placeholder="e.g. 5"
      />
    </div>
  );
}