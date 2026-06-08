// Placeholder for calculation utilities
export const calculateTotal = (items: number[]) => {
  return items.reduce((sum, item) => sum + item, 0);
};

export const calculateAverage = (items: number[]) => {
  return items.length ? calculateTotal(items) / items.length : 0;
};

/** Effective unit cost of DOCs */
export function calculateEffectiveUnitCost(totalDocCost: number, docPurchasedCount: number, docFreeCount: number): number {
  const totalChicks = (docPurchasedCount || 0);
  return totalChicks > 0 ? totalDocCost / totalChicks : 0;
}

/** Current live birds given total and mortality */
export function calculateCurrentLive(totalChicks: number, totalMortality: number): number {
  return Math.max(0, (totalChicks || 0) - (totalMortality || 0));
}

export type PriceMode = 'COUNT' | 'KG' | 'COUNT_KG';
export interface OrderItemCalc {
  qtyCount: number;
  qtyWeight: number;
  unitPrice: number;
  priceMode: PriceMode;
}

/** Compute subtotal for an order item based on price mode */
export function computeOrderItemSubtotal(item: OrderItemCalc): number {
  const { qtyCount = 0, qtyWeight = 0, unitPrice = 0, priceMode } = item;
  if (priceMode === 'COUNT') return qtyCount * unitPrice;
  if (priceMode === 'KG') return qtyWeight * unitPrice;
  // COUNT_KG: default to weight pricing as per app behavior
  return qtyWeight * unitPrice;
}

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

/** Compute payment status from totals */
export function computePaymentStatus(totalAmount: number, amountPaid: number): PaymentStatus {
  if ((amountPaid || 0) <= 0) return 'PENDING';
  if ((amountPaid || 0) < (totalAmount || 0)) return 'PARTIAL';
  return 'PAID';
}

export type AllocationMode = 'per_bird' | 'per_kg';

/**
 * Allocate batch costs to processed birds based on mode
 */
export function allocateCostsToProcessing(
  totalBatchCost: number,
  mode: AllocationMode,
  liveCount: number,
  liveWeightKg: number
): { costPerBird?: number; costPerKg?: number } {
  if (mode === 'per_bird') {
    const costPerBird = liveCount > 0 ? totalBatchCost / liveCount : 0;
    return { costPerBird };
  } else {
    const costPerKg = liveWeightKg > 0 ? totalBatchCost / liveWeightKg : 0;
    return { costPerKg };
  }
}

/**
 * Calculate dressing percentage
 */
export function calculateDressingPercentage(
  totalDressedWeightKg: number,
  totalLiveWeightKg: number
): number {
  return totalLiveWeightKg > 0 ? (totalDressedWeightKg / totalLiveWeightKg) * 100 : 0;
}

/**
 * Average dressed weight per bird
 */
export function calculateAvgDressedWeightPerBird(
  totalDressedWeightKg: number,
  liveBirdsProcessed: number
): number {
  return liveBirdsProcessed > 0 ? totalDressedWeightKg / liveBirdsProcessed : 0;
}

/**
 * Cost per dressed kg
 */
export function calculateCostPerDressedKg(
  totalBatchCostAllocated: number,
  totalDressedWeightKg: number
): number {
  return totalDressedWeightKg > 0 ? totalBatchCostAllocated / totalDressedWeightKg : 0;
}

/**
 * Feed Conversion Ratio (FCR)
 */
export function calculateFCR(
  totalFeedConsumedKg: number,
  totalLiveWeightGainKg: number
): number {
  return totalLiveWeightGainKg > 0 ? totalFeedConsumedKg / totalLiveWeightGainKg : 0;
}

/**
 * Profit per dressed kg
 */
export function calculateProfitPerDressedKg(
  revenue: number,
  costPerDressedKg: number,
  totalDressedWeightKg: number,
  processingExpenses: number
): number {
  const totalCost = (costPerDressedKg * totalDressedWeightKg) + processingExpenses;
  const profit = revenue - totalCost;
  return totalDressedWeightKg > 0 ? profit / totalDressedWeightKg : 0;
}

/**
 * Get estimated daily feed consumption based on batch age
 */
export function getEstimatedDailyFeedConsumption(batch: any): { estimatedConsumptionKg: number; intakeG: number; ageInDays: number } {
  // A rough estimate placeholder (e.g., 150g per bird per day)
  const intakeG = 150;
  const currentLive = batch?.currentLive || 0;
  const estimatedConsumptionKg = (currentLive * intakeG) / 1000;

  // Calculate age in days
  const placementDate = batch?.placementDate ? new Date(batch.placementDate) : new Date();
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - placementDate.getTime());
  const ageInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return { estimatedConsumptionKg, intakeG, ageInDays };
}
