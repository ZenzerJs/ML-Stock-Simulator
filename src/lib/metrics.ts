export function mae(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(actual[i] - predicted[i]);
  return sum / n;
}

export function rmse(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (actual[i] - predicted[i]) ** 2;
  return Math.sqrt(sum / n);
}
