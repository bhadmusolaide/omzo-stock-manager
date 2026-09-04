export type MedCategory = 'supplement' | 'antibiotic' | 'vitamin' | 'water' | 'organic';

export interface MedicationPhase {
  fromDay: number;
  toDay: number;
  label: string;
  category: MedCategory;
  note?: string;
}

export const MEDICATION_SCHEDULE: MedicationPhase[] = [
  { fromDay: 1,  toDay: 1,  label: 'Glucose',                         category: 'supplement' },
  { fromDay: 2,  toDay: 6,  label: 'Antibiotics',                     category: 'antibiotic' },
  { fromDay: 7,  toDay: 9,  label: 'Vitamin + Viramix',               category: 'vitamin' },
  { fromDay: 10, toDay: 14, label: 'AntiCocci (Prevent Blood Stool)', category: 'antibiotic' },
  { fromDay: 15, toDay: 19, label: 'Water',                           category: 'water' },
  { fromDay: 20, toDay: 22, label: 'AntiCocci',                      category: 'antibiotic' },
  { fromDay: 23, toDay: 25, label: 'Vitamin + Viramix',               category: 'vitamin' },
  { fromDay: 28, toDay: 32, label: 'Antibiotics (Organic: pawpaw leaves, bitter leaf)', category: 'organic' },
  { fromDay: 33, toDay: 35, label: 'Vitamin + Viramix',               category: 'vitamin' },
];

export const PROGRAM_END_DAY = 35;

export function getPhaseForDay(ageInDays: number): MedicationPhase | null {
  if (ageInDays < 1 || ageInDays > PROGRAM_END_DAY) return null;
  return MEDICATION_SCHEDULE.find(p => ageInDays >= p.fromDay && ageInDays <= p.toDay) ?? null;
}

export function getUpcomingPhases(ageInDays: number, limit = 2): MedicationPhase[] {
  return MEDICATION_SCHEDULE.filter(p => p.fromDay > ageInDays).slice(0, limit);
}

export function getCompletedPhases(ageInDays: number): MedicationPhase[] {
  return MEDICATION_SCHEDULE.filter(p => p.toDay < ageInDays);
}

export function getProgramProgress(ageInDays: number): number {
  return Math.min(100, Math.max(0, (ageInDays / PROGRAM_END_DAY) * 100));
}

export const CATEGORY_COLORS: Record<MedCategory, string> = {
  supplement:  'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  antibiotic:  'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  vitamin:     'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  water:       'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  organic:     'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
};