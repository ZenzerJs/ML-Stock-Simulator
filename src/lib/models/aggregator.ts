import type { BaselineModel } from "./types";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export interface ScenarioStep {
  month: string;
  bearish: number;
  stable: number;
  bullish: number;
}

export function aggregateScenarios(
  models: BaselineModel[],
  steps: number,
  startDate: string
): ScenarioStep[] {
  const predictions = models.map((m) => m.predict(steps));

  const result: ScenarioStep[] = [];
  const [year, month] = startDate.split("-").map(Number);

  for (let i = 0; i < steps; i++) {
    const stepPreds = predictions.map((p) => p[i]);
    const fYear = year + Math.floor((month - 1 + i + 1) / 12);
    const fMonth = ((month - 1 + i + 1) % 12) + 1;

    result.push({
      month: `${fYear}-${String(fMonth).padStart(2, "0")}`,
      bearish: Number(Math.min(...stepPreds).toFixed(2)),
      stable: Number(median(stepPreds).toFixed(2)),
      bullish: Number(Math.max(...stepPreds).toFixed(2)),
    });
  }

  return result;
}
