"""Acquire one private immutable input per ticker; evaluations never download."""
import hashlib, json
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parent
SNAP = ROOT / "snapshots"
SNAP.mkdir(exist_ok=True)
yf.set_tz_cache_location(str(SNAP))
for ticker in ("SPY", "AAPL"):
    path = SNAP / f"{ticker}_daily.csv"
    manifest = SNAP / f"{ticker}_acquisition.json"
    if path.exists() or manifest.exists():
        raise SystemExit(f"Refusing to overwrite {ticker} snapshot or manifest")
    started = datetime.now(timezone.utc).isoformat()
    data = yf.Ticker(ticker).history(period="10y", interval="1d", auto_adjust=True)
    ended = datetime.now(timezone.utc).isoformat()
    if data.empty or "Close" not in data: raise SystemExit(f"No data for {ticker}")
    index = pd.DatetimeIndex(data.index)
    if index.tz is not None: index = index.tz_convert("America/New_York").tz_localize(None)
    frame = pd.DataFrame({"session": index.strftime("%Y-%m-%d"), "adjusted_close": data["Close"].to_numpy()})
    if frame.session.duplicated().any() or frame.adjusted_close.isna().any():
        raise SystemExit(f"Duplicate or missing daily closes in {ticker}")
    frame.to_csv(path, index=False, float_format="%.17g")
    record = {"ticker": ticker, "request": "history(period=10y, interval=1d, auto_adjust=True)",
              "started_utc": started, "acquired_utc": ended, "rows": len(frame),
              "first_session": frame.session.iloc[0], "last_session": frame.session.iloc[-1],
              "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "yfinance": yf.__version__}
    manifest.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record))
