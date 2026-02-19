import type { BaselineModel } from "./models/types";
import { mae, rmse } from "./metrics";

interface FoldResult {
  actual: number[];
  predicted: number[];
}

export interface BacktestResult {
  modelName: string;
  mae: number;
  rmse: number;
  folds: FoldResult[];
}

/**
 * Walk-forward evaluation on price series: splits into expanding training
 * windows, forecasts `horizon` steps ahead, then scores vs actual prices.
 */
export function walkForwardBacktest(
  prices: number[],
  modelFactory: () => BaselineModel,
  horizon: number,
  minTrainSize = 36
): BacktestResult {
  const model = modelFactory();
  const folds: FoldResult[] = [];

  for (let split = minTrainSize; split + horizon <= prices.length; split += horizon) {
    const train = prices.slice(0, split);
    const actual = prices.slice(split, split + horizon);

    model.fit(train);
    const predicted = model.predict(horizon);

    folds.push({ actual, predicted });
  }

  const allActual = folds.flatMap((f) => f.actual);
  const allPredicted = folds.flatMap((f) => f.predicted);

  return {
    modelName: model.name,
    mae: mae(allActual, allPredicted),
    rmse: rmse(allActual, allPredicted),
    folds,
  };
}
