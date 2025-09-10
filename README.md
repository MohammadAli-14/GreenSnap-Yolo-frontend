# GreenSnap AI — Frontend (Expo React Native)

> Mobile frontend for **GreenSnap AI** — a cross-platform Expo app that lets citizens capture geo-tagged waste reports and submit them to the GreenSnap backend (which uses Ultralytics YOLOv11 for inference).  
> This single `README.md` contains everything needed to run, connect, build, and contribute to the frontend.

---

## Table of Contents

- [About](#about)  
- [Features](#features)  
- [Tech stack](#tech-stack)  
- [Prerequisites](#prerequisites)  
- [Quick start](#quick-start)  
- [Environment (`.env`) — template](#environment-env---template)  
- [API / Integration contract (examples)](#api--integration-contract-examples)  
- [Permissions & device notes](#permissions--device-notes)  
- [Build & release](#build--release)  
- [Troubleshooting](#troubleshooting)  
- [Contributing](#contributing)  
- [License](#license)

---

## About

This Expo-managed React Native app is the citizen-facing client for GreenSnap AI. Users capture or upload images of litter/waste, the app attaches GPS, then submits reports to the backend for YOLOv11-based validation and lifecycle management.

---

## Features

- 📷 Camera capture and image upload  
- 📍 Automatic GPS attachment to each report  
- 🔔 Report status & lifecycle UI (pending, in-progress, resolved)  
- 🏆 Leaderboard & basic user profile  
- 📱 Works on Android, iOS, and Web (via Expo)

---

## Tech stack

- Expo (managed) + React Native  
- Expo Router (file-based navigation)  
- Expo ImagePicker / Camera & Location APIs  
- Axios / Fetch for network calls  
- React Context / Zustand (or Redux) for state  
- Expo SecureStore for JWT storage

---

## Prerequisites

- Node.js (16+)  
- npm or yarn  
- Expo CLI (optional): `npm install -g expo-cli` or use `npx expo`  
- Android Studio / Xcode for emulators (if needed)

---

## Quick start

```bash
# 1. clone
git clone https://github.com/MohammadAli-14/GreenSnap-Yolo-frontend.git
cd GreenSnap-Yolo-frontend

# 2. install
npm install

# 3. create .env (see template below)

# 4. run dev
npx expo start
