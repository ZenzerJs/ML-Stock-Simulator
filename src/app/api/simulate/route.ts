import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";

const VALID_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
  "TSLA", "META", "JPM", "V", "SPY",
];

// ── Rate limiter (in-memory, per IP) ──────────────────────────

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = hits.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

// Periodically purge stale entries so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of hits) {
    const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length === 0) hits.delete(ip);
    else hits.set(ip, recent);
  }
}, RATE_WINDOW_MS * 2);

// ── Python subprocess ─────────────────────────────────────────

function runPython(
  ticker: string,
  horizon: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "pipeline", "simulate.py");

    const tryCmd = (cmd: string) => {
      execFile(
        cmd,
        [scriptPath, ticker, String(horizon)],
        { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) {
            if (cmd === "python" && err.message?.includes("ENOENT")) {
              tryCmd("python3");
              return;
            }
            reject(new Error(stderr || err.message));
            return;
          }
          resolve(stdout);
        }
      );
    };

    tryCmd("python");
  });
}

// ── Route handler ─────────────────────────────────────────────

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { ticker, horizonMonths } = body as {
      ticker: string;
      horizonMonths: number;
    };

    if (!ticker || !VALID_TICKERS.includes(ticker)) {
      return NextResponse.json(
        { error: `Invalid ticker. Choose from: ${VALID_TICKERS.join(", ")}` },
        { status: 400 }
      );
    }

    if (horizonMonths !== 6 && horizonMonths !== 12) {
      return NextResponse.json(
        { error: "horizonMonths must be 6 or 12" },
        { status: 400 }
      );
    }

    const stdout = await runPython(ticker, horizonMonths);
    const result = JSON.parse(stdout);

    if (result.error) {
      console.error("Pipeline error:", result.error);
      return NextResponse.json(
        { error: "Simulation failed. Please try a different ticker or try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Simulation error:", err);

    return NextResponse.json(
      { error: "Something went wrong running the simulation. Please try again." },
      { status: 500 }
    );
  }
}
