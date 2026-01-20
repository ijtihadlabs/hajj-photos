# Hajj Photos

A small, free web + PWA tool to help Hujjaj with Nusuk photo requirements.

**Live:** https://hajjphotos.ijtihadlabs.org

## Purpose

A small, free effort to help fellow Hujjaj prepare calmly for photo requirements, seeking only the pleasure of Allah.

## Key Principles (non-negotiable)

- No accounts, no login, no registration
- No tracking, no analytics
- No backend
- No scraping or integration with Nusuk
- Privacy-first: everything stays on the user’s device
- Designed as a charity/sadaqah initiative

## What this app does

### 1) Take Hajj Photo
- Live camera preview with framing guides (square crop + oval face guide)
- Exports a **200×200 JPG** under **1MB**
- Provides best-effort guidance (not final authority)

### 2) Photo Conversion
- Upload an existing photo and crop/zoom to a square preview
- Converts to **200×200 JPG** under **1MB**
- Manual confirmations for non-technical requirements

> Note: This app provides best-effort help only. Final acceptance depends on Nusuk validation.

## Privacy

- No personal data collected
- No images uploaded
- No cloud sync
- Clearing browser data resets the app

## Install as an app (PWA)

- iPhone (Safari): Share → Add to Home Screen
- Android (Chrome): Menu → Install app / Add to Home screen

## Tech stack

- React + TypeScript + Vite
- PWA via `vite-plugin-pwa`
- Static hosting: Netlify
- Source control: GitHub


## Local development

```bash
npm install
npm run dev
```
