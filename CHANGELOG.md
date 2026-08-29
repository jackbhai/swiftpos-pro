# Changelog

All notable changes to SwiftPOS Pro. Dates are IST.

## [14.0.0] — 2026-08-29 · Ultra UI Polish & PWA Hardening
### Added
- **Ultra-Grade AMOLED & Cyber UI Design**: Deep black `#000000` surface, glassmorphism card elevation, glowing active borders, glowing status badges, and silky smooth transitions across mobile, tablet, and desktop.
- **PWA Supercharge & Real Icon Assets**:
  - Full suite of crisp PNG icons generated (72px, 96px, 128px, 144px, 152px, 192px, 384px, 512px, maskable 512px, apple-touch-icon 180px, favicon 48px).
  - Standalone PWA detection and custom **PWA Install Modal** with step-by-step Safari iOS instructions and 1-tap Android/Desktop native install.
  - Safe-area-inset padding for iPhone Dynamic Island, home indicators, and Android gesture navigation.
  - Service Worker upgraded to `swiftpos-v14-0` with asset caching, background refresh, and immediate update takeover.
- **Header Quick Business System Switcher**:
  - Direct 1-tap switcher drawer in the top navigation to switch between all 10 business editions (RMS, Pharmacy, Kirana, Retail, Electronics, Salon, Hardware, Bakery, Cafe, Garage) without leaving the POS.
- **Thermal Hardware Studio & Test Bench**:
  - Live interactive simulated 58mm / 80mm thermal receipt roll preview with ESC/POS styling.
  - 1-tap test print triggers for 58mm thermal, 80mm standard thermal, and A4 tax invoice.
  - Cash drawer kick pulse trigger test (`\x1B\x70\x00\x19\xFA`) and hardware setup guide.
- **Synthetic Web Audio & Haptic Feedback Engine**:
  - Realistic dual-tone POS barcode scanner beep (`1480Hz + 1860Hz`).
  - Joyful harmonic payment success chime (C5-E5-G5-C6 ascending arpeggio).
  - Micro tactile click and alert tones.
  - Multi-pattern vibration presets (`light`, `medium`, `heavy`, `success`, `warning`).
- **POS & Split Payment Experience**:
  - Real-time discount calculation (% and ₹), quick note drawer, extra charge modifiers.
  - Multi-tender split payment visualizer (Cash + UPI + Card + Wallet + Credit).
  - Instant gift card lookup and redemption.
- **Expanded Test Suite**: Vitest suite expanded to 43 unit tests covering calculations, doctor, systems, format, PWA detection, and sound engine.

## [13.0.0] — 2026-08-28 · Production release
### Added
- **First-run setup wizard** (`/welcome`): shop details → business system → data import → UPI → security, in five steps.
- **Diagnostics & support screen** (`/diagnostics`): build/commit info, storage usage, persistent-storage request, per-table row counts, crash + auto-fix log, one-tap diagnostic report and self-repair.
- **Legal centre** (`/legal`): privacy policy, terms of use, licence, refund and support policy.
- **Marketing landing page** (`/landing.html`) with pricing tiers and FAQ.
- Global crash capture: runtime errors and unhandled promise rejections are logged on-device and surfaced in Diagnostics.
- Automated test suite (Vitest, 38 tests) covering billing maths, business-system integrity, the cloud error doctor and formatting/CSV helpers.
- Continuous integration workflow: typecheck → tests → production build on every push and pull request; deploys are blocked if any gate fails.
- Build metadata (`version`, `commit`, `build time`) compiled into the app and shown in Diagnostics.
- PWA manifest upgraded: app shortcuts (Billing, Inventory, Day close, Reports), categories, description, id and display overrides.
- `LICENSE`, `SECURITY.md`, `SUPPORT.md`, `DEPLOYMENT.md`, `LAUNCH-CHECKLIST.md`, `CHANGELOG.md`.
### Changed
- Vite production build: vendor code split into `react`, `charts`, `data` and `media` chunks; source maps off; debugger statements dropped.
- Error boundary now logs the crash, offers a backup download and a repair-and-reload action.
- Service worker bumped to `swiftpos-v13-0`.

## [12.0.0] — 2026-08-28
- Ten complete business systems (RMS, pharmacy, kirana, retail, electronics, salon, hardware, bakery, cafe, garage) with system-driven screens, POS capture fields and defaults.
- Cloud database sync (Firebase Firestore, Supabase, custom REST) with live progress view.
- Multi-device registry with heartbeats and last-write-wins merging.
- Auto error doctor: 11 error classes, automatic retries, batch shrinking, cursor resets and local IndexedDB self-repair.

## [11.1.0] — 2026-08-28
- In-app searchable Feature Index.

## [11.0.0] — 2026-08-28
- Gift cards & wallets, price lists, write-off register, targets, tasks, customer display, digital QR menu, smart auto-reorder, WhatsApp campaigns, what-if lab, feedback/NPS, gift-card payments at the POS.

## [10.0.0] — earlier
- Branches & transfers, service jobs, appointments, GST tax centre, data doctor, worker analytics, virtualised lists, WhatsApp bill sharing as text or image.

## [7.0.0] — first public build
- Offline-first POS, inventory, CRM, purchases, expenses, reports, 20+ receipt templates, PWA install.
