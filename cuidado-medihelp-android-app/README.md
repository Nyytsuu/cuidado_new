# Cuidado Medihelp Android App

This is an Android Studio + Kotlin wrapper for the Cuidado Medihelp frontend. It uses the same backend/database as the website.

## How it works

- Android app: Kotlin WebView shell
- Frontend: `cuidado-medihelp-frontend-app`
- Backend: existing `backend` folder from the website project
- Database: same MySQL database used by the website

This avoids duplicating backend/database logic. The Android app only displays the frontend and provides Android-specific support such as microphone permission and a native speech recognition bridge.

## Open in Android Studio

1. Open Android Studio.
2. Choose **Open**.
3. Select this folder:

```text
C:\Users\Railee\OneDrive\Desktop\cuidado-medihelp\cuidado-medihelp-android-app
```

4. Let Android Studio sync Gradle.
5. Choose an emulator.
6. Press **Run**.

## Run the shared backend

In PowerShell:

```powershell
cd C:\Users\Railee\OneDrive\Desktop\cuidado-medihelp\backend
npm install
node server.js
```

Backend should run at:

```text
http://localhost:5000
```

## Run the frontend for the Android emulator

In another PowerShell terminal:

```powershell
cd C:\Users\Railee\OneDrive\Desktop\cuidado-medihelp\cuidado-medihelp-frontend-app
npm install
copy .env.example .env
```

Edit `.env` and set:

```text
VITE_API_BASE_URL=http://10.0.2.2:5000
```

Then run:

```powershell
npm run dev
```

The Android emulator loads:

```text
http://10.0.2.2:5173
```

`10.0.2.2` is Android emulator shorthand for your computer's `localhost`.

## Physical phone setup

If you test on a real Android phone, use your computer's Wi-Fi IP address instead of `10.0.2.2`.

Example:

```text
VITE_API_BASE_URL=http://192.168.1.20:5000
```

Then update `app/build.gradle.kts`:

```kotlin
buildConfigField(
    "String",
    "WEB_APP_URL",
    "\"http://192.168.1.20:5173?apiBase=http%3A%2F%2F192.168.1.20%3A5000\""
)
buildConfigField("String", "BACKEND_URL", "\"http://192.168.1.20:5000\"")
```

Your backend must allow traffic through Windows Firewall.

## Voice assistant note

Android WebView does not reliably support the browser `SpeechRecognition` API. This project injects a Kotlin speech recognition bridge so the existing voice assistant buttons can use Android's native `SpeechRecognizer`.

For a final Play Store version, the stronger long-term option is to build the voice assistant as a fully native Kotlin screen that calls:

```text
POST /api/voice-assistant/analyze
```

The bridge is enough for implementation/testing while keeping your current frontend.
