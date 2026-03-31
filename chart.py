from __future__ import annotations

from matplotlib.figure import Figure


def build_daily_figure(entries: list[dict], days_to_show: int) -> Figure:
    selected = list(reversed(entries[:days_to_show]))
    dates = [entry.get("date", "") for entry in selected]
    grams = [float(entry.get("grams", 0)) for entry in selected]

    figure = Figure(figsize=(7, 3.2), dpi=100)
    axis = figure.add_subplot(111)
    axis.bar(dates, grams)
    axis.set_title(f"Daily Feeding History ({days_to_show} days)")
    axis.set_xlabel("Date")
    axis.set_ylabel("Grams")
    axis.tick_params(axis="x", rotation=45)
    axis.grid(True, axis="y", alpha=0.3)
    figure.tight_layout()
    return figure
