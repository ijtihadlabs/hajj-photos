# 🕋 Hajj Assistant

Hajj Assistant is a free, charity-driven, local-only web app designed to help Hujjaj make better decisions before and during Hajj.

It is intentionally NOT a booking system and does NOT integrate with or scrape Nusuk.
Its purpose is decision support, not transactions.

---

## 🎯 Vision & Principles

- Help Hujjaj make informed, calm, and structured decisions
- Privacy-first: everything stays on the user’s device
- Free and accessible worldwide
- Sustainable as charity / sadaqah jariyah

### Explicit Non-Goals
- No backend
- No user accounts or authentication
- No analytics or tracking
- No scraping Nusuk
- No monetisation or ads

---

## 🏗️ Platform & Architecture

### Tech Stack
- Frontend: React + TypeScript
- Build tool: Vite
- Hosting: Netlify (static)
- App type: Progressive Web App (PWA)
- Storage: Local browser storage only
- Version control: Git

### Why this approach
- Avoids Apple App Store fees
- Installable on iPhone, iPad, and macOS
- Works offline
- Minimal maintenance
- No data-privacy burden

---

## 🌍 Live App

App name: Hajj Assistant

The app is installable from the browser:
- iPhone: Safari → Add to Home Screen
- Mac: Chrome → Install App

---

## 📂 Project Structure

hajj-assistant/
- index.html        (plain text only)
- package.json
- vite.config.ts    (PWA manifest + config)
- public/           (icons)
- src/
  - App.tsx         (landing / guide page)
  - main.tsx        (React entry)
  - index.css
- dist/             (Netlify build output)

IMPORTANT:
Do NOT edit index.html using rich text editors.
Use VS Code or nano only.

---

## 🧠 Current App State

The app currently contains:
- Minimal landing page
- App name and description
- Simple “How to use” guide

This is intentional.
The foundation is now stable and ready for modular expansion.

---

## 🧩 Modular App Design

Hajj Assistant is a multi-module app.

Planned modules:
1. Hajj Package Ranker (first)
2. Checklist
3. Timeline
4. Notes
5. Duas / reminders (optional)
6. Settings

Each module:
- Is self-contained
- Uses local-only storage
- Has no backend dependency

---

## 📦 Module 1: Hajj Package Ranker (Planned)

This module will port logic from an existing SwiftUI iOS app.

### Core Concepts
- Manual entry of Nusuk package data
- Focus on decision quality, not cheapest price
- Same package can generate multiple configurations

### Pricing Semantics
- Listed price per person (excluding flight) assumes:
  - Quad occupancy
  - Al-Muaisim camp
  - VAT + transport included
- Camp upgrade:
  - Majr Al-Kabsh has a fixed per-person delta
- Flight:
  - Entered as group total or per person

### Room & Occupancy Rules
- Makkah and Madinah occupancy must match
- Aziziyah defaults to quad
- Double or triple only if explicitly provided

### Scoring & Recommendations
- User-defined weighted preferences
- Budget proximity rewarded (closest to budget, not cheapest)
- Local currency input with live FX to SAR
- All calculations are local

NOTE:
This logic is not implemented yet in the web app.

---

## 🔐 Privacy & Data

- All data stored locally on the device
- No accounts
- No cloud sync
- Clearing browser storage resets the app

---

## 🚧 Development Approach

- Build one module at a time
- Prioritise correctness and clarity
- Avoid premature UI polish
- Keep modules isolated

---

## 🤝 Intent

This project is charity-driven and community-focused.

May it be beneficial and accepted.

---

## 📸 Module 1: Take Hajj Photo (Completed)

A local-only camera tool to help Hujjaj take a Nusuk-ready profile photo with less stress and guesswork. This module provides best-effort guidance while keeping the user fully in control. Nothing is uploaded, tracked, or stored remotely.

### Purpose
A small utility to help fellow Hujjaj prepare with clarity and ease, seeking only the pleasure of Allah.

### Core Features
- Live camera preview (front/back camera switch)
- Square framing overlay (no shadow)
- Capture output is enforced locally:
  - **200 × 200 px**
  - **JPG**
  - **< 1 MB**
- Export options:
  - Download JPG
  - Share / Save to Photos (device/browser dependent)

### Live Guidance (Best-Effort, On-Device)
- Face detected
- Face centered
- Face distance appropriate (~70% face + shoulders)
- Background bright enough (white/light)
- Background plain (low visual noise)

> Note: Guidance is best-effort. Final acceptance always depends on Nusuk’s own validation.

### Manual Confirmations (Definitive)
Before capture is enabled, the user must manually confirm:
- No glasses / sunglasses
- No hat / cap / head accessory  
  *(Headscarf is allowed)*

This avoids unreliable AI decisions and reduces false failures.

### Technical Notes
- Fully client-side (React + Vite), no backend
- Uses on-device browser vision for guidance (no server calls)
- No persistent storage of photos inside the app
- Module is self-contained under `src/take-photo/`

### Status
- Feature-complete
- Stable
- Frozen (changes only if Nusuk requirements change or explicitly requested)

---
