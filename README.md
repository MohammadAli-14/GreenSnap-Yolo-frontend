````markdown
# GreenSnap AI — Frontend (Expo React Native)

> Mobile frontend for **GreenSnap AI** — a cross-platform Expo app that lets citizens capture geo-tagged waste reports and submit them to the GreenSnap backend (which uses Ultralytics YOLOv11 for inference).  
> This single `README.md` contains everything needed to run, connect, build, and contribute to the frontend.

---

## Table of Contents

- [About](#about)  
- [Key Features](#key-features)  
- [Tech Stack](#tech-stack)  
- [Prerequisites](#prerequisites)  
- [Quick Start](#quick-start)  
- [Environment (`.env`) — Template](#environment-env---template)  
- [API / Integration Contract (examples)](#api--integration-contract-examples)  
  - [Authentication](#authentication)  
  - [Submit report (multipart)](#submit-report-multipart)  
  - [Report fetch & lifecycle](#report-fetch--lifecycle)  
- [Permissions & Device Notes](#permissions--device-notes)  
- [Build & Release](#build--release)  
- [Troubleshooting](#troubleshooting)  
- [Contributing](#contributing)  
- [License](#license)

---

## About

This Expo-managed React Native app is the citizen-facing client for GreenSnap AI. Users capture or upload images of litter/waste, the app attaches GPS, then submits reports to the backend for YOLOv11-based validation and lifecycle management. The frontend focuses on a lightweight, secure UX and delegates inference & secret management to the backend.

---

## Key Features

- 📷 Camera capture and image upload  
- 📍 Automatic GPS attachment to each report  
- 🔔 Report status & lifecycle UI (pending, in-progress, resolved)  
- 🏆 Leaderboard & basic user profile  
- 📱 Cross-platform: Android, iOS, Web (via Expo)

---

## Tech Stack

- **Expo (managed)** + React Native  
- Expo Router (file-based navigation)  
- Expo ImagePicker / Camera & Location APIs  
- Axios / Fetch for network calls  
- React Context / Zustand (or Redux) for state  
- Expo SecureStore for JWT / token storage

---

## Prerequisites

- Node.js (16+ recommended)  
- npm or yarn  
- Expo CLI (optional): `npm install -g expo-cli` or use `npx expo`  
- Android Studio / Xcode for emulators if testing locally

---

## Quick Start

```bash
# 1. clone
git clone https://github.com/MohammadAli-14/GreenSnap-Yolo-frontend.git
cd GreenSnap-Yolo-frontend

# 2. install dependencies
npm install

# 3. create .env (see template below)

# 4. run in development
npx expo start
````

Expo CLI will show options to open on a device with Expo Go, Android emulator, iOS simulator, or the web.

---

## Environment (`.env`) — Template

Create a `.env` file in the project root. **Do not** commit secrets. Expo exposes variables that begin with `EXPO_PUBLIC_` to the JS bundle.

```env
# Backend (point this to your deployed backend - Render or local)
EXPO_PUBLIC_API_URL=https://your-backend.onrender.com

# Optional: public mapping keys for map screens
EXPO_PUBLIC_MAPS_API_KEY=              # e.g., Google Maps / Mapbox public key
```

> **Important:** Never store server-side secrets (Ultralytics API keys, DB credentials, admin secrets) in the frontend. All inference and sensitive keys must be stored and used only on the backend.

---

## API / Integration Contract (examples)

These are minimal examples the frontend expects from the backend. Adjust paths if your backend differs.

### Authentication

* `POST /auth/register` — register user
  Body: `{ name, email, password, role }`
* `POST /auth/login` — login
  Body: `{ email, password }` → Response: `{ token }`

Store `token` securely (Expo SecureStore) and include in `Authorization: Bearer <token>` header for protected requests.

### Submit report (multipart)

`POST /reports` — submit a report (image + gps + description)

Headers:

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Form fields:

* `image` — file (binary)
* `latitude` — decimal
* `longitude` — decimal
* `description` — string (optional)

#### React Native (fetch) example

```js
// Example: send image + gps via fetch (works in Expo)
async function submitReport({ uri, latitude, longitude, description, token }) {
  const form = new FormData();
  form.append('image', {
    uri,                 // "file://..." (mobile) or blob on web
    name: 'report.jpg',
    type: 'image/jpeg',
  });
  form.append('latitude', String(latitude));
  form.append('longitude', String(longitude));
  form.append('description', description || '');

  const resp = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/reports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: form,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Upload failed (${resp.status}): ${text}`);
  }
  return resp.json();
}
```

### Report fetch & lifecycle

* `GET /reports` — list reports (query params: `status`, `page`, etc.)
* `GET /reports/:id` — get single report (includes `modelAudit`, `lifecycle`)
* `POST /reports/:id/comment` — add comment or status update (supervisor/admin protected)

Expected `status` values returned by backend:
`pending`, `accepted`, `retake_requested`, `rejected`, `in_progress`, `resolved`, `permanent_resolved`.

---

## Permissions & Device Notes

* **Runtime permissions:** request Camera and Location permissions at runtime; if denied, present clear instructions to enable them in device settings.
* **Geolocation accuracy:** prefer high accuracy for verification flows but gracefully fall back to coarse accuracy to conserve battery.
* **Image optimization:** compress and resize images on-device before upload (recommended max dimension \~1024px, quality \~0.7) to reduce upload latency and backend inference costs.
* **Connectivity:** handle offline submissions with retry/sync behavior if needed (store temporarily and POST when online).

---

## Build & Release

### Android (local / debug)

```bash
npx expo prebuild
npx expo run:android
# or use EAS Build for managed app store builds
```

### iOS (macOS required)

```bash
npx expo prebuild
npx expo run:ios
# or use EAS Build for App Store builds
```

### Web

```bash
npm run web
```

For production builds and store submissions use **EAS Build** (Expo Application Services) and follow platform signing guidelines.

---

## Troubleshooting

* **Network errors:** confirm `EXPO_PUBLIC_API_URL` is correct and the backend allows requests from your device (CORS for web or network reachability for device).
* **Image upload fails:** ensure `uri`, `name`, and `type` are correctly set in `FormData`. On Android ensure the URI is accessible (content:// or file://).
* **Location returns null:** verify runtime permissions and device location services are enabled; test with both coarse & fine accuracy.
* **Authentication issues:** confirm token is stored and attached as `Authorization: Bearer <token>`. Use Expo SecureStore to persist tokens.
* **Debugging:** use Expo DevTools, remote JS debugging, and check backend logs for incoming requests and errors.

---

## Contributing

Contributions are welcome!

* Fork → feature branch → open PR with clear description.
* Open issues before large architectural changes.
* Keep UI components modular and small; add unit tests where practical.
* **Never commit** `.env` or private keys. Use `EXPO_PUBLIC_` variables for any client-side config only.

Consider adding a `CONTRIBUTING.md` and a safe `.env.example` with only public placeholders.

---

## License

This project is licensed under the **MIT License** — see the `LICENSE` file in the repository root for details.

---

*Last updated: 2025-09-10*

```
::contentReference[oaicite:0]{index=0}
```
