export interface MonthlyDataPoint {
  date: string;
  close: number;
  returnPct: number;
}

export async function fetchHistory(
  ticker: string
): Promise<MonthlyDataPoint[]> {
  const end = new Date();
  const start = new Date();
  start.setFullYear(end.getFullYear() - 10);

  const p1 = Math.floor(start.getTime() / 1000);
  const p2 = Math.floor(end.getTime() / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?period1=${p1}&period2=${p2}&interval=1mo`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch data for ${ticker} (${res.status})`);
  }

  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`No data returned for ${ticker}`);

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] =
    result.indicators?.adjclose?.[0]?.adjclose ??
    result.indicators?.quote?.[0]?.close ??
    [];

  const raw: Array<{ date: string; close: number }> = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c == null || isNaN(c)) continue;
    const d = new Date(timestamps[i] * 1000);
    raw.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      close: c,
    });
  }

  const series: MonthlyDataPoint[] = [];
  for (let i = 1; i < raw.length; i++) {
    const prev = raw[i - 1].close;
    const cur = raw[i].close;
    series.push({
      date: raw[i].date,
      close: cur,
      returnPct: ((cur / prev - 1) * 100),
    });
  }

  return series;
}
