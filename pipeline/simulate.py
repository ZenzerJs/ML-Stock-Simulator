#!/usr/bin/env python3
"""
ML Stock Simulator — Python Pipeline
Each model produces its own bearish / stable / bullish scenarios.
Usage:  python simulate.py <TICKER> <HORIZON_MONTHS>
Output: JSON to stdout
"""

import sys
import json
import warnings

warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import yfinance as yf
from statsmodels.tsa.arima.model import ARIMA
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor


# ── Data ────────────────────────────────────────────────────────

def fetch_data(ticker: str) -> pd.DataFrame:
    df = yf.download(ticker, period="10y", interval="1mo", progress=False)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    col = "Adj Close" if "Adj Close" in df.columns else "Close"
    df = df[[col]].rename(columns={col: "close"}).dropna()
    df["return_pct"] = df["close"].pct_change() * 100
    df = df.dropna()
    return df


# ── Features / Targets ─────────────────────────────────────────

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    feat = pd.DataFrame(index=df.index)
    ret = df["return_pct"]
    for lag in range(1, 13):
        feat[f"lag_{lag}"] = ret.shift(lag)
    for w in [3, 6, 12]:
        shifted = ret.shift(1)
        feat[f"roll_mean_{w}"] = shifted.rolling(w).mean()
        feat[f"roll_std_{w}"] = shifted.rolling(w).std()
    return feat


def build_targets(df: pd.DataFrame) -> dict:
    prices = df["close"]
    return {
        6: (prices.shift(-6) / prices - 1) * 100,
        12: (prices.shift(-12) / prices - 1) * 100,
    }


# ── Per-model scenario predictors ──────────────────────────────

def arima_scenarios(train_returns, horizon):
    """ARIMA: bearish/stable/bullish from forecast confidence intervals."""
    for order in [(2, 0, 2), (1, 1, 1), (1, 0, 1)]:
        try:
            model = ARIMA(train_returns, order=order)
            fitted = model.fit()
            fc = fitted.get_forecast(steps=horizon)
            mean_fc = fc.predicted_mean.values
            ci = fc.conf_int(alpha=0.2)
            lower = ci.iloc[:, 0].values
            upper = ci.iloc[:, 1].values
            bearish = float((np.prod(1 + lower / 100) - 1) * 100)
            stable = float((np.prod(1 + mean_fc / 100) - 1) * 100)
            bullish = float((np.prod(1 + upper / 100) - 1) * 100)
            return bearish, stable, bullish
        except Exception:
            continue
    m = float(np.mean(train_returns))
    c = ((1 + m / 100) ** horizon - 1) * 100
    return c * 0.5, c, c * 1.5


def ridge_scenarios(X_train, y_train, X_test, residual_std=None):
    """Ridge: bearish/stable/bullish from prediction ± residual spread."""
    model = Ridge(alpha=1.0)
    model.fit(X_train, y_train)
    pred = float(model.predict(X_test.reshape(1, -1))[0])
    if residual_std is None or residual_std == 0:
        residual_std = max(abs(pred) * 0.25, 2.0)
    bearish = pred - 1.28 * residual_std
    bullish = pred + 1.28 * residual_std
    return float(bearish), pred, float(bullish)


def rf_scenarios(X_train, y_train, X_test):
    """Random Forest: bearish/stable/bullish from individual tree spread."""
    model = RandomForestRegressor(n_estimators=200, random_state=42,
                                  n_jobs=-1)
    model.fit(X_train, y_train)
    tree_preds = np.array(
        [t.predict(X_test.reshape(1, -1))[0] for t in model.estimators_]
    )
    return (float(np.percentile(tree_preds, 10)),
            float(np.percentile(tree_preds, 50)),
            float(np.percentile(tree_preds, 90)))


# ── Walk-forward backtest ───────────────────────────────────────

def walk_forward_backtest(df, features, targets, horizon,
                          min_train=48, step=6):
    prices = df["close"].values
    returns = df["return_pct"].values
    dates = df.index
    feat_arr = features.values
    tgt_arr = targets[horizon].values

    valid = ~np.isnan(feat_arr).any(axis=1) & ~np.isnan(tgt_arr)
    vi = np.where(valid)[0]
    if len(vi) < min_train + step:
        return None, {}

    KEY = {"ARIMA": "arima", "Ridge Regression": "ridge",
           "Random Forest": "rf"}

    out = {n: {"actual_ret": [], "pred_ret": [],
               "actual_price": [], "pred_price": [], "dates": []}
           for n in KEY}
    residuals = {n: [] for n in KEY}

    for i in range(min_train, len(vi), step):
        tp = vi[i]
        if tp + horizon >= len(prices):
            break
        actual_ret = float(tgt_arr[tp])
        actual_price = float(prices[tp + horizon])
        base = float(prices[tp])
        tgt_idx = tp + horizon
        date_str = (str(dates[tgt_idx].date())[:7]
                    if tgt_idx < len(dates) else "?")

        # ARIMA — use stable (mean) prediction for single-point backtest
        _, ar_ret, _ = arima_scenarios(returns[:tp + 1], horizon)

        X_tr = feat_arr[vi[:i]]
        y_tr = tgt_arr[vi[:i]]
        X_te = feat_arr[tp]

        ridge_m = Ridge(alpha=1.0)
        ridge_m.fit(X_tr, y_tr)
        ri_ret = float(ridge_m.predict(X_te.reshape(1, -1))[0])

        rf_m = RandomForestRegressor(n_estimators=100, random_state=42,
                                     n_jobs=-1)
        rf_m.fit(X_tr, y_tr)
        rf_ret = float(rf_m.predict(X_te.reshape(1, -1))[0])

        for name, pred_ret in [("ARIMA", ar_ret),
                               ("Ridge Regression", ri_ret),
                               ("Random Forest", rf_ret)]:
            m = out[name]
            m["actual_ret"].append(round(actual_ret, 2))
            m["pred_ret"].append(round(pred_ret, 2))
            m["actual_price"].append(round(actual_price, 2))
            m["pred_price"].append(round(base * (1 + pred_ret / 100), 2))
            m["dates"].append(date_str)
            residuals[name].append(actual_ret - pred_ret)

    res_std = {n: float(np.std(r)) if len(r) > 1 else 0.0
               for n, r in residuals.items()}
    return out, res_std


def compute_metrics(bt):
    scores = []
    for name, d in bt.items():
        a, p = np.array(d["actual_ret"]), np.array(d["pred_ret"])
        if len(a) == 0:
            continue
        scores.append({
            "modelName": name,
            "mae": round(float(np.mean(np.abs(a - p))), 2),
            "rmse": round(float(np.sqrt(np.mean((a - p) ** 2))), 2),
        })
    return scores


# ── Chart builder ───────────────────────────────────────────────

def build_model_chart(current_price, scenarios_6, scenarios_12, sel_h):
    """Build monthly interpolated chart for one model's 3 scenarios."""
    chart = []
    b6, s6, u6 = scenarios_6
    b12, s12, u12 = scenarios_12

    bp6 = current_price * (1 + b6 / 100)
    sp6 = current_price * (1 + s6 / 100)
    up6 = current_price * (1 + u6 / 100)
    bp12 = current_price * (1 + b12 / 100)
    sp12 = current_price * (1 + s12 / 100)
    up12 = current_price * (1 + u12 / 100)

    for m in range(sel_h + 1):
        label = "Now" if m == 0 else f"+{m}m"
        if m == 0:
            pt = {"month": label,
                  "bearish": current_price,
                  "stable": current_price,
                  "bullish": current_price}
        elif sel_h == 6:
            t = m / 6
            pt = {"month": label,
                  "bearish": round(current_price + (bp6 - current_price) * t, 2),
                  "stable": round(current_price + (sp6 - current_price) * t, 2),
                  "bullish": round(current_price + (up6 - current_price) * t, 2)}
        else:
            if m <= 6:
                t = m / 6
                pt = {"month": label,
                      "bearish": round(current_price + (bp6 - current_price) * t, 2),
                      "stable": round(current_price + (sp6 - current_price) * t, 2),
                      "bullish": round(current_price + (up6 - current_price) * t, 2)}
            else:
                t = (m - 6) / 6
                pt = {"month": label,
                      "bearish": round(bp6 + (bp12 - bp6) * t, 2),
                      "stable": round(sp6 + (sp12 - sp6) * t, 2),
                      "bullish": round(up6 + (up12 - up6) * t, 2)}
        chart.append(pt)
    return chart


# ── Main ────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 3:
        json.dump({"error": "Usage: python simulate.py TICKER HORIZON"},
                  sys.stdout)
        sys.exit(1)

    ticker = sys.argv[1].upper()
    sel_h = int(sys.argv[2])
    if sel_h not in (6, 12):
        json.dump({"error": "Horizon must be 6 or 12"}, sys.stdout)
        sys.exit(1)

    try:
        df = fetch_data(ticker)
        if len(df) < 48:
            json.dump({"error": f"Not enough data ({len(df)} months)"},
                      sys.stdout)
            sys.exit(1)

        features = build_features(df)
        targets = build_targets(df)
        prices = df["close"].values
        returns = df["return_pct"].values
        dates = df.index
        current_price = float(prices[-1])
        feat_arr = features.values

        KEY = {"ARIMA": "arima", "Ridge Regression": "ridge",
               "Random Forest": "rf"}

        # ── Backtest (also collects residual std for Ridge) ────
        bt, res_std = walk_forward_backtest(df, features, targets, sel_h)
        model_scores = compute_metrics(bt) if bt else []

        bt_series = []
        if bt:
            n_folds = len(bt["ARIMA"]["dates"])
            for i in range(n_folds):
                pt = {"month": bt["ARIMA"]["dates"][i],
                      "actual": bt["ARIMA"]["actual_price"][i]}
                for name, key in KEY.items():
                    pt[key] = bt[name]["pred_price"][i]
                bt_series.append(pt)

        # ── Per-model scenarios at both horizons ───────────────
        model_forecasts = []

        for h in [6, 12]:
            tgt = targets[h].values
            ok = ~np.isnan(feat_arr).any(axis=1) & ~np.isnan(tgt)
            vi = np.where(ok)[0]
            X_all, y_all = feat_arr[vi], tgt[vi]

            last_feat = feat_arr[-1]
            if np.isnan(last_feat).any():
                last_feat = feat_arr[vi[-1]]

            # ARIMA
            ar_scen = arima_scenarios(returns, h)

            # Ridge (use residual_std from backtest for the selected horizon)
            ri_scen = ridge_scenarios(X_all, y_all, last_feat,
                                     res_std.get("Ridge Regression", None))

            # Random Forest
            rf_scen = rf_scenarios(X_all, y_all, last_feat)

            if h == 6:
                scen_6 = {"ARIMA": ar_scen, "Ridge Regression": ri_scen,
                          "Random Forest": rf_scen}
            else:
                scen_12 = {"ARIMA": ar_scen, "Ridge Regression": ri_scen,
                           "Random Forest": rf_scen}

        for name in ["ARIMA", "Ridge Regression", "Random Forest"]:
            s6 = scen_6[name]
            s12 = scen_12[name]
            chart = build_model_chart(current_price, s6, s12, sel_h)

            def to_price(r):
                return round(current_price * (1 + r / 100), 2)

            entry = {
                "name": name,
                "key": KEY[name],
                "scenarios": {
                    "6": {"bearish": round(s6[0], 2),
                          "stable": round(s6[1], 2),
                          "bullish": round(s6[2], 2),
                          "bearishPrice": to_price(s6[0]),
                          "stablePrice": to_price(s6[1]),
                          "bullishPrice": to_price(s6[2])},
                    "12": {"bearish": round(s12[0], 2),
                           "stable": round(s12[1], 2),
                           "bullish": round(s12[2], 2),
                           "bearishPrice": to_price(s12[0]),
                           "stablePrice": to_price(s12[1]),
                           "bullishPrice": to_price(s12[2])},
                },
                "chart": chart,
            }
            model_forecasts.append(entry)

        # ── Historical prices for chart (last 18 months) ──────
        hist_count = min(18, len(df))
        hist_slice = df.tail(hist_count)
        hist_prices = []
        for dt, row in hist_slice.iterrows():
            hist_prices.append({
                "month": str(dt.date())[:7],
                "price": round(float(row["close"]), 2),
            })

        # ── Price stats ────────────────────────────────────────
        rc = min(26 if sel_h <= 6 else 12, len(df))
        recent = df.tail(rc)
        pstats = []
        prev = None
        for dt, row in recent.iterrows():
            c = float(row["close"])
            o = prev if prev is not None else c
            ch = c - o
            pct = (ch / o * 100) if o else 0
            pstats.append({
                "period": str(dt.date())[:7],
                "open": round(o, 2), "close": round(c, 2),
                "high": round(max(c, o), 2), "low": round(min(c, o), 2),
                "change": round(ch, 2), "changePct": round(pct, 2),
            })
            prev = c

        # ── Output ─────────────────────────────────────────────
        json.dump({
            "metadata": {
                "ticker": ticker,
                "currentPrice": round(current_price, 2),
                "dateRange": (f"{str(dates[0].date())[:7]} to "
                              f"{str(dates[-1].date())[:7]}"),
                "nPoints": len(df),
            },
            "modelForecasts": model_forecasts,
            "modelScores": model_scores,
            "backtestSeries": bt_series,
            "historicalPrices": hist_prices,
            "priceStats": pstats,
        }, sys.stdout)

    except Exception as e:
        json.dump({"error": f"{type(e).__name__}: {e}"}, sys.stdout)
        sys.exit(1)


if __name__ == "__main__":
    main()
