"""Replay the preregistered daily-volatility experiment from a verified snapshot."""
import argparse, hashlib, importlib.metadata, json, platform
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import pandas as pd
from threadpoolctl import threadpool_limits
import research as v

ROOT = Path(__file__).resolve().parent
p = argparse.ArgumentParser()
p.add_argument("--ticker", choices=("SPY", "AAPL"), required=True)
args = p.parse_args()
source = ROOT / "snapshots" / f"{args.ticker}_daily.csv"
acquisition = json.loads((ROOT / "snapshots" / f"{args.ticker}_acquisition.json").read_text(encoding="utf-8"))
frame = v.load_snapshot(source, acquisition["sha256"])
results = ROOT / "results" / args.ticker
if results.exists(): raise SystemExit(f"Refusing to overwrite results directory: {results}")
results.mkdir(parents=True)
as_of = pd.Timestamp(acquisition["acquired_utc"])
grid = v.calendar_grid(frame, as_of)
started = datetime.now(timezone.utc).isoformat()
def progress(position, total): print(f"{args.ticker}: candidate session {position}/{total}", flush=True)
with threadpool_limits(limits=1): rows, skipped = v.evaluate(grid, as_of, progress=progress)
raw = pd.DataFrame(rows)
raw.to_csv(results / "folds.csv", index=False, float_format="%.17g")
(results / "skipped.json").write_text(json.dumps(skipped, indent=2)+"\n", encoding="utf-8")
success = raw[raw.status == "ok"].copy()
counts = success.groupby("forecast_session")["model"].nunique()
common_dates = counts[counts == len(v.MODELS)].index
common = success[success.forecast_session.isin(common_dates)].copy()
common.to_csv(results / "common.csv", index=False, float_format="%.17g")
def metrics(frame):
    if frame.empty: return {"count": 0}
    error = frame.error_actual_minus_prediction.to_numpy()
    return {"count":len(frame), "mae":float(np.mean(abs(error))), "rmse":float(np.sqrt(np.mean(error**2))),
            "qlike":float(frame.qlike.mean()), "prediction_floor_count":int(frame.prediction_floored_for_qlike.sum()),
            "target_floor_count":int(frame.actual_floored_for_qlike.sum())}
summary = {}
for model in v.MODELS:
    all_rows=raw[raw.model==model]; ok=success[success.model==model]; matched=common[common.model==model]
    summary[model] = {"status_counts": {str(k):int(n) for k,n in all_rows.status.value_counts().items()},
                      "model_specific":metrics(ok), "all_models_common":metrics(matched),
                      "common_by_regime":{regime:metrics(matched[matched.regime==regime]) for regime in ("typical_recent_variance","high_recent_variance")}}
manifest = {"ticker":args.ticker, "acquisition":acquisition, "evaluation_as_of_utc":as_of.isoformat(), "run_started_utc":started,
            "run_completed_utc":datetime.now(timezone.utc).isoformat(), "calendar":"XNYS", "session_count":len(grid),
            "calendar_missing_or_unavailable_close_count":int(grid.close.isna().sum()), "candidate_skips":len(skipped),
            "evaluated_folds":len(raw[raw.model==v.MODELS[0]]), "all_models_common_dates":len(common_dates),
            "source_sha256":{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/"CONTRACT.md", ROOT/"research.py", ROOT/"run.py", ROOT/"acquire.py", ROOT/"requirements.txt")},
            "python":platform.python_version(), "versions":{name:importlib.metadata.version(name) for name in ("numpy","pandas","scipy","scikit-learn","arch","exchange_calendars","yfinance","pyluach","toolz","korean_lunar_calendar","tzdata")},
            "config":{"horizon_sessions":5,"min_train_mature":756,"window_sessions":1260,"step_sessions":5,"rf_trees":100,"rf_seed":42,"ridge_alpha":1.0,"ewma_lambda":0.94,"qlike_floor":v.EPSILON,"high_recent_variance_threshold":0.0004},
            "metrics":summary}
(results / "manifest.json").write_text(json.dumps(manifest, indent=2)+"\n", encoding="utf-8")
print(f"{args.ticker}: {len(common_dates)} all-model common folds; results saved", flush=True)
