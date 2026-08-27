# ⚡ SwiftPOS Pro v7

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

Full list: [FEATURES.md](./FEATURES.md) — **135 features**.

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
