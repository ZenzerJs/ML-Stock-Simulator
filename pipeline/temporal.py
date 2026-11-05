"""Calendar-based availability for monthly observations.

Yahoo's month-start index is a period label, not a close timestamp.  In the
absence of explicit availability metadata, midnight New York time at the
start of the next calendar month is the conservative availability boundary.
"""
import numpy as np
import pandas as pd


def utc_time(value):
    ts = pd.Timestamp(value)
    if ts.tzinfo is None:
        raise ValueError("Availability timestamps must include a timezone")
    return ts.tz_convert("UTC")


def prepare_monthly(df, as_of):
    """Return an unfilled monthly grid, with unavailable closes removed."""
    cutoff = utc_time(as_of)
    src = df.copy()
    dates = pd.DatetimeIndex(src.index)
    # Preserve local calendar label; do not convert the label to UTC first.
    if dates.tz is not None:
        dates = dates.tz_localize(None)
    periods = dates.to_period("M")
    if periods.has_duplicates:
        raise ValueError("Multiple bars for one calendar month")
    src.index = periods.to_timestamp()
    src = src.sort_index().reindex(pd.date_range(src.index.min(), src.index.max(), freq="MS"))
    default = pd.DatetimeIndex(src.index + pd.offsets.MonthBegin(1)).tz_localize("America/New_York").tz_convert("UTC")
    availability = pd.Series(default, index=src.index)
    if "available_at" in src:
        explicit = pd.to_datetime(src["available_at"], utc=True, errors="raise")
        # Metadata may delay availability but cannot establish an early
        # final exchange close from a monthly bar alone.
        availability = pd.concat([availability, explicit], axis=1).max(axis=1)
    src["available_at"] = availability
    src.loc[src.available_at > cutoff, "close"] = np.nan
    # Never bridge a missing month, and don't trust a vendor-derived return.
    src["return_pct"] = (src.close / src.close.shift(1) - 1) * 100
    return src


def feature_available_at(df):
    # Twelve lagged returns need closes from t-13 through t-1.
    values = pd.concat([df.available_at.shift(i) for i in range(1, 14)], axis=1)
    return values.max(axis=1).where(values.notna().all(axis=1))


def target_available_at(df, horizon):
    endpoint = df.available_at.shift(-horizon)
    return pd.concat([df.available_at, endpoint], axis=1).max(axis=1).where(endpoint.notna())
