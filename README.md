# PawStation Desktop Client

This repository contains a simple Python desktop client for the PawStation feeder API. It follows the project software spec by connecting to the Raspberry Pi over the local network and supports:

- saving the Raspberry Pi IP address locally
- polling `GET /status`
- loading `GET /daily`
- sending `POST /settings`
- sending `POST /dispense`
- disabling manual feed while the motor is on
- showing offline and error feedback
- displaying a daily feeding history chart

## Files

- `main.py` - app entry point
- `ui.py` - UI export module
- `desktop_app.py` - main desktop UI
- `api.py` - REST API client
- `chart.py` - matplotlib chart helper
- `config.py` - local config helpers
- `requirements.txt` - Python dependencies

## Setup

```bash
python -m venv venv
venv\\Scripts\\activate
pip install -r requirements.txt
python main.py
```

## Notes

This is a desktop implementation for laptop or Windows use. If the team later needs a mobile app, the same API behavior can be reused as the reference frontend flow.
