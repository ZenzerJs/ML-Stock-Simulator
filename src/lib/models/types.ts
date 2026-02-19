export interface BaselineModel {
  name: string;
  fit(prices: number[]): void;
  predict(steps: number): number[];
}
