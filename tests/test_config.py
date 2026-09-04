import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import config


class ConfigTests(unittest.TestCase):
    def test_missing_or_invalid_config_uses_defaults(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "config.json"
            with patch.object(config, "CONFIG_PATH", path):
                self.assertEqual(config.DEFAULT_CONFIG, config.load_config())
                path.write_text("not json", encoding="utf-8")
                self.assertEqual(config.DEFAULT_CONFIG, config.load_config())

    def test_saved_values_round_trip_and_keep_new_defaults(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "config.json"
            with patch.object(config, "CONFIG_PATH", path):
                config.save_config({"pi_ip": "10.0.0.8"})
                loaded = config.load_config()

            self.assertEqual("10.0.0.8", loaded["pi_ip"])
            self.assertEqual(3, loaded["status_poll_seconds"])
            self.assertEqual({"pi_ip": "10.0.0.8"}, json.loads(path.read_text(encoding="utf-8")))


if __name__ == "__main__":
    unittest.main()
