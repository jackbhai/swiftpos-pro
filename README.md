# ⚡ SwiftPOS Pro v14.0 — Ultra UI & PWA Edition

**An offline-first, AMOLED-black Point of Sale suite that adapts to *any* kind of shop** — kirana, medical store, restaurant, cafe, bakery, electronics, fashion, salon, hardware, garage, or your own custom business.

> Live app → **https://jackbhai.github.io/swiftpos-pro/**
> Landing page → **https://jackbhai.github.io/swiftpos-pro/landing.html**

Everything runs in the browser. No server, no subscription, no internet needed after first load — your data lives in IndexedDB on your own device.

---

## ✨ Highlights

| | |
|---|---|
| 🏪 **10 Business Systems** | Switching system (RMS, Pharmacy, Kirana, Retail, Electronics, Salon, Hardware, Bakery, Cafe, Garage) re-wires screens, billing capture fields, wording, and defaults |
| 📴 **PWA Supercharged** | Multi-size PNG icons (72px to 512px + maskable + apple-touch-icon), offline-first service worker, in-app install modal with iOS step-by-step & Android 1-click install |
| 🌑 **Ultra AMOLED UI** | Pure `#000000` glassmorphic theme, neon glow borders, animated pills, quick system switcher drawer, and silky smooth responsive sheet interactions |
| 🔊 **Audio & Haptic Feedback** | Synthetic Web Audio engine (dual-tone barcode beep, cash register arpeggio chime, tactile clicks) + 5 vibration presets, 100% offline with zero assets |
| 🖨️ **Hardware & Thermal Studio** | Live simulated 58mm/80mm thermal receipt preview, 1-tap test prints, cash drawer kick pulse test (`\x1B\x70\x00\x19\xFA`), and scanner guide |
| 📥 **Universal JSON/CSV Import** | Auto-detects schema, maps 40+ field aliases, chunked import with progress — tested with **27,555-product** catalogue |
| 🧾 **Complete Billing & Split Pay** | Barcode scan, holds, multi-mode split payments (Cash + UPI + Card + Wallet + Credit), coupons, loyalty, 20+ templates, WhatsApp share |
| 📦 **Inventory & Stock Logs** | Batch & expiry, margin tracking, stock movement audit trail, low-stock & expiry severity badges, fast adjustment drawer |
| ☁️ **Multi-Device Cloud Sync** | Firebase / Supabase / REST connection with live progress meter, device registry, and auto-repair doctor |

Full list: [FEATURES.md](./FEATURES.md) — **883 features**.

### Production status
[![CI](https://github.com/jackbhai/swiftpos-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/jackbhai/swiftpos-pro/actions/workflows/ci.yml)

Every push runs **typecheck → 43 unit tests → production build** before GitHub Pages deploys.

```bash
npm ci
npm run verify   # typecheck + tests + production build
npm run dev      # local development
```

| | |
|---|---|
| Setup | First-run wizard (`/welcome`) — shop, system, data, UPI, PIN |
| Support | Diagnostics screen with copyable report + local self-repair |
| Legal | Privacy policy, terms, licence in-app (`/legal`) + `LICENSE`, `SECURITY.md` |
| Release | `CHANGELOG.md`, versioned service worker, `DEPLOYMENT.md`, rollback plan |
| Launch | `LAUNCH-CHECKLIST.md`, marketing landing page at `/landing.html` |

```bash
npm ci
npm run verify   # typecheck + tests + production build
npm run dev      # local development
```

### New in v12
**10 complete business systems** (Restaurant RMS · Pharmacy · Kirana · Retail/Fashion · Electronics/Mobile · Salon/Spa · Hardware · Bakery · Cafe/QSR · Auto Garage) — pick one and the whole UI, modules, billing fields and defaults change.
**Cloud database sync** — Firebase / Supabase / your own REST API, live "kitna synced, kitna baaki" view, multi-device support and an auto error doctor that repairs failures by itself.

### New in v11
Gift cards & wallets · price lists / rate cards · damage-expiry-wastage register · monthly & staff targets · shop task board · customer-facing second screen · digital QR menu · smart auto-reorder POs · WhatsApp campaign segments · what-if pricing lab · customer feedback & NPS · gift-card payments at the POS.

---

## 🧰 Tech stack

- **React 18** + **TypeScript** + **Vite 5**
- **Tailwind CSS** (custom AMOLED design system, CSS-variable theming)
- **Zustand** (persisted cart / settings / session stores)
- **Dexie** (IndexedDB) + `dexie-react-hooks` live queries
- **Recharts** for analytics, **lucide-react** icons
- **HashRouter** so it works on GitHub Pages out of the box
- Code-split routes, PWA manifest, zero backend

---

## 🚀 Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

## 📥 Importing your own data

Settings → **JSON Data**. Drop in a file, paste JSON, or fetch a URL.

Minimum viable product row:

```json
[{ "product_name": "Paracetamol 650mg", "price_per_unit": 32, "stock_quantity": 120 }]
```

Everything the importer understands:

```json
[{
  "product_id": "SKU1001",
  "product_name": "Paracetamol 650mg Strip",
  "brand_name": "Cipla",
  "category": "Tablets",
  "unit_type": "strip",
  "barcode": "8901234567890",
  "price_per_unit": 32,
  "cost": 24,
  "mrp": 35,
  "stock_quantity": 120,
  "gst": 12,
  "hsn": "3004",
  "batch": "B2291",
  "expiry": "2027-04-30",
  "low_stock": 15,
  "rack": "R2-3"
}]
```

Aliases are handled automatically — `name`/`item_name`/`dish`, `price`/`rate`/`selling_price`, `qty`/`stock`/`on_hand`, `ean`/`upc`/`gtin`, and more. Customers, vendors and full backups use the same importer.

Three demo catalogues ship with the app (1.5k lite · ~800 pharmacy · 27,555 full) — one tap to load.

## ⌨️ Shortcuts

`Ctrl/⌘+K` palette · `F1` billing · `F2` inventory · `F3` customers · `F4` reports · `/` search · `F8` scan · `F9` hold · `F10` customer · `Ctrl/⌘+Enter` charge · `Ctrl/⌘+B` calculator

## 📁 Project structure

```
src/
  components/  ui/ · layout/ (shell, nav, palette, toasts) · pos/ (grid, payment, receipt, scanner)
  pages/       Dashboard POS Inventory Sales Customers Vendors Purchases
               Expenses Reports Offers Tables Staff Activity Settings Help
  store/       settings · cart · session · ui   (Zustand + persist)
  db/          Dexie schema · types · seed
  lib/         importer · calc · receipt · backup · sale · csv · format · sound · shopProfiles
```

---

MIT © SwiftPOS Pro
