import { AVIAGEN_AA_INTAKE_OBJ, AVIAGEN_AA_WEEKLY_WEIGHT_KG } from '@/utils/calculations';

export interface AviagenWeeklyData {
  week: number;
  ageDays: number;
  avgWeightKg: number;
  weeklyFeedG: number;
  cumulativeFeedG: number;
  dailyIntakeG: number;
}

export interface WeeklyProjection {
  week: number;
  ageDays: number;
  birdsCount: number;
  mortalityCount: number;
  liveBirds: number;
  avgWeightKg: number;
  weeklyFeedG: number;
  cumulativeFeedG: number;
  totalWeeklyFeedKg: number;
  totalCumulativeFeedKg: number;
  totalWeightGainKg: number;
  cumulativeWeightGainKg: number;
  feedConsumedActualKg: number | null;
  fcr: number | null;
  cumulativeFcr: number | null;
}

export function computeWeeklyFeedData(): AviagenWeeklyData[] {
  const weeklyData: AviagenWeeklyData[] = [];
  let cumulative = 0;

  for (let week = 1; week <= 6; week++) {
    const startDay = (week - 1) * 7;
    const endDay = week * 7 - 1;
    let weeklySum = 0;
    for (let day = startDay; day <= endDay && day < AVIAGEN_AA_INTAKE_OBJ.length; day++) {
      weeklySum += AVIAGEN_AA_INTAKE_OBJ[day];
    }
    cumulative += weeklySum;
    const ageDays = week * 7;
    weeklyData.push({
      week,
      ageDays,
      avgWeightKg: AVIAGEN_AA_WEEKLY_WEIGHT_KG[ageDays] ?? 0,
      weeklyFeedG: weeklySum,
      cumulativeFeedG: cumulative,
      dailyIntakeG: Math.round(weeklySum / 7),
    });
  }
  return weeklyData;
}

export function computeProjections(
  birdCount: number,
  mortalityRate: number,
  actualFeedByWeek: (number | null)[]
): WeeklyProjection[] {
  const weeklyData = computeWeeklyFeedData();
  const projections: WeeklyProjection[] = [];
  let cumulativeFeedKg = 0;
  let previousWeightKg = 0;

  for (let i = 0; i < weeklyData.length; i++) {
    const w = weeklyData[i];
    const mortalityCount = Math.round(birdCount * (mortalityRate / 100) / weeklyData.length);
    const liveBirds = i === 0 ? birdCount - mortalityCount : projections[i - 1].liveBirds - mortalityCount;
    const totalWeeklyFeedKg = (w.weeklyFeedG * birdCount) / 1000;
    cumulativeFeedKg += totalWeeklyFeedKg;
    const weeklyWeightGainKg = (w.avgWeightKg - previousWeightKg) * liveBirds;
    previousWeightKg = w.avgWeightKg;
    const cumulativeWeightGainKg = w.avgWeightKg * liveBirds;

    const actualKg = actualFeedByWeek[i] ?? null;
    let fcr: number | null = null;
    let cumulativeFcr: number | null = null;

    if (actualKg !== null && weeklyWeightGainKg > 0) {
      fcr = actualKg / weeklyWeightGainKg;
    }
    if (actualKg !== null) {
      const totalActualCumulative = actualFeedByWeek
        .slice(0, i + 1)
        .filter((v): v is number => v !== null)
        .reduce((sum, v) => sum + v, 0);
      if (totalActualCumulative > 0 && cumulativeWeightGainKg > 0) {
        cumulativeFcr = totalActualCumulative / cumulativeWeightGainKg;
      }
    }

    projections.push({
      week: w.week,
      ageDays: w.ageDays,
      birdsCount: birdCount,
      mortalityCount: mortalityCount > 0 ? mortalityCount : 0,
      liveBirds,
      avgWeightKg: w.avgWeightKg,
      weeklyFeedG: w.weeklyFeedG,
      cumulativeFeedG: w.cumulativeFeedG,
      totalWeeklyFeedKg,
      totalCumulativeFeedKg: cumulativeFeedKg,
      totalWeightGainKg: weeklyWeightGainKg,
      cumulativeWeightGainKg,
      feedConsumedActualKg: actualKg,
      fcr,
      cumulativeFcr,
    });
  }
  return projections;
}