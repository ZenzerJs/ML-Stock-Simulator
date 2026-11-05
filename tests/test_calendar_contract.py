from pathlib import Path
import sys
import numpy as np
import pandas as pd
import pytest
from joblib import parallel_backend
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
import simulate
from temporal import prepare_monthly


def fixture(count=115):
    index = pd.date_range("2010-01-01", periods=count, freq="MS")
    x = np.arange(count)
    return pd.DataFrame({"close": 100 * np.exp(x * .005 + .03 * np.sin(x / 4))}, index=index)


def prepared(df, cutoff="2030-01-01T00:00:00Z"):
    df = prepare_monthly(df, pd.Timestamp(cutoff))
    return df, simulate.build_features(df), simulate.build_targets(df)


@pytest.mark.parametrize("h", [6, 12])
def test_missing_calendar_month_does_not_bridge(h):
    raw = fixture().drop(pd.Timestamp("2015-05-01"))
    df, features, targets = prepared(raw)
    assert pd.isna(df.loc["2015-05-01", "close"])
    assert pd.isna(df.loc["2015-06-01", "return_pct"])
    assert features.loc["2015-06-01":"2016-06-01"].isna().any(axis=1).all()
    assert pd.isna(targets[h].loc[pd.Timestamp("2015-05-01") - pd.DateOffset(months=h)])
    assert targets[h].loc["2015-04-01"] == pytest.approx((df.close.loc[pd.Timestamp("2015-04-01") + pd.DateOffset(months=h)] / df.close.loc["2015-04-01"] - 1) * 100)


def test_month_boundary_and_explicit_availability():
    raw = fixture(2)
    before = prepare_monthly(raw, pd.Timestamp("2010-02-01T04:59:59Z"))
    after = prepare_monthly(raw, pd.Timestamp("2010-02-01T05:00:00Z"))
    assert pd.isna(before.close.iloc[0]); assert pd.notna(after.close.iloc[0])
    raw["available_at"] = ["2010-02-02T00:00:00Z", "2010-03-02T00:00:00Z"]
    assert pd.isna(prepare_monthly(raw, pd.Timestamp("2010-02-01T05:00:00Z")).close.iloc[0])
    raw.loc[raw.index[0], "available_at"] = "2010-01-15T12:00:00Z"
    assert pd.isna(prepare_monthly(raw, pd.Timestamp("2010-01-16T00:00:00Z")).close.iloc[0])


@pytest.mark.parametrize("h", [6, 12])
def test_future_changes_do_not_change_past_or_final_scenarios(h):
    raw = fixture()
    cutoff = pd.Timestamp("2018-07-01T04:00:00Z")
    changed = raw.copy(); changed.loc["2018-07-01":, "close"] *= 7
    with parallel_backend("sequential"):
        outputs = []
        for data in (raw, changed):
            df, f, t = prepared(data, cutoff.isoformat())
            bt, _, audit = simulate.walk_forward_backtest(df, f, t, h, evaluation_as_of=cutoff)
            scenarios, final, _ = simulate.final_scenarios(df, f, t, h, cutoff)
            outputs.append((bt, audit, scenarios, final))
    assert outputs[0] == outputs[1]


def test_insufficient_mature_labels_skips_and_final_errors():
    df, f, t = prepared(fixture(65))
    bt, _, audit = simulate.walk_forward_backtest(df, f, t, 12, evaluation_as_of=pd.Timestamp("2030-01-01T00:00:00Z"))
    assert not bt["ARIMA"]["raw"]
    assert any(x.get("reason") == "insufficient mature training labels" for x in audit)
    with pytest.raises(ValueError, match="Insufficient mature"):
        simulate.final_scenarios(df, f, t, 12, pd.Timestamp("2015-06-01T04:00:00Z"))


def test_audit_availability_and_counts():
    df, f, t = prepared(fixture())
    with parallel_backend("sequential"):
        bt, _, audit = simulate.walk_forward_backtest(df, f, t, 6, evaluation_as_of=pd.Timestamp("2030-01-01T00:00:00Z"))
    assert any(x["status"] == "evaluated" for x in audit)
    for x in audit:
        if x["status"] != "evaluated": continue
        cutoff = pd.Timestamp(x["forecast_as_of"])
        assert pd.Timestamp(x["latest_feature_available_at"]) <= cutoff
        assert pd.Timestamp(x["latest_training_label_available_at"]) <= cutoff
        assert pd.Timestamp(x["latest_training_feature_available_at"]) <= cutoff
        assert x["supervised_train_count"] >= 48
    assert bt["ARIMA"]["raw"][0]["train_count"] == audit[next(i for i, x in enumerate(audit) if x["status"] == "evaluated")]["arima_return_count"]


def test_delayed_prior_close_and_gap_use_contiguous_returns():
    raw = fixture(25).drop(pd.Timestamp("2010-10-01"))
    raw["available_at"] = pd.NaT
    raw["available_at"] = raw["available_at"].astype(object)
    raw.loc["2011-04-01", "available_at"] = "2012-01-01T00:00:00Z"
    df, _, _ = prepared(raw)
    tp = df.index.get_loc(pd.Timestamp("2011-08-01"))
    returns = simulate.contiguous_returns(df, tp, pd.Timestamp("2011-09-01T04:00:00Z"))
    # April delayed: both April and May returns unavailable; June-August remain.
    np.testing.assert_allclose(returns, df.loc["2011-06-01":"2011-08-01", "return_pct"])
    changed = df.copy(); changed.loc["2011-04-01", "close"] *= 5
    changed["return_pct"] = changed.close.pct_change(fill_method=None) * 100
    np.testing.assert_allclose(returns, simulate.contiguous_returns(changed, tp, pd.Timestamp("2011-09-01T04:00:00Z")))


@pytest.mark.parametrize("h", [6, 12])
def test_delayed_forecast_bar_does_not_score_known_outcome(h):
    raw = fixture(115)
    # First candidate is January 2015; force availability past its target.
    raw["available_at"] = pd.NaT
    raw["available_at"] = raw["available_at"].astype(object)
    raw.loc["2015-01-01", "available_at"] = (pd.Timestamp("2015-01-01", tz="UTC") + pd.DateOffset(months=h+2)).isoformat()
    df, f, t = prepared(raw)
    with parallel_backend("sequential"):
        _, _, audit = simulate.walk_forward_backtest(df, f, t, h, evaluation_as_of=pd.Timestamp("2030-01-01T00:00:00Z"))
    row = next(x for x in audit if x["forecast_bar"] == "2015-01-01")
    assert row["reason"] == "target already available at forecast cutoff"


def test_main_json_contract(monkeypatch, capsys):
    import json
    raw = fixture()
    current_month = pd.Timestamp.now(tz="America/New_York").tz_localize(None).to_period("M").to_timestamp()
    raw.index = pd.date_range(end=current_month - pd.DateOffset(months=1), periods=len(raw), freq="MS")
    monkeypatch.setattr(simulate, "fetch_data", lambda ticker: raw)
    monkeypatch.setattr(sys, "argv", ["simulate.py", "SPY", "6"])
    with parallel_backend("sequential"):
        simulate.main()
    result = json.loads(capsys.readouterr().out)
    assert {"metadata", "modelForecasts", "modelScores", "backtestSeries", "historicalPrices", "priceStats", "temporalAudit"} <= result.keys()
    assert result["metadata"]["ticker"] == "SPY"
    assert {entry["key"] for entry in result["modelForecasts"]} == {"arima", "ridge", "rf"}
    assert set(result["temporalAudit"]["final"]) == {"6", "12"}
