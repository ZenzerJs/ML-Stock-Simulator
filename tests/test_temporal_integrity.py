import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
import simulate

@pytest.mark.parametrize("horizon", [6, 12])
def test_training_labels_mature_at_forecast(horizon, monkeypatch):
    dates = pd.date_range("2010-01-01", periods=100, freq="MS")
    prices = 100 * np.exp(np.arange(100) * 0.01 + np.sin(np.arange(100)) * 0.01)
    df = pd.DataFrame({"close": prices}, index=dates)
    df["return_pct"] = df.close.pct_change() * 100
    features, targets = simulate.build_features(df), simulate.build_targets(df)
    seen, forecast_rows = [], []
    original_predict = simulate.Ridge.predict
    def inspect_predict(self, X, *args, **kwargs):
        forecast_rows.append(np.array(X[0], copy=True))
        return original_predict(self, X, *args, **kwargs)
    monkeypatch.setattr(simulate.Ridge, "predict", inspect_predict)
    original_fit = simulate.Ridge.fit
    def inspect_fit(self, X, y, *args, **kwargs):
        seen.append(np.array(X, copy=True))
        return original_fit(self, X, y, *args, **kwargs)
    monkeypatch.setattr(simulate.Ridge, "fit", inspect_fit)
    monkeypatch.setattr(simulate, "arima_scenarios", lambda *args: (0, 0, 0))
    class StubForest:
        def __init__(self, **kwargs): pass
        def fit(self, X, y): return self
        def predict(self, X): return np.zeros(len(X))
    monkeypatch.setattr(simulate, "RandomForestRegressor", StubForest)
    simulate.walk_forward_backtest(df, features, targets, horizon, min_train=48, step=6)
    forecast_matches = np.flatnonzero(np.all(np.isclose(features.to_numpy(), forecast_rows[0], rtol=0, atol=1e-12), axis=1))
    assert len(forecast_matches) == 1
    forecast = forecast_matches[0]
    # Identify rows actually passed to the first fit, independent of selection policy.
    selected = []
    for row in seen[0]:
        matches = np.flatnonzero(np.all(np.isclose(features.to_numpy(), row, rtol=0, atol=1e-12), axis=1))
        assert len(matches) == 1
        selected.append(matches[0])
    immature = [p for p in selected if dates[p + horizon] > dates[forecast]]
    assert not immature, (f"forecast={dates[forecast]:%Y-%m}, "
        f"training={dates[immature[-1]]:%Y-%m}, "
        f"label_end={dates[immature[-1] + horizon]:%Y-%m}, count={len(immature)}")
