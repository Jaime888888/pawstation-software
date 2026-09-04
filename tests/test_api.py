import unittest
from unittest.mock import patch

import requests

from api import PawStationAPI, PawStationAPIError


class PawStationAPITests(unittest.TestCase):
    @patch("api.requests.request")
    def test_status_request_uses_configured_device_and_timeout(self, request):
        response = request.return_value
        response.content = b'{"motor_on": false}'
        response.json.return_value = {"motor_on": False}

        result = PawStationAPI("192.168.1.50", timeout=2).get_status()

        self.assertEqual({"motor_on": False}, result)
        request.assert_called_once_with(
            "GET",
            "http://192.168.1.50:8080/status",
            json=None,
            timeout=2,
        )
        response.raise_for_status.assert_called_once_with()

    @patch("api.requests.request", side_effect=requests.Timeout("offline"))
    def test_transport_errors_use_the_domain_exception(self, _request):
        with self.assertRaisesRegex(PawStationAPIError, "Request failed"):
            PawStationAPI("192.168.1.50").get_daily()

    def test_empty_settings_are_rejected_without_a_request(self):
        with self.assertRaisesRegex(PawStationAPIError, "No settings"):
            PawStationAPI("192.168.1.50").update_settings()


if __name__ == "__main__":
    unittest.main()
