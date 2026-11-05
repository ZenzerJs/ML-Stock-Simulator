"""Freeze input and observe the unmodified backtest; never fetch during evaluation."""
import argparse, hashlib, importlib.metadata, json, platform, sys, subprocess, types
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
SOURCE_COMMIT = "3b4030eda5acb80528bfe43d5897fc299bc30122"
SOURCE_SHA256 = "aaa24490da11d8bfd24bf463bc48c1b7bbb529fd73750bd68adfccaa4c5a5b92"
source = subprocess.check_output(["git", "show", f"{SOURCE_COMMIT}:pipeline/simulate.py"], cwd=ROOT)
if hashlib.sha256(source).hexdigest() != SOURCE_SHA256:
    raise SystemExit("Original source hash mismatch")
simulate = types.ModuleType("original_simulate")
exec(compile(source, "original_simulate.py", "exec"), simulate.__dict__)

p = argparse.ArgumentParser()
p.add_argument("action", choices=["fetch", "run"])
p.add_argument("--ticker", default="SPY")
p.add_argument("--output-dir", default=None)
args = p.parse_args()
snapshot = ROOT / "experiments/leakage_audit/snapshots" / f"{args.ticker}.pkl"
outdir = Path(args.output_dir) if args.output_dir else ROOT / "experiments/leakage_audit/baseline"
outdir.mkdir(parents=True, exist_ok=True)
if args.action == "fetch":
    if snapshot.exists():
        raise SystemExit("Snapshot already exists; refusing to overwrite")
    simulate.yf.set_tz_cache_location(str(snapshot.parent))
    hist = simulate.yf.Ticker(args.ticker).history(period="10y", interval="1mo", auto_adjust=True)
    df = simulate._normalize_yahoo_df(hist)
    if len(df) < 48:
        raise SystemExit(f"Insufficient Yahoo bars: {len(df)}")
    df.to_pickle(snapshot)
    print(f"Saved {len(df)} rows to {snapshot}")
    raise SystemExit

if (outdir / f"{args.ticker}_manifest.json").exists() or any((outdir / f"{args.ticker}_{h}m.csv").exists() for h in (6, 12)):
    raise SystemExit("Baseline output exists; refusing to overwrite")
if not snapshot.exists():
    raise SystemExit("Snapshot missing; fetch first")
df = pd.read_pickle(snapshot)
sha = hashlib.sha256(snapshot.read_bytes()).hexdigest()
features, targets = simulate.build_features(df), simulate.build_targets(df)
manifest = {"ticker": args.ticker, "source_commit": "3b4030eda5acb80528bfe43d5897fc299bc30122", "snapshot_sha256": sha,
    "source_file_sha256_git_blob_bytes": SOURCE_SHA256, "run_utc": datetime.now(timezone.utc).isoformat(),
    "snapshot_rows": len(df), "first": str(df.index[0]), "last": str(df.index[-1]),
    "python": platform.python_version(), "versions": {x: importlib.metadata.version(x) for x in ["numpy", "pandas", "yfinance", "statsmodels", "scikit-learn"]},
    "settings": {"min_train": 48, "step": 6, "ridge_alpha": 1.0, "rf_trees": 100, "rf_seed": 42, "arima_orders": [[2,0,2],[1,1,1],[1,0,1]]}, "horizons": {}}
for h in (6, 12):
    records = []
    # Observe actual original implementations without altering their results.
    old_arima, old_ridge, old_rf = simulate.arima_scenarios, simulate.Ridge, simulate.RandomForestRegressor
    class RidgeObserver(old_ridge):
        def predict(self, X):
            result = super().predict(X); records[-1]["Ridge Regression"] = float(result[0]); return result
    class RFObserver(old_rf):
        def predict(self, X):
            result = super().predict(X); records[-1]["Random Forest"] = float(result[0]); return result
    def arima_observer(returns, horizon):
        result = old_arima(returns, horizon)
        records.append({"ARIMA": float(result[1])})
        return result
    simulate.arima_scenarios, simulate.Ridge, simulate.RandomForestRegressor = arima_observer, RidgeObserver, RFObserver
    try:
        from joblib import parallel_backend
        with parallel_backend("sequential"):
            bt, residuals = simulate.walk_forward_backtest(df, features, targets, h)
    finally:
        simulate.arima_scenarios, simulate.Ridge, simulate.RandomForestRegressor = old_arima, old_ridge, old_rf
    if bt is None:
        manifest["horizons"][str(h)] = {"error": "insufficient valid rows"}; continue
    vi = np.flatnonzero((~features.isna().any(axis=1) & targets[h].notna()).to_numpy())
    rows = []
    for j, i in enumerate(range(48, len(vi), 6)):
        tp = vi[i]
        if tp + h >= len(df): break
        actual = float(targets[h].iloc[tp])
        for model, prediction in records[j].items():
            rows.append({"forecast_bar": str(df.index[tp]), "target_bar": str(df.index[tp+h]), "model": model,
                "train_count": (tp + 1 if model == "ARIMA" else i), "train_count_kind": ("returns" if model == "ARIMA" else "supervised_rows"), "actual_return": actual, "prediction": prediction, "error_actual_minus_prediction": actual-prediction})
    result_path = outdir / f"{args.ticker}_{h}m.csv"
    pd.DataFrame(rows).to_csv(result_path, index=False, float_format="%.17g")
    manifest["horizons"][str(h)] = {"folds": len(records), "original_reported_metrics_on_rounded_returns": simulate.compute_metrics(bt), "raw_predictions": result_path.name, "residual_std_unrounded": residuals}
(outdir / f"{args.ticker}_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
