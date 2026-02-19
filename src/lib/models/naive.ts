import type { BaselineModel } from "./types";

/**
 * Predicts the historical average price for every future step.
 */
export class HistoricalAverageModel implements BaselineModel {
  name = "Historical Average";
  private mean = 0;

  fit(prices: number[]) {
    this.mean =
      prices.reduce((s, v) => s + v, 0) / (prices.length || 1);
  }

  predict(steps: number): number[] {
    return Array.from({ length: steps }, () => this.mean);
  }
}

/**
 * Predicts the most recent price for every future step (flat-line).
 */
export class LastPriceModel implements BaselineModel {
  name = "Last Price Hold";
  private last = 0;

  fit(prices: number[]) {
    this.last = prices[prices.length - 1] ?? 0;
  }

  predict(steps: number): number[] {
    return Array.from({ length: steps }, () => this.last);
  }
}
