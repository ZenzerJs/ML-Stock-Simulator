import numpy as np
import pandas as pd
import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
import simulate

@pytest.mark.parametrize("pandas_input", [False, True])
def test_real_arima_fit_supports_numpy_and_pandas(pandas_input):
    data = np.sin(np.arange(72) / 4) + np.cos(np.arange(72) / 7) * .3
    data = pd.Series(data) if pandas_input else data
    info = {}
    bearish, stable, bullish = simulate.arima_scenarios(data, 6, info)
    assert info["status"] == "fit"
    assert info["converged"] in (True, False, None)
    assert info["order"] in [[2,0,2], [1,1,1], [1,0,1]]
    assert np.isfinite([bearish, stable, bullish]).all()
    assert bearish <= stable <= bullish
    fallback = ((1 + data.mean() / 100) ** 6 - 1) * 100
    assert not np.isclose(stable, fallback, rtol=1e-6, atol=1e-6)


def test_negative_fallback_order_and_status(monkeypatch):
    def fail(*args, **kwargs): raise RuntimeError("forced fit failure")
    monkeypatch.setattr(simulate, "ARIMA", fail)
    info = {}
    bearish, stable, bullish = simulate.arima_scenarios(np.full(48, -1.), 6, info)
    assert bearish <= stable <= bullish < 0
    assert info["status"] == "fallback"
    assert len(info["failed_attempts"]) == 3
