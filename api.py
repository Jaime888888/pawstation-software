from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests

DEFAULT_TIMEOUT = 5


class PawStationAPIError(Exception):
    """Raised when the PawStation device cannot be reached or returns invalid data."""


@dataclass
class PawStationAPI:
    pi_ip: str
    port: int = 8080
    timeout: int = DEFAULT_TIMEOUT

    @property
    def base_url(self) -> str:
        return f"http://{self.pi_ip}:{self.port}"

    def _request(self, method: str, endpoint: str, json_body: dict[str, Any] | None = None) -> Any:
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.request(method, url, json=json_body, timeout=self.timeout)
            response.raise_for_status()
            if response.content:
                return response.json()
            return {"ok": True}
        except requests.RequestException as exc:
            raise PawStationAPIError(f"Request failed: {exc}") from exc
        except ValueError as exc:
            raise PawStationAPIError("Device returned invalid JSON.") from exc

    def get_status(self) -> dict[str, Any]:
        return self._request("GET", "/status")

    def get_daily(self) -> dict[str, Any]:
        return self._request("GET", "/daily")

    def update_settings(
        self,
        feed_hour: int | None = None,
        feed_min: int | None = None,
        target_g: float | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        if feed_hour is not None:
            payload["feed_hour"] = int(feed_hour)
        if feed_min is not None:
            payload["feed_min"] = int(feed_min)
        if target_g is not None:
            payload["target_g"] = float(target_g)
        if not payload:
            raise PawStationAPIError("No settings were provided.")
        return self._request("POST", "/settings", json_body=payload)

    def dispense(self) -> dict[str, Any]:
        return self._request("POST", "/dispense")
