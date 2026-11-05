"""Pre-registered, calendar-aware daily variance experiment."""
from pathlib import Path
import hashlib
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent / ".deps"))
import numpy as np
import pandas as pd
import exchange_calendars as xc
from arch import arch_model
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

EPSILON = 1e-12
MODELS = ("persistence5", "rolling21", "ewma094", "garch11", "har_ols", "ridge", "random_forest", "ridge_extended")
BASE = ["sq1", "sq5", "sq21"]
EXTRA = ["sq_lag1", "sq_lag2", "sq_lag9", "signed5", "signed21"]


def load_snapshot(path, expected_sha256):
    path = Path(path)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != expected_sha256: raise ValueError("snapshot SHA-256 mismatch")
    return pd.read_csv(path)


def utc(value):
    ts = pd.Timestamp(value)
    if ts.tzinfo is None: raise ValueError("as_of must be timezone-aware")
    return ts.tz_convert("UTC")


def calendar_grid(frame, as_of):
    """Reindex prices to XNYS sessions; mask bars before their availability."""
    cutoff = utc(as_of)
    dates = pd.to_datetime(frame["session"], errors="raise")
    if dates.dt.tz is not None: raise ValueError("session labels must be timezone-naive dates")
    if dates.duplicated().any() or not dates.is_monotonic_increasing:
        raise ValueError("session labels must be unique and sorted")
    if (dates != dates.dt.normalize()).any(): raise ValueError("session labels must be dates")
    cal = xc.get_calendar("XNYS", start=dates.iloc[0], end=dates.iloc[-1] + pd.Timedelta(days=10))
    sessions = cal.sessions_in_range(dates.iloc[0], dates.iloc[-1])
    if not pd.DatetimeIndex(dates).isin(sessions).all(): raise ValueError("non-XNYS session in input")
    close = pd.Series(frame.adjusted_close.to_numpy(dtype=float), index=pd.DatetimeIndex(dates)).reindex(sessions)
    if ((close <= 0) & close.notna()).any() or np.isinf(close).any(): raise ValueError("invalid close")
    availability = pd.Series((sessions + pd.Timedelta(days=1)).tz_localize("America/New_York").tz_convert("UTC"), index=sessions)
    close = close.where(availability <= cutoff)
    ret = np.log(close / close.shift(1))
    result = pd.DataFrame({"close": close, "available_at": availability, "return": ret}, index=sessions)
    return result


def make_dataset(grid):
    r = grid["return"]; sq = r ** 2
    x = pd.DataFrame({"sq1": sq, "sq5": sq.rolling(5).mean(), "sq21": sq.rolling(21).mean(),
                      "sq_lag1": sq.shift(1), "sq_lag2": sq.shift(2), "sq_lag9": sq.shift(9),
                      "signed5": r.rolling(5).mean(), "signed21": r.rolling(21).mean()}, index=grid.index)
    future = pd.concat([sq.shift(-j) for j in range(1, 6)], axis=1)
    target = future.mean(axis=1).where(future.notna().all(axis=1))
    maturity = grid.available_at.shift(-5)
    return x, target, maturity


def training_indices(x, target, maturity, tp, cutoff, window=1260):
    mask = x.notna().all(axis=1) & target.notna() & (maturity <= utc(cutoff))
    mask.iloc[:max(0, tp-window+1)] = False
    mask.iloc[tp:] = False
    return np.flatnonzero(mask.to_numpy())


def return_suffix(grid, tp, window=1260):
    ret = grid["return"].iloc[max(0, tp-window+1):tp+1]
    missing = np.flatnonzero(ret.isna().to_numpy())
    return ret.iloc[missing[-1]+1:] if len(missing) else ret


def qlike(actual, prediction):
    if not np.isfinite(actual) or actual < 0 or not np.isfinite(prediction):
        raise ValueError("QLIKE requires finite prediction and nonnegative finite target")
    return float(np.log(max(prediction, EPSILON)) + max(actual, EPSILON) / max(prediction, EPSILON))


def fit_models(grid, x, y, tp, train_idx, min_train=756):
    """Fit each model separately, with no fallback on failure."""
    results = {}
    if len(train_idx) < min_train:
        return {name: {"status": "insufficient_mature_labels", "prediction": None} for name in MODELS}
    suffix = return_suffix(grid, tp)
    xt = x.iloc[[tp]]
    def calculate(name):
        if name == "persistence5": return float(xt.sq5.iloc[0]), {}
        if name == "rolling21": return float(xt.sq21.iloc[0]), {}
        if name == "ewma094":
            if not len(suffix): raise ValueError("no contiguous returns")
            values = suffix.to_numpy() ** 2; value = values[0]
            for item in values[1:]: value = .94 * value + .06 * item
            return float(value), {"return_count": len(values)}
        if name == "garch11":
            if len(suffix) < 756: raise ValueError("insufficient contiguous returns for GARCH")
            fitted = arch_model(suffix.to_numpy() * 100, mean="Zero", vol="GARCH", p=1, q=1, dist="normal", rescale=False).fit(disp="off", show_warning=False)
            code = int(fitted.convergence_flag)
            if code != 0: return None, {"status": "nonconverged", "optimizer_code": code, "return_count": len(suffix)}
            variance = np.asarray(fitted.forecast(horizon=5, method="analytic").variance.iloc[-1], dtype=float)
            if len(variance) != 5: raise ValueError("unexpected GARCH forecast shape")
            return float(variance.mean() / 10000), {"optimizer_code": code, "return_count": len(suffix)}
        cols = BASE + EXTRA if name == "ridge_extended" else BASE
        train_x = x.iloc[train_idx][cols].to_numpy(); test_x = xt[cols].to_numpy()
        train_y = y.iloc[train_idx].to_numpy()
        if name == "har_ols": model = LinearRegression()
        elif name in ("ridge", "ridge_extended"): model = make_pipeline(StandardScaler(), Ridge(alpha=1.0))
        elif name == "random_forest": model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=1)
        else: raise ValueError("unknown model")
        model.fit(train_x, train_y)
        return float(model.predict(test_x)[0]), {}
    for name in MODELS:
        try:
            prediction, meta = calculate(name)
            if prediction is None: results[name] = {"prediction": None, **meta}; continue
            if not np.isfinite(prediction): raise ValueError("nonfinite prediction")
            results[name] = {"status": "ok", "prediction": prediction, **meta}
        except Exception as exc:
            results[name] = {"status": "failed", "prediction": None, "error_type": type(exc).__name__, "error": str(exc)}
    return results


def evaluate(grid, as_of, min_train=756, step=5, window=1260, progress=None):
    cutoff = utc(as_of); x, y, maturity = make_dataset(grid)
    rows, skipped = [], []
    for tp in range(21 + min_train + 5, len(grid), step):
        if progress is not None and ((tp - 21 - min_train - 5) // step) % 50 == 0: progress(tp, len(grid))
        decision = grid.available_at.iloc[tp]
        base = {"forecast_session": grid.index[tp].strftime("%Y-%m-%d"), "forecast_as_of": decision.isoformat()}
        if decision > cutoff or pd.isna(grid.close.iloc[tp]) or x.iloc[tp].isna().any():
            skipped.append({**base, "reason": "forecast_features_unavailable"}); continue
        idx = training_indices(x, y, maturity, tp, decision, window)
        if len(idx) < min_train:
            skipped.append({**base, "reason": "insufficient_mature_labels", "train_count": len(idx)}); continue
        if tp+5 >= len(grid) or pd.isna(y.iloc[tp]) or maturity.iloc[tp] > cutoff:
            skipped.append({**base, "reason": "target_unavailable", "train_count": len(idx)}); continue
        actual = float(y.iloc[tp]); regime = "high_recent_variance" if x.sq21.iloc[tp] > .0004 else "typical_recent_variance"
        metadata = {**base, "target_end": grid.index[tp+5].strftime("%Y-%m-%d"), "target_available_at": maturity.iloc[tp].isoformat(),
                    "feature_available_at": decision.isoformat(), "train_count": len(idx),
                    "train_window_start": grid.index[max(0,tp-window+1)].strftime("%Y-%m-%d"),
                    "train_first": grid.index[idx[0]].strftime("%Y-%m-%d"), "train_last": grid.index[idx[-1]].strftime("%Y-%m-%d"),
                    "latest_train_target_available_at": maturity.iloc[idx].max().isoformat(),
                    "latest_train_feature_available_at": grid.available_at.iloc[idx].max().isoformat(),
                    **{f"feature_{name}": float(x.iloc[tp][name]) for name in BASE + EXTRA},
                    "regime": regime, "recent_variance21": float(x.sq21.iloc[tp]), "actual": actual}
        for name, result in fit_models(grid, x, y, tp, idx, min_train).items():
            prediction = result.get("prediction")
            record = {**metadata, "model": name, **result}
            if result["status"] == "ok":
                record.update({"error_actual_minus_prediction": actual-prediction, "qlike": qlike(actual,prediction),
                               "prediction_floored_for_qlike": bool(prediction < EPSILON), "actual_floored_for_qlike": bool(actual < EPSILON)})
            rows.append(record)
    return rows, skipped
