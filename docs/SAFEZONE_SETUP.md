# Safe Zone Background Setup

This file documents platform-specific steps to enable background location monitoring and notifications for the Safe Zone feature.

Android

- Ensure `app.json` includes the `foregroundService` block under `android` (already present).
- For Android 10+ ensure `ACCESS_BACKGROUND_LOCATION` is requested when starting background updates. Expo will prompt when calling `Location.requestBackgroundPermissionsAsync()`.
- In `android/app/src/main/AndroidManifest.xml` (bare workflow) add:

```xml
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

- If using Expo managed, follow Expo docs to `expo prebuild` and edit `android/app/src/main/AndroidManifest.xml`.

iOS

- `NSLocationWhenInUseUsageDescription` and `NSLocationAlwaysAndWhenInUseUsageDescription` must be present in `app.json` -> `ios.infoPlist` (already added).
- For background location add `location` to UIBackgroundModes in Info.plist when using a bare app.

Notifications

- Request notification permissions via `expo-notifications` before scheduling notifications.

Testing

- On device, enable Location and Notification permissions. Background geolocation behavior differs between iOS and Android; test on both.

Voice Alerts (ElevenLabs)

- ElevenLabs TTS should be invoked from a secure server or via an SDK with appropriate credentials. Avoid shipping secrets in the app.
