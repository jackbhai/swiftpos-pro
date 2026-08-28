# ⚡ SwiftPOS Pro v13.0 — production

**An offline-first, AMOLED-black Point of Sale suite that adapts to *any* kind of shop** — kirana, medical store, restaurant, cafe, bakery, electronics, fashion, salon, hardware, stationery, or your own custom business.

> Live app → **https://jackbhai.github.io/swiftpos-pro/**

Everything runs in the browser. No server, no subscription, no internet needed after first load — your data lives in IndexedDB on your own device.

---

## ✨ Highlights

| | |
|---|---|
| 🏪 **12 shop profiles** | Switching profile re-labels the UI (Product → Medicine / Dish / Service), toggles modules, and sets tax, units, categories and layout |
| 📥 **Universal JSON/CSV import** | Auto-detects your schema, maps 40+ field aliases, chunked import with progress — tested with a **27,555-product** catalogue |
| 🧾 **Complete billing** | Barcode scan, holds, split payments, coupons, loyalty, credit, 58mm/80mm/A4 receipts, WhatsApp share |
| 📦 **Inventory** | Batch & expiry, margins, stock logs, adjustments, dead-stock report, valuation |
| 👥 **CRM** | Tiers, loyalty points, credit ledger, segments, purchase history |
| 🚚 **Purchasing** | Vendors, purchase orders, one-tap receive with auto stock-in |
| 📊 **Analytics** | Dashboard KPIs, hourly heatmap, GST (GSTR-1 style), P&L, staff performance |
| 🌑 **AMOLED UI** | True-black theme, 6 accents, 3 densities, light mode, fully responsive phone → desktop |
| 🧾 **20 bill templates** | Thermal 58/80mm, A4 GST invoice, KOT, token slip, gift receipt, challan, Z-report… plus **upload your own HTML template** |
| 📲 **Multi-UPI + QR** | Save unlimited UPI IDs, dynamic scan-to-pay QR at checkout and printed on bills, GPay/PhonePe/Paytm deep links |
| ⚙️ **16 settings tabs** | Store, billing, charges, payments, templates, printing, POS, inventory, loyalty, messaging, security, JSON, appearance, backup |
| 🏷️ **Label printing** | Code128 barcode + price shelf tags, 3 sizes, 1–6 columns |
| 🔒 **App lock** | PIN keypad with idle auto-lock, cashier discount caps, hide-cost mode |
| 🚀 **v8 performance engine** | Virtualised lists, shared indexed catalogue cache, ranked fuzzy search, debounced input — 27k products scroll at 60 fps |
| 📴 **True PWA** | Service worker, install prompt, in-app update button, works fully offline |
| ↩️ **Returns desk** | Line-level refunds, restock, credit notes, reason codes |
| 🧮 **Day close (Z-report)** | Denomination cash count, variance, payment mix, printable Z-report |
| 📋 **Stock take** | Count sheet, live shrink value, bulk-post adjustments with audit trail |
| 📝 **Quotes / estimates** | Build, print, WhatsApp, convert to bill in one tap |
| 💬 **Bulk reminders** | Dues, win-back, birthday and VIP WhatsApp campaigns |
| 🧠 **Reports+** | ABC/Pareto, demand mix, basket affinity, forecast & reorder plan |
| 📒 **Khata / ledger** | Customer dues, vendor payables, payment in/out, printable statements |
| 🍳 **Orders + KDS** | Live delivery board, kitchen display, KOT print, prep timers |
| 🕒 **Attendance & payroll** | Punch in/out, hours, salary pro-rating, commission, payslips |
| 🥘 **Recipes & production** | BOM costing, can-make calculation, production runs that move stock |
| 🔁 **Subscriptions** | Daily/weekly/monthly repeat orders with due queue and MRR |
| ✨ **Insights engine** | Health score + 18 ranked, actionable business insights |
| 🏬 **Branches & transfers** | Multi-outlet stock movement with printable challans |
| 🔧 **Service jobs** | Repair job cards, parts, warranty, ready-for-pickup WhatsApp |
| 📅 **Appointments** | Hourly slot board for salon/clinic/tailor style businesses |
| 🧾 **Tax centre** | GSTR-1 summary, B2B/B2C registers, HSN table, JSON export |
| 🩺 **Data doctor** | 12 catalogue health checks with one-click, undoable auto-fixes |
| 🧵 **Worker analytics** | ABC, basket affinity & velocity computed off the main thread |
| 📤 **Bill sharing** | WhatsApp as **text or image**, plus download the bill as a PNG |

Full list: [FEATURES.md](./FEATURES.md) — **854 features**.

### Production status
[![CI](https://github.com/jackbhai/swiftpos-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/jackbhai/swiftpos-pro/actions/workflows/ci.yml)

Every push runs **typecheck → 38 unit tests → production build** before GitHub Pages deploys.

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
