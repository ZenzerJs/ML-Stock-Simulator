import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";

const VALID_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
  "TSLA", "META", "JPM", "V", "SPY",
];

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

export async function POST(req: Request) {
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
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Simulation error:", err);
    const msg =
      err instanceof Error ? err.message : "Internal server error";

    if (msg.includes("ENOENT")) {
      return NextResponse.json(
        { error: "Python not found. Install Python 3 and run: pip install -r pipeline/requirements.txt" },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
