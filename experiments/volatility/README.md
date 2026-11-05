# Daily variance research

This is a separate research experiment. It predicts the **mean of the next five XNYS-session squared close-to-close log returns**, in daily squared-log-return units. It is a realized-variance proxy, not intraday realized volatility, annualized volatility, a price-return forecast, or a trading strategy. The complete specification and parameters were fixed before evaluation in [CONTRACT.md](CONTRACT.md).

## Data, availability, and replay

SPY and AAPL each contain 2,513 adjusted daily prices from 2016-11-07 through 2026-11-05, obtained using yfinance 1.2.0. SPY acquisition completed at 2026-11-05 21:00:46.817511 UTC, AAPL at 21:00:47.187741 UTC. Their snapshot SHA-256 values are respectively `80039e82b365aa0cd8a904a2ad625d78575e6d7a72b655d26f77bf77909227bc` and `6c2c7028627b8728e936d1242182f85d4639eca116a1b0ea87ccaccda26519a1`. The 2026-11-05 bar is excluded under the next-New-York-midnight availability rule. Each calendar grid has one unavailable bar at acquisition and no other missing price. The exchange calendar includes holidays and early-close sessions; missing observations are not filled or compressed. Final targets require five actual future sessions, and training labels must have matured by each decision cutoff.

Snapshots are private and ignored; Yahoo data can be revised and may have redistribution restrictions. Respect Yahoo Finance's terms. `acquire.py` refuses to overwrite snapshot files and records UTC acquisition metadata. A fresh Yahoo download is **not** the same snapshot. Never load untrusted data or replace a frozen snapshot while claiming a replay.

A clean checkout with Python 3.14 and retained private CSVs plus matching acquisition manifests can reproduce the experiment without network access during evaluation:

```powershell
python -m venv experiments/volatility/.venv
experiments/volatility/.venv/Scripts/python -m pip install -r experiments/volatility/requirements.txt
# Place retained SPY_daily.csv, AAPL_daily.csv and *_acquisition.json in snapshots/.
experiments/volatility/.venv/Scripts/python experiments/volatility/run.py --ticker SPY
experiments/volatility/.venv/Scripts/python experiments/volatility/run.py --ticker AAPL
experiments/volatility/.venv/Scripts/python -m pytest tests -q -p no:cacheprovider
```

For new data acquisition only, use `python experiments/volatility/acquire.py`; its snapshot will have different hashes and results. The runner checks each snapshot against its acquisition hash and refuses to overwrite an existing per-ticker result directory. Use a separate clean checkout for a replay. This recorded run used Python 3.14.3, numpy 2.4.2, pandas 3.0.1, scipy 1.17.0, scikit-learn 1.8.0, arch 8.0.0 and exchange_calendars 4.13.2. All versions, acquisition information, config and source hashes are in each `results/*/manifest.json`. Captured local runs used task-isolated `.deps` for arch/calendar; Windows sandbox permissions on pip-created files required local escalation for those runs and tests. No network was used in evaluation. The full offline suite passed 23 tests, including the 16 existing monthly-pipeline tests.

## Design and metrics

Forecasts are issued after a completed daily bar; the conservative information boundary is midnight New York time at the start of the next calendar day, not the exchange's actual close. Every fifth XNYS session is a candidate. Training uses at least 756 mature labels from the latest 1,260-session window, refitted at each candidate. GARCH uses a contiguous suffix of at most 1,260 available returns, requires 756, fits zero-mean normal GARCH(1,1) on percentage log returns, averages five analytic conditional variances, then divides by 10,000. Optimizer nonconvergence and other failures are recorded separately; no model is substituted.

Benchmarks are five-session persistence, rolling 21-session mean, EWMA (lambda 0.94) and GARCH. HAR-style OLS, train-scaled Ridge, and fixed-seed Random Forest use the same 1/5/21 squared-return features. The fixed Ridge ablation adds three lagged squared returns and 5/21-session signed-return averages. It was specified before the run. Scalers fit only training rows.

Both tickers produced 345 evaluated folds, all eight models succeeded and every GARCH fit reported convergence, so all 345 dates are common to all models. Two candidates per ticker were skipped: 2026-10-29 had an unavailable future outcome, and 2026-11-05 had an unavailable current bar. `folds.csv` retains all model records, raw predictions and errors, feature values, cutoffs, training counts and statuses; `common.csv` contains only dates where every model succeeded; `skipped.json` preserves skipped candidates. Manifests include per-model and common-date metrics and regime counts. No model-failure dates were silently dropped in this run.

MAE/RMSE use unmodified raw variance predictions. QLIKE here is the declared variant `log(max(prediction, 1e-12)) + max(actual, 1e-12) / max(prediction, 1e-12)`. The floor applies only to QLIKE and floor counts are reported. All actuals were above the floor. No results imply statistical significance or profitability.

| Model | SPY MAE | SPY RMSE | SPY QLIKE | AAPL MAE | AAPL RMSE | AAPL QLIKE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Previous five | 0.00013318 | 0.00048078 | -7.70545 | 0.00032740 | 0.00082782 | -6.39180 |
| Rolling 21 | 0.00013094 | 0.00046371 | -8.08006 | 0.00031094 | 0.00073222 | -6.97395 |
| EWMA | 0.00012811 | 0.00043336 | -8.12503 | 0.00029482 | 0.00069476 | -7.01602 |
| GARCH(1,1) | 0.00012111 | 0.00043895 | -8.18264 | 0.00028097 | 0.00069043 | -7.03711 |
| HAR-style OLS | 0.00014873 | 0.00078393 | -8.15356 | 0.00029925 | 0.00076633 | -7.02723 |
| Ridge | 0.00014879 | 0.00078334 | -8.15361 | 0.00029923 | 0.00076617 | -7.02726 |
| Random Forest | 0.00013384 | 0.00046980 | -8.09567 | 0.00034365 | 0.00078950 | -6.87861 |
| Extended Ridge | 0.00015683 | 0.00084312 | 7911094.06850 | 0.00029819 | 0.00073000 | -6.91353 |

GARCH had lower aggregate MAE than EWMA and the ML models for both instruments in this sample; SPY EWMA had slightly lower RMSE than GARCH. The added-feature Ridge ablation worsened SPY MAE/RMSE and produced 14 negative variance predictions, which were floored for QLIKE only; 11 occurred in typical and three in high-recent-variance periods. This causes its exceptionally large SPY QLIKE. For AAPL, extended Ridge slightly improved MAE/RMSE over base Ridge but worsened QLIKE. No other predictions or targets were floored. This is a diagnostic of an unconstrained regression, not evidence for a tuned remedy.

The predeclared descriptive regime uses only variance known at forecast time: 21-session mean squared return above 0.0004 is high recent variance. SPY had 330 typical and 15 high-regime folds; AAPL had 252 and 93. SPY Ridge MAE was 0.00008668 typical versus 0.00151516 high; GARCH was 0.00008000 versus 0.00102534. AAPL Ridge MAE was 0.00019472 versus 0.00058241; GARCH was 0.00018641 versus 0.00053720. The high groups are small, especially SPY, and these figures do not establish a causal explanation.

A concrete failure: on 2020-03-16, the SPY Ridge forecast was 0.01458497 against actual next-five-session mean squared return 0.00161616 (actual minus forecast -0.01296881); five-session persistence predicted 0.00706303. For AAPL on 2020-03-09, Ridge predicted 0.00143458 against actual 0.00973313 (error +0.00829855); persistence predicted 0.00223049. These examples are descriptive selections of the largest absolute Ridge errors, not tuning evidence.

Adjusted historical prices are revised retrospectively, the experiment covers two assets and one fixed data vintage, and refitted forecasts share overlapping training histories. Even with nonoverlapping five-session target windows, errors are not guaranteed independent. Calendar metadata and conservative availability do not guarantee historical point-in-time prices. More assets, alternate vintages, longer samples and carefully designed uncertainty estimates would be needed before generalization.
