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

// Aviagen Arbor Acres 2022 As-Hatched Daily Intake (g) - up to 60 days
export const AVIAGEN_AA_INTAKE_OBJ = [
   13,  13,  17,  20,  24,  28,  31,  // Week 1 (Days 0-6)
   35,  39,  44,  48,  53,  57,  62,  // Week 2 (Days 7-13)
   67,  73,  78,  83,  89,  95, 101,  // Week 3 (Days 14-20)
  106, 112, 118, 124, 130, 135, 141,  // Week 4 (Days 21-27)
  146, 152, 157, 162, 167, 172, 177,  // Week 5 (Days 28-34)
  181, 186, 190, 194, 198, 202, 206,  // Week 6 (Days 35-41)
  210, 213, 216, 219, 222, 224, 226,  // Week 7 (Days 42-48)
  228, 230, 232, 233, 234, 235, 236,  // Week 8 (Days 49-55)
  237, 237, 238, 237, 237             // Week 9+ (Days 56-60)
];

/**
 * Aviagen Arbor Acres 2022 As-Hatched Weekly Body Weight Targets (kg)
 * Key days: 0, 7, 14, 21, 28, 35, 42
 */
export const AVIAGEN_AA_WEEKLY_WEIGHT_KG: Record<number, number> = {
  0: 0.042,
  7: 0.185,
  14: 0.480,
  21: 0.950,
  28: 1.570,
  35: 2.280,
  42: 3.040,
};

/**
 * Calculate batch age in days from startDate
 */
export function getBatchAgeInDays(startDateStr?: string): number {
  if (!startDateStr) return 0;
  const startDate = new Date(startDateStr);
  const today = new Date();
  startDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (today < startDate) return 0;
  return Math.floor(Math.abs(today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get estimated daily feed consumption based on batch age
 */
export function getEstimatedDailyFeedConsumption(batch: any): { estimatedConsumptionKg: number; intakeG: number; ageInDays: number } {
  const ageInDays = getBatchAgeInDays(batch?.startDate || batch?.placementDate);

  // Cap at max length of our array
  const lookupAge = Math.min(ageInDays, AVIAGEN_AA_INTAKE_OBJ.length - 1);
  const intakeG = AVIAGEN_AA_INTAKE_OBJ[lookupAge];

  const currentLive = batch?.currentLive || 0;
  const estimatedConsumptionKg = (currentLive * intakeG) / 1000;

  return { estimatedConsumptionKg, intakeG, ageInDays };
}

export interface FeedProjection {
  targetAgeDays: number;
  label: string;
  kgNeeded: number;
  bagsNeeded: number;
  isReached: boolean;
}

/**
 * Project feed needed to reach specific milestones (4, 5, and 6 weeks)
 */
export function getFeedProjections(currentAgeInDays: number, currentLive: number): FeedProjection[] {
  const milestones = [
    { targetAgeDays: 28, label: '4 Weeks' }, // 28 days
    { targetAgeDays: 35, label: '5 Weeks' }, // 35 days
    { targetAgeDays: 42, label: '6 Weeks' }, // 42 days
  ];

  return milestones.map(milestone => {
    let gramsNeeded = 0;
    const isReached = currentAgeInDays >= milestone.targetAgeDays;

    if (!isReached) {
      // Sum intake from current day up to (but not including) target day
      for (let day = currentAgeInDays; day < milestone.targetAgeDays; day++) {
        const lookupAge = Math.min(day, AVIAGEN_AA_INTAKE_OBJ.length - 1);
        gramsNeeded += AVIAGEN_AA_INTAKE_OBJ[lookupAge];
      }
    }

    const kgNeeded = (gramsNeeded * currentLive) / 1000;
    const bagsNeeded = kgNeeded / 25; // Assuming 25kg per bag

    return {
      targetAgeDays: milestone.targetAgeDays,
      label: milestone.label,
      kgNeeded,
      bagsNeeded,
      isReached
    };
  });
}
