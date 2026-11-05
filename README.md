# ML Stock Simulator

Educational simulator comparing 6- and 12-month forward-return forecasts for selected equities and SPY. This is not investment advice or a live trading system. Its scenarios are illustrations, not calibrated probabilities or validated coverage intervals.

## Setup

Requirements: Node.js 20.9 or later (Next.js 16), npm, Python 3.10 or later and pip. The captured experiment used Python 3.14.3; exact package versions are in the experiment manifests. Install Python dependencies in a virtual environment:

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r pipeline/requirements.txt pytest
npm ci
npm run dev
```

Open `http://localhost:3000/simulator`. Run the Python entry point directly with `python pipeline/simulate.py SPY 6` or `python pipeline/simulate.py AAPL 12`. It emits JSON. The API accepts `POST /api/simulate` with `ticker` and `horizonMonths`; it limits tickers to its allowlist and horizons to 6 or 12. Legacy `priceStats` fields `open`, `high` and `low` are derived from consecutive displayed closes, not market OHLC bars. The first displayed row references itself; its zero change is excluded from the UI average.

```bash
python -m pytest tests -q -p no:cacheprovider
npm run lint
npm run typecheck
npm run build
```

Yahoo Finance data retrieval requires network access. The test suite is offline. Pipeline dependency requirements are not locked; use versions in the manifests for reproduction. Node dependencies are locked in `package-lock.json`.

## Forecast and evaluation contract

Prices are adjusted monthly Yahoo bars. A monthly timestamp identifies a calendar period, not the time its final close became known. A bar is available at the start of the following calendar month in `America/New_York`, converted to UTC; actual exchange-close timestamps are unknown. Explicit availability metadata may delay that boundary but cannot move it earlier. A partial current month is excluded. Forecasts use available base prices, features and mature training labels; the target is percentage change from a month's close to the close exactly 6 or 12 calendar months later. No trade execution is modeled.

Features comprise the previous 12 monthly percentage returns and 3-, 6- and 12-month rolling means and standard deviations, shifted before use. Missing months are represented explicitly; no price forward-fill or return bridging occurs. Target endpoints must exist at the specified calendar month. ARIMA receives the latest contiguous suffix of available monthly returns; an empty suffix is unavailable. When fewer than 48 mature supervised labels or a current feature row are available, the simulator reports an error or skips a backtest fold rather than using future information. Candidate backtests are spaced six calendar months apart on a fixed calendar schedule. Audit metadata reports cutoffs, training counts and skipped reasons.

The old backtest trained on labels whose future endpoints had not yet occurred. The corrected evaluation purges those labels. Adjusted Yahoo history can change retrospectively, so this does not establish point-in-time corporate-action data. Backtest errors alone do not establish trading performance; overlapping forecast horizons produce correlated errors.

**ARIMA status:** The original implementation silently fell back to compounded historical means when ndarray forecast outputs lacked pandas attributes. The current implementation handles both array and pandas outputs, records the selected fit order and convergence status, and reports fallback when all fit attempts fail. A successful numerical fit does not guarantee optimizer convergence. Ridge and random-forest scenario spreads are heuristic, not validated coverage guarantees.

## Frozen comparison

The private SPY and AAPL snapshots, captured on 2026-11-05, are identified by SHA-256 in `experiments/leakage_audit/baseline/`. The last November bar was partial and is excluded from corrected evaluation. Both tickers had 9 original versus 8 corrected 6-month folds, and 8 original versus 6 corrected 12-month folds. The following temporal-only MAE/RMSE use **unrounded returns on common forecast dates only** and retain the original ARIMA fallback for isolation; original results are contaminated and do not represent valid out-of-sample performance.

| Data | Horizon | Common folds | Model | Original MAE / RMSE | Corrected MAE / RMSE |
| --- | ---: | ---: | --- | ---: | ---: |
| SPY | 6 | 8 | ARIMA fallback | 3.80 / 4.74 | 3.81 / 4.75 |
| SPY | 6 | 8 | Ridge | 5.23 / 6.01 | 6.48 / 7.05 |
| SPY | 6 | 8 | Random Forest | 5.09 / 5.36 | 6.43 / 7.47 |
| SPY | 12 | 6 | ARIMA fallback | 4.76 / 6.23 | 4.85 / 6.32 |
| SPY | 12 | 6 | Ridge | 12.78 / 15.13 | 14.39 / 17.19 |
| SPY | 12 | 6 | Random Forest | 8.29 / 9.18 | 11.44 / 12.68 |
| AAPL | 6 | 8 | ARIMA fallback | 16.50 / 19.34 | 16.51 / 19.28 |
| AAPL | 6 | 8 | Ridge | 17.69 / 20.96 | 20.86 / 24.83 |
| AAPL | 6 | 8 | Random Forest | 20.45 / 23.88 | 22.53 / 26.40 |
| AAPL | 12 | 6 | ARIMA fallback | 21.90 / 25.05 | 21.63 / 24.80 |
| AAPL | 12 | 6 | Ridge | 32.02 / 35.53 | 35.51 / 40.05 |
| AAPL | 12 | 6 | Random Forest | 20.28 / 22.44 | 23.22 / 26.45 |

Corrected ARIMA inputs also discard the first return when its preceding close is absent from the snapshot, and use a contiguous suffix after gaps; ARIMA differences are therefore not attributable solely to label purging. These small samples support no claim of significance.

After the separate ARIMA repair, common-date ARIMA MAE/RMSE were 4.31/5.84 (SPY 6m), 5.37/6.91 (SPY 12m), 16.27/20.72 (AAPL 6m), and 20.76/23.05 (AAPL 12m). Of the captured SPY fits, two 6m and one 12m did not converge; all AAPL fits reported convergence. The fitted model does not uniformly improve errors.

See [the audit](experiments/leakage_audit/README.md) for acquisition terms, snapshot hashes, raw predictions and errors, original failing-test evidence, settings and replay instructions. Snapshots are ignored and must be retained privately; a later Yahoo download is not identical. A separate [daily-volatility research experiment](experiments/volatility/README.md) evaluates a five-session variance proxy and does not use these return-forecast metrics.

## Dependency audit

The locked Next.js runtime was updated within major version 16 to address audited advisories. At the recorded check, `npm audit --omit=dev` reported zero vulnerabilities. The full audit still reported eight moderate dev-only findings through `eslint-config-next` and its `typescript-eslint` minimatch dependency ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)); npm's proposed forced downgrade was not applied. Review advisories again when updating dependencies.
