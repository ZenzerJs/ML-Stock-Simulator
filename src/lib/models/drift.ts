import type { BaselineModel } from "./types";

/**
 * Extends the average month-over-month price trend into the future.
 */
export class TrendProjectionModel implements BaselineModel {
  name = "Trend Projection";
  private lastPrice = 0;
  private drift = 0;

  fit(prices: number[]) {
    const n = prices.length;
    if (n < 2) {
      this.lastPrice = prices[0] ?? 0;
      this.drift = 0;
      return;
    }
    this.lastPrice = prices[n - 1];
    this.drift = (prices[n - 1] - prices[0]) / (n - 1);
  }

  predict(steps: number): number[] {
    return Array.from(
      { length: steps },
      (_, k) => Math.max(0, this.lastPrice + (k + 1) * this.drift)
    );
  }
}
