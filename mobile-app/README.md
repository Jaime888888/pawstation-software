# PawStation Mobile App

This folder contains the actual app implementation that follows the project software specification:

- user enters the Raspberry Pi IP address
- app calls `GET /status` every few seconds
- app loads `GET /daily` for feeding history
- app sends `POST /settings` to save feed time and target amount
- app sends `POST /dispense` for manual feeding
- app disables manual feed while `motor_on` is true
- app shows offline and error feedback
- app includes the separate camera module stream at `https://pawstation-cam.local/stream`

## Stack

- Expo
- React Native
- AsyncStorage
- react-native-webview

## Local setup

```bash
cd mobile-app
npm install
npx expo start
```

Then open the Expo Go app on your phone or run an emulator.

## Important network notes

The phone must be on the same Wi-Fi or hotspot as the Raspberry Pi. The Raspberry Pi API uses `http://<PI_IP>:8080`, so this app enables local-network and cleartext HTTP access in Expo config. The camera stream is loaded separately from `https://pawstation-cam.local/stream`.

If the embedded camera stream does not load inside the app, use the `Open Stream` button to open it externally in the phone browser.
