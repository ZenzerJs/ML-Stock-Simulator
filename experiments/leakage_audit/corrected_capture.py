"""Run corrected evaluation on the frozen baseline inputs, without network."""
import argparse, hashlib, importlib.metadata, json, platform, sys, subprocess, types
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import pandas as pd
from joblib import parallel_backend

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
import simulate
from temporal import prepare_monthly

p = argparse.ArgumentParser()
p.add_argument("--mode", choices=("temporal", "repaired"), required=True)
args = p.parse_args()
original_sha = "aaa24490da11d8bfd24bf463bc48c1b7bbb529fd73750bd68adfccaa4c5a5b92"
if args.mode == "temporal":
    blob = subprocess.check_output(["git", "show", "3b4030eda5acb80528bfe43d5897fc299bc30122:pipeline/simulate.py"], cwd=ROOT)
    if hashlib.sha256(blob).hexdigest() != original_sha: raise SystemExit("Original source hash mismatch")
    original = types.ModuleType("original_simulate")
    exec(compile(blob, "original_simulate.py", "exec"), original.__dict__)
    def legacy_arima(returns, horizon, info=None):
        if info is not None: info.update({"status": "legacy_unobserved", "order": None})
        return original.arima_scenarios(returns, horizon)
    simulate.arima_scenarios = legacy_arima
AS_OF = pd.Timestamp("2026-11-05T20:37:00Z")
OUT = ROOT / "experiments/leakage_audit" / ("temporal_final" if args.mode == "temporal" else "repaired")
OUT.mkdir(exist_ok=True)
for ticker in ("SPY", "AAPL"):
    manifest_path = OUT / f"{ticker}_manifest.json"
    if manifest_path.exists():
        raise SystemExit(f"Refusing to overwrite {manifest_path}")
    baseline = json.loads((ROOT / f"experiments/leakage_audit/baseline/{ticker}_manifest.json").read_text(encoding="utf-8"))
    snapshot = ROOT / f"experiments/leakage_audit/snapshots/{ticker}.pkl"
    sha = hashlib.sha256(snapshot.read_bytes()).hexdigest()
    if sha != baseline["snapshot_sha256"]: raise SystemExit(f"Snapshot hash mismatch: {ticker}")
    df = prepare_monthly(pd.read_pickle(snapshot), AS_OF)
    feat, targets = simulate.build_features(df), simulate.build_targets(df)
    result = {"ticker": ticker, "snapshot_sha256": sha, "evaluation_as_of": AS_OF.isoformat(),
              "run_utc": datetime.now(timezone.utc).isoformat(), "source_commit": baseline["source_commit"], "mode": args.mode, "legacy_arima_source_sha256": original_sha if args.mode == "temporal" else None,
              "source_sha256": {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT / "pipeline/simulate.py", ROOT / "pipeline/temporal.py", Path(__file__)]},
              "python": platform.python_version(), "versions": {x: importlib.metadata.version(x) for x in ["numpy", "pandas", "yfinance", "statsmodels", "scikit-learn"]},
              "settings": {"min_train_mature": 48, "step_calendar_months": 6, "ridge_alpha": 1.0, "rf_trees": 100, "rf_seed": 42, "joblib_backend": "sequential", "arima": "SHA-verified original implementation" if args.mode == "temporal" else "repaired production implementation"}, "horizons": {}}
    for h in (6,12):
        with parallel_backend("sequential"):
            bt, _, audit = simulate.walk_forward_backtest(df, feat, targets, h, evaluation_as_of=AS_OF)
        rows = pd.DataFrame([r for model in bt.values() for r in model["raw"]])
        rows.to_csv(OUT / f"{ticker}_{h}m.csv", index=False, float_format="%.17g")
        (OUT / f"{ticker}_{h}m_audit.json").write_text(json.dumps(audit, indent=2)+"\n", encoding="utf-8")
        old = pd.read_csv(ROOT / f"experiments/leakage_audit/baseline/{ticker}_{h}m.csv")
        old["forecast_month"] = pd.to_datetime(old.forecast_bar, utc=True).dt.strftime("%Y-%m")
        rows["forecast_month"] = pd.to_datetime(rows.forecast_bar).dt.strftime("%Y-%m")
        common = old.merge(rows, on=["model", "forecast_month"], suffixes=("_old", "_new"))
        summary=[]
        for model in ("ARIMA", "Ridge Regression", "Random Forest"):
            v=common[common.model == model]
            def scores(col):
                e=v[col].to_numpy()
                return {"mae": float(np.mean(np.abs(e))), "rmse": float(np.sqrt(np.mean(e**2)))} if len(e) else None
            summary.append({"model": model, "common_folds": len(v), "old_unrounded": scores("error_actual_minus_prediction_old"), "corrected_unrounded": scores("error_actual_minus_prediction_new")})
        common.to_csv(OUT / f"{ticker}_{h}m_common.csv", index=False, float_format="%.17g")
        result["horizons"][str(h)] = {"all_evaluated_folds": len(rows[rows.model == "ARIMA"]), "original_folds": baseline["horizons"][str(h)]["folds"], "common_date_metrics": summary, "skipped": [x for x in audit if x["status"] == "skipped"]}
    manifest_path.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(ticker, json.dumps(result["horizons"],indent=2))
