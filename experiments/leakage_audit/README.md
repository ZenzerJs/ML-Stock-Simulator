# Temporal leakage audit: original baseline

This records the uncorrected code at commit `3b4030eda5acb80528bfe43d5897fc299bc30122`. Baseline metrics are contaminated by target look-ahead and are not valid out-of-sample performance estimates. Baseline evidence was captured before simulator source changes.

## Contract chosen before correction

A forecast is issued after the final trading session's monthly close is known. The timestamp on a Yahoo monthly bar labels its month, not its availability. A current partial month is unavailable. For each bar, derive its calendar period and actual close/availability time; use feature values and labels only when their actual availability is at or before the forecast cutoff. Label maturity is the availability of its actual endpoint bar. A six- or twelve-month target must refer to that calendar month, not the sixth or twelfth observed row. Missing months must not be bridged by returns, lags, rolling windows, or target endpoints. Forecast execution, if later implemented, is no earlier than the next tradable session. Adjusted historical prices may be retrospectively revised and are not point-in-time data; this experiment cannot establish vintage integrity.

Retain `min_train=48` **mature labels** and `step=6` before corrected evaluation; 48 preserves the original minimum and requires skipping forecasts that do not meet it. Maintain calendar-based forecast cutoffs and compare only common forecast dates separately from total fold counts. Original folds, dates and metrics remain unchanged in the baseline even when the final bar is partial.

## Observed implementation

`build_features` uses the previous 12 monthly returns and 3/6/12 rolling statistics of returns shifted by one row. `build_targets` uses `shift(-6)` and `shift(-12)` on prices. With missing months these are observed-row horizons, not calendar horizons. `walk_forward_backtest` selects `vi[:i]` without checking when targets mature; `vi` has already been filtered for complete features and labels. ARIMA receives returns through the forecast bar. At the final forecast the code selects all currently complete targets, but it also consumes the last bar, which can be partial. The two-hour cache can also be stale or contain a partial bar. Full-array scenario and backtest residual paths require the same availability contract.

API accepts only listed tickers and horizon 6 or 12, and returns pipeline JSON or an error; corrected output adds `temporalAudit` while preserving existing keys. Chart values interpolate scenarios; forecast spans and scenario spreads are not proven coverage. The original README incorrectly referenced `train.py`, technical indicators and 1/3-month horizons; the root README now reflects the implementation.

Offline regression against the unmodified function:

```text
python -m pytest tests/test_temporal_integrity.py -q --tb=short -p no:cacheprovider
FAILED [6]: forecast=2015-02, training=2015-01, label_end=2015-07 (5 immature labels)
FAILED [12]: forecast=2015-02, training=2015-01, label_end=2016-01 (11 immature labels)
```

The test intercepts actual `Ridge.fit` and `predict` feature rows, maps them to unique source dates, and verifies label maturity; ARIMA and RF are replaced only to isolate selection. These failures were captured before correction; the same invariant now passes.

## Frozen inputs and replay

SPY and AAPL were chosen as liquid, widely traded instruments. Snapshots are private, ignored pandas pickles from `yf.Ticker(ticker).history(period="10y", interval="1mo", auto_adjust=True)` followed by the **original** `_normalize_yahoo_df`. They contain normalized close and percentage return; missing-value and initial-return removal follow original behavior. Snapshot fetch occurred 2026-11-05 around 15:36–15:37 America/New_York; both have 119 rows from 2017-01 through 2026-11, no missing calendar months within that interval, and a partial final November bar. Exact acquisition time is not available; file modification time records local capture time. Yahoo can revise adjusted histories; a later download is not the same input. Respect Yahoo Finance terms and redistribution restrictions; do not commit or redistribute vendor data. Snapshot hashes are recorded in manifests. Pickle is unsafe from untrusted sources: only load trusted local files.

```text
python experiments/leakage_audit/baseline_capture.py fetch --ticker SPY
python experiments/leakage_audit/baseline_capture.py run --ticker SPY
python experiments/leakage_audit/baseline_capture.py fetch --ticker AAPL
python experiments/leakage_audit/baseline_capture.py run --ticker AAPL
```

Fetch refuses to overwrite an existing snapshot. Preserve the private snapshot and check its SHA-256 against the manifest before comparisons; `run` never downloads. The capture loads the original Git blob by commit, verifies its SHA-256 and refuses to overwrite baseline outputs. It uses original functions and hyperparameters, intercepting raw predictions; it uses joblib's sequential backend because this Windows sandbox denies creation of worker synchronization objects. This affects execution strategy, not RF's fixed seed or model settings. Manifests record versions and metrics as returned by original `compute_metrics`, which rounds predicted and actual returns to two decimals first. CSVs retain unrounded predictions, actuals, errors and per-model training counts: ARIMA uses return observations, Ridge/RF use supervised rows. Exact floating-point results may vary with platform or package versions.

Original ARIMA warning: ndarray forecasts made the original function fail on `.values`/`.iloc`, with exceptions swallowed. Every original captured ARIMA result matches the historical-mean fallback. Temporal-only replay preserves that behavior; repaired-production results use array-compatible extraction. Fit status and optimizer convergence are reported separately, since a numerical fit can fail to converge.

## Implemented correction

Calendar periods and conservative availability are explicit; partial bars are excluded, features and targets use a monthly grid, and training rows are filtered by feature and label availability at each cutoff. Final scenarios use the same eligibility rules. Tests cover gaps, boundaries, future perturbations and insufficient samples. No model settings were tuned against outcomes.

Pinned-source replay of SPY reproduced both reported metric sets and per-model counts. Maximum raw prediction difference after CSV round-trip was 1.8e-15. The committed source blob hash is `aaa24490da11d8bfd24bf463bc48c1b7bbb529fd73750bd68adfccaa4c5a5b92`; the working-tree file has CRLF line endings and therefore a different byte hash. Initial acquisition and run timestamps were not recorded exactly; manifest values are explicitly approximate.

## Corrected evaluation

`corrected_capture.py` verifies both private snapshot hashes against baseline manifests, evaluates both horizons at `2026-11-05T20:37:00Z`, refuses to overwrite existing mode outputs, and records modified source-file hashes, versions, raw predictions, errors, skips and common-date comparisons. Preserve existing results; move or use a fresh checkout for another run. `temporal` injects the SHA-verified original ARIMA function; `repaired` runs current production ARIMA. The base snapshot's November bar is partial and excluded. A new Yahoo download must never silently replace the snapshot.

```text
python experiments/leakage_audit/corrected_capture.py --mode temporal
python experiments/leakage_audit/corrected_capture.py --mode repaired
```

The fixed calendar schedule begins after the original 12-month warmup and advances six months independently of future target completeness. Corrected forecasts need at least 48 mature labels. SPY and AAPL each had 8 common 6-month dates and 6 common 12-month dates; see the root README and corrected manifests for MAE/RMSE. The root README table uses raw returns, whereas original reported metrics in baseline manifests use original two-decimal rounding. ARIMA retains its old fallback math, but its input may differ: the first normalized return is omitted because its prior close is not in the snapshot, and missing/unavailable months split the return series. This is an availability correction, not an isolated change to ARIMA's estimation algorithm. Snapshot vintage and overlapping-horizon limitations remain.

The `temporal_final/` replay matched every stage-one prediction exactly before the superseded intermediate directory was removed. `repaired/` contains the separately repaired ARIMA results. SPY recorded two nonconverged 6-month fits and one nonconverged 12-month fit; all AAPL fits reported convergence. A fit status records numerical output, not validation. All comparison artifacts retain identical snapshot hashes and common target actuals.
