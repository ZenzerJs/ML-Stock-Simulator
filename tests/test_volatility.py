import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "experiments" / "volatility"))
import research as v


def data(n=950, start="2017-01-01"):
    cal = v.xc.get_calendar("XNYS", start=start, end="2025-12-31")
    dates = cal.sessions[:n]
    x = np.arange(len(dates))
    returns = .003 * np.sin(x / 7) + .008 * np.cos(x / 19) + .001
    prices = 100 * np.exp(np.cumsum(returns))
    return pd.DataFrame({"session": dates.strftime("%Y-%m-%d"), "adjusted_close": prices})


def grid(frame, cutoff="2030-01-01T00:00:00Z"):
    return v.calendar_grid(frame, cutoff)


def test_target_is_mean_of_next_five_actual_sessions_in_log_squared_units():
    d = data(45); g = grid(d); _, target, maturity = v.make_dataset(g)
    expected = np.mean(np.diff(np.log(g.close.iloc[20:26])) ** 2)
    assert target.iloc[20] == pytest.approx(expected)
    assert maturity.iloc[20] == g.available_at.iloc[25]


def test_holiday_and_missing_session_not_compressed():
    d = data(300); g = grid(d)
    assert pd.Timestamp("2017-11-23") not in g.index
    assert pd.Timestamp("2017-11-24") in g.index
    missing = g.index[120]
    reduced = d[d.session != missing.strftime("%Y-%m-%d")]
    g = grid(reduced); _, target, _ = v.make_dataset(g)
    assert pd.isna(g.loc[missing, "close"])
    assert pd.isna(g["return"].iloc[120]) and pd.isna(g["return"].iloc[121])
    assert pd.isna(target.iloc[115])
    assert len(g) == len(d)


def test_partial_day_and_timezone_boundary():
    d = data(5); day = pd.Timestamp(d.session.iloc[-1]); boundary = (day + pd.Timedelta(days=1)).tz_localize("America/New_York").tz_convert("UTC")
    assert pd.isna(grid(d, boundary - pd.Timedelta(seconds=1)).close.iloc[-1])
    assert pd.notna(grid(d, boundary).close.iloc[-1])
    with pytest.raises(ValueError, match="timezone-aware"): grid(d, "2020-01-01")


def test_maturity_and_training_window():
    g = grid(data()); x, y, m = v.make_dataset(g); tp=850; cutoff=g.available_at.iloc[tp]
    idx = v.training_indices(x,y,m,tp,cutoff,window=100)
    assert len(idx) and max(m.iloc[idx]) <= cutoff
    assert idx.max() <= tp-5 and idx.min() >= tp-99


def test_model_fits_ignore_future_and_scale_only_training(monkeypatch):
    original = data(); changed = original.copy(); tp=850
    changed.loc[tp+1:, "adjusted_close"] *= 5
    g1, g2 = grid(original), grid(changed)
    x1,y1,m1 = v.make_dataset(g1); x2,y2,m2 = v.make_dataset(g2)
    cutoff=g1.available_at.iloc[tp]
    i1=v.training_indices(x1,y1,m1,tp,cutoff); i2=v.training_indices(x2,y2,m2,tp,cutoff)
    np.testing.assert_array_equal(i1, i2)
    recorded=[]; original_scaler=v.StandardScaler
    class InspectScaler(original_scaler):
        def fit(self, X, y=None, **kwargs):
            recorded.append(np.array(X)); return super().fit(X,y,**kwargs)
    monkeypatch.setattr(v, "StandardScaler", InspectScaler)
    first=v.fit_models(g1,x1,y1,tp,i1); second=v.fit_models(g2,x2,y2,tp,i2)
    for name in v.MODELS:
        assert first[name]["status"] == second[name]["status"]
        if first[name]["status"] == "ok": assert first[name]["prediction"] == pytest.approx(second[name]["prediction"], rel=1e-10, abs=1e-15)
    assert len(recorded) == 4
    np.testing.assert_allclose(recorded[0], x1.iloc[i1][v.BASE].to_numpy())
    np.testing.assert_allclose(recorded[1], x1.iloc[i1][v.BASE + v.EXTRA].to_numpy())


def test_insufficient_and_qlike_floor():
    g = grid(data(100)); x,y,m=v.make_dataset(g)
    result=v.fit_models(g,x,y,80,np.arange(10))
    assert all(r["status"] == "insufficient_mature_labels" for r in result.values())
    assert v.qlike(0,-1) == pytest.approx(np.log(v.EPSILON)+1)
    with pytest.raises(ValueError): v.qlike(-1, 1)
    with pytest.raises(ValueError): v.qlike(1, float("nan"))


def test_snapshot_hash_verification(tmp_path):
    import hashlib
    snapshot = tmp_path / "daily.csv"
    snapshot.write_text("session,adjusted_close\n2020-01-02,10\n")
    digest = hashlib.sha256(snapshot.read_bytes()).hexdigest()
    assert v.load_snapshot(snapshot, digest).adjusted_close.iloc[0] == 10
    snapshot.write_text("session,adjusted_close\n2020-01-02,11\n")
    with pytest.raises(ValueError, match="SHA-256 mismatch"):
        v.load_snapshot(snapshot, digest)
