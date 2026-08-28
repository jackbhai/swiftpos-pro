# SwiftPOS Pro v7 — Feature List (120+)

## Shop-type intelligence (multi-business)
1. 12 built-in shop profiles: Grocery/Kirana, Medical/Pharmacy, Restaurant, Cafe/QSR, Bakery/Sweets, General Retail, Electronics/Mobile, Clothing/Footwear, Salon/Spa, Hardware/Auto, Stationery/Books, Custom
2. Profile switch instantly re-labels the whole UI (Product→Medicine/Dish/Service, Customer→Patient/Guest/Client…)
3. Per-profile module switches (10 toggleable modules)
4. Per-profile default GST slab, units, categories, quick-cash denominations, POS layout and accent colour
5. "Apply profile defaults" or "keep my settings" when switching
6. Manual module overrides on top of any profile
7. Vocabulary preview panel
8. Batch & expiry module (pharmacy, grocery, bakery)
9. Prescription/Rx capture module
10. Serial / IMEI module (electronics)
11. Warranty tracking module
12. Size/variant module (fashion, cafe, restaurant)
13. Kitchen note module (per-line cooking instructions)
14. Table service module with floor plan
15. Appointments module (salon/clinic)
16. Loose/weighed goods module (decimal kg/g/l quantities)

## Data import / export (JSON tab)
17. Universal JSON importer with automatic schema detection
18. CSV importer with quoted-field parser
19. Auto field-alias mapping (product_name/item_name/name/medicine_name/dish…)
20. Price aliases (price_per_unit/selling_price/rate/mrp)
21. Stock aliases (stock_quantity/qty/on_hand/available)
22. Barcode aliases (barcode/ean/upc/gtin/product_id)
23. Brand, HSN, batch, expiry, rack, GST, low-stock aliases
24. Category source selector (category vs unit_type/sub-category)
25. Assumed-margin setting to derive cost when only price exists
26. Merge (upsert by barcode/name) or Replace import modes
27. Chunked writes with a live progress bar (handles 27k+ rows)
28. Detect-and-preview panel before import (kind + row count + sample row)
29. Paste-JSON editor with live analysis
30. File picker import (.json/.csv)
31. Import from any public URL
32. Three bundled demo catalogues (1.5k lite, ~800 pharmacy, 27,555 full)
33. Downloadable JSON templates for products/customers/vendors/backup
34. Copy-to-clipboard sample for every accepted format
35. Field-alias cheat sheet in the UI
36. Full-backup detection & restore from the same importer
37. Live record counters (products/customers/sales/vendors)
38. Customers importer, vendors importer
39. CSV export on every list screen (inventory, sales, customers, vendors, expenses, POs, reports, activity)
40. One-file JSON backup export & restore
41. Storage usage estimate

## Billing / POS
42. Grid or list catalogue with adjustable mobile columns
43. Fuzzy search across name, SKU, barcode and brand
44. Category chips + favourites filter
45. Recently-used products float to the top
46. Camera barcode scanner (BarcodeDetector) with manual fallback
47. USB/Bluetooth scanner support via keyboard input
48. Add to cart with stock guard (optional negative-stock selling)
49. Quantity stepper, direct quantity entry, decimal weights
50. Per-line price override
51. Per-line discount (flat or %)
52. Per-line kitchen/item note
53. Bill-level discount (flat or %) with 5/10/15/20% presets
54. Coupon engine (flat/percent, min bill, max cap, usage limit, expiry)
55. Loyalty point redemption with max-redeem helper
56. Customer attach with instant create
57. Sales channels: counter, takeaway, delivery, online
58. Table assignment for dine-in
59. Hold & recall unlimited bills (parked orders)
60. Cart clear, bill note
61. Live totals: subtotal, discounts, taxable, GST, round-off, profit
62. Payment modal: cash, UPI, card, wallet, credit, split
63. Split payment across multiple modes with balance validation
64. Cash tendered + auto change calculation
65. Smart quick-cash denominations based on bill total
66. Credit sale posts to customer outstanding
67. Auto stock deduction + stock-log entry per sale
68. Loyalty points auto-accrual
69. Invoice numbering with custom prefix & next-number control
70. Keyboard shortcuts (F1–F4, F8, F9, F10, /, Ctrl+Enter, Ctrl+K, Ctrl+B)
71. Sound feedback (scan beep, success chime, error buzz) and haptics

## Receipts & sharing
72. 58 mm thermal receipt
73. 80 mm thermal receipt
74. A4 GST invoice
75. Print via hidden iframe (no popup blockers)
76. Download receipt as HTML
77. WhatsApp share with formatted bill text
78. Native share sheet / clipboard copy
79. Configurable shop header, GSTIN and footer note

## Inventory
80. Full product CRUD with 20+ fields
81. Cost, price, MRP with live margin %
82. Stock, low-stock threshold, unit, GST, HSN
83. Batch number and expiry date
84. Rack/shelf location, brand, emoji icon
85. Active / inactive and track-stock toggles
86. Favourite pinning
87. Filters: all, low, out, expiring, favourites, inactive
88. Category filter + 5 sort keys with asc/desc
89. Table view and card view
90. Stock adjust modal (purchase, correction, damage, return) with quick amounts
91. Stock movement log with before/after values
92. Stock valuation at cost and retail
93. Paginated "load more" for very large catalogues

## Customers / CRM
94. Customer CRUD with GSTIN, birthday, address, notes
95. Automatic tiers (New/Silver/Gold/Platinum)
96. Lifetime spend, visits, average ticket, last visit
97. Loyalty point balance & manual point adjustment
98. Credit ledger with limit and one-tap settle
99. Segments: VIP, credit due, has points, lapsed 30d+
100. Purchase history per customer
101. WhatsApp outreach per customer
102. Attach to bill from CRM

## Vendors & purchasing
103. Vendor CRUD with GSTIN and payables
104. Purchase order builder with product search
105. Auto-suggested reorder quantity from low-stock levels
106. PO statuses: draft, ordered, partial, received, cancelled
107. Receive PO → auto stock-in + cost update + stock log
108. Vendor call / WhatsApp shortcuts

## Money & analytics
109. Expense tracking with 9 categories, recurring flag, pay mode
110. Expense breakdown bar chart
111. Dashboard: revenue, profit, orders, expenses, growth vs previous period
112. Revenue & profit area chart, order-count trend
113. Payment-mix donut chart
114. Hourly sales heatmap (peak hours)
115. Top products leaderboard
116. Live alert cards (out of stock, low stock, expiring, credit dues)
117. Reports: sales, product performance, GST slabs (GSTR-1 style), P&L, customers, stock health, staff
118. Dead-stock report with locked capital
119. Profit & loss statement with gross/net margins
120. Period selectors everywhere (today/7d/30d/90d/month/year/all)

## Operations & system
121. Staff accounts with roles (owner/manager/cashier) and PINs
122. Staff sign-in and per-staff sales attribution + commission %
123. Shift open/close with cash reconciliation and variance
124. Restaurant floor plan with areas, seats and occupancy states
125. Audit/activity log with search, export and clear
126. Command palette (Ctrl+K) across pages, products and customers
127. Global quick calculator
128. Notification badge for stock/expiry alerts
129. Online/offline indicator
130. AMOLED-black and light themes, 6 accent colours, 3 densities
131. Responsive shell: sidebar on desktop, drawer + bottom nav on mobile
132. Installable PWA (manifest, standalone, theme colour)
133. 100% offline — IndexedDB (Dexie) storage, no server required
134. Persisted cart, settings and session across reloads
135. Seeded demo store (44 products, 24 customers, 60 days of sales)

---

# v7.1 — "Next level" additions (features 136 → 212)

## Bill templates (20 built-in + unlimited custom)
136. **Classic Thermal (80mm)** — the everyday receipt
137. **Compact 58mm** — paper-saving mini roll
138. **Detailed Tax Thermal** — per-item HSN, GST%, taxable value
139. **Minimal Mono** — clean sans-serif, no borders
140. **Bold Header** — inverted black shop banner
141. **Restaurant Bill** — table, channel, service charge, tip line
142. **Pharmacy Rx Bill** — drug licence, patient, pharmacist signature
143. **Token / Queue Slip** — giant order number for pickup counters
144. **Gift Receipt** — items without prices
145. **Duplicate Copy** — CUSTOMER / MERCHANT watermark strip
146. **UPI Pay-First** — huge scan-to-pay QR at the top
147. **Loyalty Focus** — points earned + savings panel
148. **A4 GST Tax Invoice** — formal party block, HSN table, signature
149. **A4 Modern Accent** — colour-blocked layout with summary cards
150. **A4 Minimal** — typography-first, elegant
151. **A4 Quotation / Estimate** — validity note, non-tax
152. **A4 Delivery Challan** — dispatch note with signature lines
153. **Kitchen KOT** — big item names, notes, no prices
154. **Shelf / Price Label strip** — price tags straight from a bill
155. **Day Close (Z-Report)** — end-of-day reconciliation layout
156. Template gallery with live thumbnail previews of every design
157. Full-screen preview with sample bill data
158. One-click "Test print" for any template
159. Set separate defaults for receipt / A4 invoice / KOT
160. Duplicate any built-in template as a starting point
161. Download any template as .html
162. **Upload your own .html template** from your computer
163. Built-in template editor with live preview pane
164. Mustache-style token engine: `{{token}}`, `{{#items}}…{{/items}}`, `{{^empty}}…{{/}}`
165. 40+ documented tokens with click-to-copy chips
166. Custom templates stored offline in IndexedDB, included in backups
167. Print copies (1–4) with page breaks
168. Duplicate/merchant copy printing with configurable label
169. Print margin and font-scale controls per install
170. Invoice barcode (Code128) printed on receipts
171. Amount-in-words (Indian crore/lakh format) on invoices

## UPI & payments
172. **Unlimited UPI IDs** — add, label, edit, disable, delete
173. Default UPI selector (starred) used across the app
174. Live QR preview for every saved UPI ID
175. Download any UPI QR as a PNG (for counter display)
176. NPCI-compliant `upi://pay` deep links with amount + txn reference
177. One-tap app buttons: GPay, PhonePe, Paytm, any UPI app
178. Copy VPA to clipboard
179. Dynamic QR on the payment screen for the exact bill amount
180. UPI QR block auto-rendered inside receipt templates
181. Payee name and merchant code (MCC) per UPI account
182. QR size control for printed bills
183. Split payments can include a UPI leg with its own QR
184. Enable/disable individual payment modes
185. Default payment mode preference
186. Bank account block (bank, holder, A/C no., IFSC) for invoices
187. VPA validation before saving

## New settings surfaces (16 tabs)
188. **Store** — 2 phones, website, tagline, address
189. Legal IDs: GSTIN, PAN, FSSAI, drug licence
190. Logo upload + signature upload (stored as data URLs)
191. Currency symbol, symbol position, decimal places
192. Date format and language (English / Hindi beta)
193. **Billing** — prefix, next number, digit padding, suffix, live preview
194. Yearly invoice-number reset
195. Rounding mode: nearest / always up / always down
196. Cess support, HSN visibility, savings line, amount-in-words toggles
197. Terms & conditions text, footer, duplicate label
198. **Charges tab** — service charge %, packaging, delivery, tip, taxable toggle
199. Live "₹1,000 bill" charge preview
200. **Printing tab** — paper size, copies, margin, font scale, density
201. Auto-print receipt, auto-print KOT, logo, barcode, QR, drawer kick
202. **POS tab** — one-tap add, auto-focus search, confirm clear cart, keep customer after sale
203. **Inventory tab** — expiry window, reorder multiplier, barcode prefix, label options
204. **Loyalty tab** — points expiry, birthday bonus
205. **Messaging tab** — WhatsApp bill / reminder / marketing templates with placeholders
206. Alert toggles: low stock, expiry, dues, daily summary
207. **Security tab** — app-lock PIN, auto-lock timer, cashier discount cap, hide cost prices, manager-only refunds
208. **About tab** — profile, storage, stack, licence at a glance

## New operational features
209. **App lock screen** with PIN keypad, haptics and idle auto-lock
210. **Barcode & price label printing** page — Code128 generator, 3 label sizes, 1–6 columns, quantity per item, live sheet preview
211. Per-bill extra charges (service %, packaging, delivery, tip) with quick presets
212. Charges flow into totals, receipts, profit maths and reports

---

# v8 — "100x" performance & operations release (213–268)

## Performance engine
213. **Virtualised rendering** everywhere heavy — only visible rows are mounted (`VirtualList`), so a 27,000-item catalogue scrolls at 60 fps
214. Windowed **grid mode** too (responsive column count computed from viewport width)
215. **Indexed search cache** (`useCatalog`) — one shared, memoised index keyed by `count:maxUpdatedAt`, reused by every page
216. Pre-computed lowercase search keys per product (name + sku + barcode + brand + category)
217. **Ranked fuzzy search** — exact barcode > prefix > word-start > substring > subsequence scoring
218. **Debounced input** (140–160 ms) so typing never blocks the main thread
219. Result capping with early exit — search stops scanning once enough high-quality hits are found
220. `debounce`, `throttle`, `idle`, `chunkedForEach` utilities in a shared `perf` module
221. Header alert badge switched to an **indexed count query** instead of loading the whole catalogue
222. Every page moved off "load all products into React" — 8 screens converted
223. Memoised `ProductCard` / `ProductRow` components (no re-render on unrelated state changes)
224. Route-level code splitting for all 22 screens; charts split into their own chunk

## Offline & PWA
225. **Service worker** with offline-first caching (app shell + assets + catalogue JSON)
226. Network-first for navigations, cache-first with background refresh for assets
227. **Install app** button in the header (real `beforeinstallprompt` handling)
228. **Update available** button — new version detected, one tap to activate and reload
229. Automatic update check every 30 minutes
230. Works fully offline: billing, inventory, reports, printing all run without internet
231. Scoped registration that works on GitHub Pages sub-paths

## Reliability
232. **Error boundary** — crash screen instead of a white page, with Reload and Download-backup buttons
233. Local-storage-backed count sheet so a stock take survives a refresh
234. Hardware **barcode-scanner detection** (keystroke burst buffer) — works with any USB/BT scanner, no drivers
235. **Hindi/Hinglish i18n layer** with a `t()` helper and dictionary

## Returns & exchange desk (new module)
236. Search any bill by invoice no, customer or amount
237. **Line-level returns** — choose exactly which items and how many come back
238. Live refund total as you select
239. Optional **restock** with full stock-log audit trail
240. Refund via cash, UPI, **credit note**, or exchange
241. Reason codes (damaged, wrong item, expired, price dispute…)
242. Automatic **partial-refund vs full-refund** bill status
243. Credit notes reduce customer dues automatically
244. Credit-note document saved for reprint
245. Return-rate KPI and refund-value KPI

## Quotes & estimates (new module)
246. Build quotations with live product search
247. Editable qty and rate per line, running total, amount in words
248. Validity date, customer link, terms/notes
249. Printable A4 estimate/proforma document
250. **One-tap WhatsApp share** of the full quote
251. **Convert to bill** — loads straight into the POS cart
252. Open / converted / expired pipeline with win-rate KPI

## Day close · Z-report (new module)
253. Full end-of-day report: bills, items, gross, refunds, discounts, tax, net, profit, expenses
254. **Denomination-wise cash counter** (₹500 → ₹1) with live totals
255. Expected vs counted drawer with **short / excess variance** indicator
256. Payment-mode mix with share bars (splits decomposed correctly)
257. Hourly sales sparkline with peak-hour callout
258. Staff performance and top sellers for the day
259. Printable Z-report with signature lines + CSV export

## Stock take / audit (new module)
260. Count sheet over the whole catalogue with search, category filter and "counted only" view
261. Live **difference and shrink value** as you type counts
262. Adjustment preview before anything is written
263. **Bulk post** adjustments with stock-log entries and a single audit reference
264. Downloadable printed count sheet (CSV)

## Bulk inventory editing
265. Multi-select rows with select-all
266. **12 bulk operations**: price ±%, set price, price from cost+margin, cost ±%, GST, low-stock level, add/set stock, change category, activate, deactivate, favourite
267. Bulk delete with count confirmation

## Bulk WhatsApp reminders (new module)
268. Segments: dues, win-back (lapsed), birthdays (7-day look-ahead), VIPs, everyone
269. Token-based message templates ({name} {shop} {due} {points} {spend} {last})
270. Batch send (10 chats at a time), copy-all, and CSV export

## Advanced analytics (Reports+)
271. **ABC / Pareto classification** of every product by revenue contribution (A/B/C + zero-sale count)
272. **Demand mix** — revenue by day of week, product mix donut, hour-of-day demand
273. **Basket affinity** — frequently-bought-together pairs for combos and shelf placement
274. **Forecast** — 7-day moving average, week-on-week growth, 30-day projection
275. **Reorder plan** — daily velocity, days-of-cover and suggested order quantity, exportable

---

# v9 — business operations & deep optimisation release (276–345)

## Khata / ledger (new module)
276. Customer **receivables** and vendor **payables** in one khata view
277. Record payment **in / out** with mode, note, cheque reference
278. Running **balance-after** on every entry
279. Quick-amount chips (full balance, half, ₹500, ₹1000, ₹5000)
280. Over-credit-limit warning badge per customer
281. Customer **advance** tracking (negative balances)
282. Printable **account statement** per party
283. One-tap WhatsApp payment reminder from the khata
284. Full payment history with CSV export
285. "Collected today" KPI for daily cash reconciliation

## Orders, delivery & kitchen display (new module)
286. Live **order board** with new → preparing → ready → dispatched → delivered flow
287. **Kitchen Display System (KDS)** — tap-to-bump tiles that colour by age (10/20 min)
288. Order ageing timer and **late-order** detection against promised time
289. Channels: dine-in, takeaway, delivery, online/aggregator, pickup
290. Rider/staff assignment and delivery address capture
291. **KOT printing** per order (76 mm, item notes included)
292. Call-customer button, cancel with undo
293. Convert an order into a bill (loads straight into the POS cart)
294. Average prep-time KPI computed from real ready timestamps
295. Order history with status and channel

## Attendance & payroll (new module)
296. **Punch in / punch out** per staff member with live hours
297. Auto half-day detection (<4 hours) and leave marking
298. Month sheet with per-day in/out, hours and status
299. Payroll rules per staff: monthly salary, hourly rate, commission %
300. Salary **pro-rated by attendance** (half-days counted at 50%)
301. **Commission auto-calculated** from that staff member's sales
302. Printable **payslip** per employee
303. Payroll and attendance CSV exports
304. Payroll total for the month at a glance

## Recipes, BOM & production (new module)
305. Define a recipe/BOM for any finished product (thali, combo, mixture, repack, manufacturing)
306. Ingredient list with quantities and units
307. Labour/overhead cost per batch
308. **Auto cost-per-unit** and live **margin %** against selling price
309. **"Can make now"** calculation from current ingredient stock
310. **Production run** — consumes ingredients, creates finished stock, updates cost
311. Every production movement written to the stock log with a run reference

## Subscriptions & repeat orders (new module)
312. Daily / weekly / monthly recurring plans per customer
313. **Due-today** queue with overdue highlighting
314. One-tap "Bill now" that loads the plan into the cart and rolls the next due date
315. WhatsApp confirmation reminder per plan
316. Pause / resume plans
317. **Monthly recurring revenue (MRR)** KPI normalised across cycles

## Insights engine (new module)
318. **Business health score** (0–100) with animated ring gauge
319. 18 rule-based insights ranked critical → warning → win → idea
320. Out-of-stock, expired-stock and **below-cost pricing** alerts
321. Credit-limit breaches and udhaar-vs-revenue ratio warnings
322. Dead-stock capital-locked alert with value
323. Discount-leakage detection (discounts > 8% of sales)
324. Low-margin and negative-net-profit warnings
325. Month-on-month growth/decline detection with recommended action
326. Refund-rate anomaly detection
327. Lapsed-customer and repeat-rate coaching
328. Every insight carries a **direct action link** to the screen that fixes it
329. Quick facts panel: peak hour, best weekday, average bill, catalogue size

## Performance & platform (deep optimisation)
330. **LRU query cache** — repeated searches return instantly from memory
331. **Prefix narrowing** — typing one more character re-scans only the previous result set
332. **Multi-word AND ranking** with early rejection (no more junk matches)
333. Search cache auto-invalidates when the catalogue changes
334. **Idle route prefetching** — POS, Inventory, Sales, Insights and Khata warm up in the background
335. Six more screens moved onto the shared indexed catalogue
336. Dexie schema v3 with six new stores, migrated automatically
337. **Undo toasts** — deleted product, bulk delete, quote, recipe, subscription and cancelled order can all be restored
338. Bulk delete now snapshots records before deleting
339. **Gzip-compressed backups** (`.json.gz`) — typically 8–12× smaller
340. Restore accepts both `.json` and `.json.gz`
341. **Quick in-browser snapshot** that survives a refresh without downloading a file
342. Backups now include ledger, orders, attendance, payroll, recipes and subscriptions
343. Service-worker cache bumped so every device picks up the new build automatically
344. Dashboard **action strip**: live orders, udhaar, repeat orders due, out-of-stock — each one tap away
345. 28 screens total, all route-split and lazily loaded

---

# v10 — multi-outlet, service business & data-quality release (346–420)

## Branches & stock transfer (new module)
346. Create unlimited **branches / outlets** with code, address, phone and GSTIN
347. Mark a main branch; activate or deactivate outlets
348. **Stock transfer** between branches with item-wise quantities
349. Dispatch instantly deducts stock from the source branch
350. **Receive** at destination adds stock with a matching stock-log entry
351. Printable **transfer challan** with signature lines
352. Transfer status pipeline: draft → sent → received → cancelled
353. "Value in transit" KPI so nothing gets lost between outlets
354. Every transfer movement is written to the audit log

## Service & repair jobs (new module)
355. **Job cards** for mobile, electronics, appliance, tailoring, any repair work
356. 7-stage pipeline: received → diagnosing → awaiting-parts → repairing → ready → delivered → returned
357. Item, brand, serial/IMEI, reported issue and accessories received
358. Estimate, advance, final amount and live **balance due**
359. Technician assignment from your staff list
360. **Parts used** list with quantity and cost per part
361. Promised date with automatic **overdue** flagging
362. Auto WhatsApp "your item is ready" message when a job hits *ready*
363. Status-update WhatsApp message at any stage
364. Printable **job card** with terms and signature lines
365. Service warranty days recorded per job
366. One-tap **bill the job** — pushes the balance into the POS cart
367. Pipeline-value KPI and searchable job history with CSV export

## Appointments & bookings (new module)
368. **Day view** with hourly slots from 8 am to 10 pm
369. Free slots are clickable — book straight into that hour
370. Booking states: booked, confirmed, arrived, done, no-show, cancelled
371. Staff assignment, duration and price per booking
372. WhatsApp appointment confirmation in one tap
373. **No-show rate** and expected-revenue KPIs
374. Upcoming list across all future days
375. One-tap billing that pushes the service into the cart

## Tax centre (new module)
376. **GSTR-1 style** monthly summary computed from real invoices
377. **Rate-wise outward supplies** with CGST/SGST split
378. **B2B and B2C** invoice registers with CSV export
379. **HSN-wise summary** (Table 12 style) with quantity, taxable value and tax
380. **GSTR-1 JSON export** ready to hand to your accountant
381. Printable GST summary sheet
382. Missing-HSN warning with count
383. Handles both tax-inclusive and tax-exclusive pricing modes
384. Filing checklist showing your GSTIN, tax mode and state code

## Data doctor / catalogue cleanup (new module)
385. **12 automatic data-quality checks** across the whole catalogue
386. Duplicate names and duplicate barcodes detection
387. Selling-below-cost, zero-price and negative-stock detection
388. Missing cost, missing HSN, missing barcode and missing category checks
389. Suspicious margin (>90%) and over-long product names
390. **Data health score** out of 100
391. **One-click auto-fix** per check: 20% markup, cost from price, zero out negatives, generate barcodes, set category, trim names
392. **Smart duplicate merge** — keeps the best row and sums the stock
393. Bulk "set GST on everything missing it"
394. Delete all flagged rows in one action
395. **Every fix is undoable** from the toast
396. Virtualised results list handles tens of thousands of flagged rows
397. Full issue export to CSV for offline cleanup

## Performance & platform (deep optimisation round 2)
398. **Web Worker analytics engine** — ABC classification, basket affinity and velocity run off the main thread
399. Payload slimming before transfer (only the six fields the worker needs)
400. Automatic fallback to synchronous computation when Workers are unavailable
401. Result de-duplication by data stamp — the worker never recomputes the same input twice
402. 15-second worker timeout with graceful degradation
403. **Sales history virtualised** — 10,000+ invoices scroll without lag
404. **Audit log virtualised**
405. Reports now show a "crunching in a background thread" state instead of freezing
406. Dexie schema v4 with five new stores, migrated automatically
407. Backups extended to branches, transfers, service jobs, appointments and price lists
408. Service-worker cache bumped to v10 so every device auto-updates
409. 33 screens, all route-split, lazily loaded and idle-prefetched

## Cross-module glue
410. Service jobs, appointments and subscriptions all bill through the same POS cart
411. Branch transfers, production runs and stock takes all write to one unified stock log
412. Khata, returns and reminders share the same customer credit ledger
413. Insights engine reads every new module's data
414. Command palette (⌘K) indexes all 33 screens
415. Undo support now covers products, bulk edits, quotes, recipes, subscriptions, orders, branches, service jobs, appointments and cleanup fixes
416. Every new module ships with CSV export
417. Every new module ships with a printable document (challan, job card, statement, Z-report, GST summary)
418. Every new module is fully offline-capable
419. Every new module respects the shop-type terminology (Product → Medicine / Dish / Service)
420. Every new module is mobile-first and works on the same AMOLED theme

---

# v10.1 — bill sharing as text or image (421–432)

421. **Two WhatsApp options on every bill**: send as *text* or send as *image*
422. Bill rendered to a real **PNG image** from any of the 20+ templates (thermal 58/80 mm or A4)
423. **Download bill as image** button — saves `INVOICE-NO.png`
424. Native **Web Share** on mobile: the image goes straight into the WhatsApp chat
425. Desktop fallback: image auto-downloads and the WhatsApp chat opens, ready for a drag-and-drop
426. **Share sheet** on every past invoice in Sales history (text, image, save, preview, SMS, any app)
427. Optional phone number field — leave blank to pick the chat manually
428. **Image preview** before sending, so you see exactly what the customer gets
429. Template picker inside the share sheet (send a thermal slip or a full A4 invoice)
430. Receipt CSS is scoped while rasterising, so the app's theme never flickers
431. Retina-quality output (2× pixel ratio) with white background for readability
432. Automatic monospace-canvas fallback if a browser blocks HTML rasterisation — an image is always produced

## v10.2 — share sheet everywhere (433–440)
433. Single **WhatsApp** button on the payment receipt now opens the full share sheet (text / image / download)
434. **Download image** button placed directly on the receipt screen
435. Share sheet added to **Customers → purchase history** (send any old bill to that customer)
436. Share sheet added to the **Returns desk** bill search list
437. Share sheet available from **Sales history** on every invoice
438. Same sheet everywhere: text, image, save PNG, preview, copy, SMS, any app
439. Phone number is pre-filled from the customer record when available
440. Service worker bumped to v10.2 so every device picks up the new bill-sharing UI

## v11 — 700+ features (441 onwards)


### Gift cards, wallets & vouchers (`/loyalty`)

441. Dedicated Gift & Wallet screen for prepaid value of every kind
442. Issue **gift cards** with a face value and auto-generated unique code
443. Issue **prepaid wallets** customers can top up and spend down
444. Issue **discount vouchers** with a fixed value
445. Random human-readable code generator (easy to read out on the phone)
446. Manual code entry when you print your own card stock
447. Assign a card to a customer, or keep it as a bearer card
448. Expiry date per card, with expired cards flagged automatically
449. Redeem any amount against a card with live balance validation
450. Top-up an existing wallet without issuing a new card
451. Full transaction history per card (issue, top-up, redeem) with timestamps
452. Balance never goes negative — over-redemption is blocked with a clear message
453. Activate / deactivate a card instantly (lost or stolen cards)
454. Printable gift-card design with QR code of the card code
455. QR code scans straight to the card code for fast redemption
456. WhatsApp the balance and code to the customer in one tap
457. Search cards by code, customer or type
458. Live **liability dashboard** — total outstanding balance you owe customers
459. Stats for issued value, redeemed value and redemption rate
460. Filter by card type (gift / wallet / voucher) and active state
461. CSV export of every card with balances and status
462. Loyalty-points panel showing the shop's points rules in one place
463. Points earning rate, point value, minimum redemption and expiry shown live
464. Birthday-bonus points setting surfaced next to the rules
465. Top loyalty members leaderboard by points balance
466. Total points liability converted into rupees so you know the real cost
467. Delete with undo on every card action
468. Everything stored offline in IndexedDB and included in backups

### Price lists & rate cards (`/pricing`)

469. Price Lists screen for wholesale / retail / staff / distributor pricing
470. Percent-off price lists (e.g. wholesale = MRP − 12%)
471. Cost-plus-margin price lists (e.g. always 18% over cost)
472. Manual per-item price lists for negotiated rates
473. Unlimited price lists, each independently active or paused
474. Tag a price list to a customer tag so the right rate applies to the right buyer
475. Notes field per price list for internal rules
476. Live preview of computed prices for any list before you save it
477. Side-by-side comparison of MRP vs list price vs margin
478. Per-item override inside a manual list, with reset to formula
479. Automatic margin calculation against cost for every row
480. Warning when a computed price falls below cost price
481. Virtualised rate-card table that stays smooth on 27,000+ products
482. Search and category filter inside the rate card
483. Printable rate card (clean A4 layout) to hand to wholesale customers
484. CSV export of a complete rate card, ready to email
485. Margin-band analysis tab: items grouped by profitability band
486. Per-band CSV export to fix low-margin products in bulk
487. Count and value of stock sitting in each margin band
488. Negative-margin detector across the whole catalogue
489. Rounding rules so list prices come out in clean numbers
490. Duplicate a price list as a starting point for a new one
491. Delete a price list with undo
492. Price lists included in backup / restore and in the JSON import format

### Damage, expiry & wastage register (`/writeoff`)

493. Dedicated Write-off screen so shrinkage is recorded, not hidden
494. Seven reasons: damage, expiry, theft, wastage, sample, own use, other
495. One-tap reason chips for fast entry
496. Product search with live stock display while writing off
497. Quantity validation against available stock
498. Loss automatically valued at cost price
499. Live before → after stock preview before you confirm
500. Stock is reduced and a stock-log entry is written in the same action
501. Batch number captured automatically when the product has one
502. Free-text note for who, how and when
503. Monthly register view with month picker
504. Total monthly loss headline with entry count
505. Loss split by reason as coloured chips
506. Reverse any write-off — stock is restored, with undo
507. CSV export of the monthly register for your accountant
508. Expiring / expired tab listing every batch nearing expiry
509. Expired stock value totalled so you can see money sitting on the shelf
510. Expiry list sorted by nearest date first, with stock value per row
511. Write off straight from the expiring list
512. Activity log entry for every write-off (audit trail)
513. All write-offs feed the stock-log history on the product
514. Works completely offline; included in backups

### Targets & goals (`/targets`)

515. Monthly targets screen for the whole shop, per staff member or per category
516. Five target metrics: revenue, profit, bill count, items sold, unique customers
517. Live achievement calculated straight from real sales
518. Progress bar per target with percentage complete
519. Pace marker showing where you *should* be today in the month
520. Ahead / behind pace verdict in plain Hinglish
521. Run-rate projection for month-end based on current speed
522. On-track vs behind-target banner for the main shop target
523. "Roz kitna chahiye" — required daily sales to still hit the target
524. Auto-target button: last month's revenue + 10%
525. Month picker to review or plan any month
526. Staff picker so each cashier gets their own goal
527. Category targets to push a specific department
528. Notes per target (festival push, new branch, etc.)
529. Edit or delete any target, with undo on delete
530. Day-of-month progress indicator alongside sales progress
531. Multiple targets can run at the same time for the same month
532. Targets survive restore and are part of the backup file

### Shop tasks & reminders (`/tasks`)

533. Simple task list built for shop routine work
534. Quick-add box: type and press Enter
535. Eight ready-made shop task suggestions (bank deposit, GST filing, expiry check…)
536. Priority levels: high / normal / low with colour coding
537. Due dates with overdue highlighting
538. Repeating tasks: daily, weekly or monthly
539. Completing a repeating task auto-creates the next occurrence
540. Assign a task to a staff member by name
541. Detail / note field for instructions
542. Tabs for Open, Due today and Completed
543. Counters for open, due-today, overdue and completed
544. Smart sort: nearest due date first, then priority
545. One-tap complete / un-complete checkbox
546. Delete with undo
547. Bulk clear of completed tasks
548. Fully offline, included in backup and restore

### Customer-facing display (`/display`)

549. Second-screen customer display designed for a tablet or spare monitor
550. Live mirror of the POS cart across browser tabs and windows
551. Auto refresh every second — no setup, no pairing
552. Open-in-new-window button for a dedicated display device
553. True fullscreen mode for a kiosk look
554. Large "last scanned item" panel so customers can verify each item
555. Scrollable item list with quantity, unit and line total
556. Running totals: items, discount, tax and round-off
557. Giant total-payable figure in the accent colour
558. Live UPI QR code that updates with the exact bill amount
559. Payee VPA shown under the QR for trust
560. "Aapne itna bachaya" savings banner when discounts apply
561. Shop name, tagline, address and live clock header
562. Friendly welcome screen when the cart is empty
563. Pure AMOLED-black design that looks premium on any screen
564. Works offline like the rest of the app

### Digital menu & QR catalogue (`/menu`)

565. Build a customer-facing menu or price list straight from your stock
566. Auto-grouped by category with clean section headings
567. 1, 2 or 3 column layouts for different paper and screen sizes
568. Search filter to include only the items you want
569. Category filter for a single-section menu
570. Hide out-of-stock items with one toggle
571. Favourites-only mode for a short "best sellers" menu
572. Optional item codes / barcodes printed next to each item
573. Custom menu title (different from the shop name)
574. Live in-app preview of exactly what will print
575. Print-ready A4 output with a light theme for paper
576. Download the menu as a standalone, self-contained HTML file
577. Responsive menu file — looks right on a customer's phone too
578. WhatsApp the whole menu as formatted text
579. QR code generator pointing at any link (your hosted menu)
580. QR preview at 320px with instant regeneration as you type the link
581. Save the QR as a PNG
582. Printable table-tent / counter card with the QR and shop name
583. Step-by-step Hinglish instructions for hosting and sharing the menu
584. Item count, section count and favourites stats

### Smart auto reorder (`/autopo`)

585. Analyses real sales velocity to tell you what to buy
586. Configurable sales-history window (default 30 days)
587. Configurable stock-cover target (default 21 days)
588. Per-product sold quantity, per-day rate and days-of-cover left
589. Suggested order quantity that accounts for current stock and low-stock level
590. Reason shown for every suggestion (out of stock, below low level, low cover)
591. "Only low / out of stock" toggle, or plan a full top-up
592. Suggestions grouped by vendor, biggest lists first
593. Vendor filter, plus an Unassigned bucket for products with no supplier
594. Editable order quantity on every line
595. Skip a line without losing the rest of the plan
596. Live purchase value of the whole plan
597. Value per vendor group before you commit
598. One-click **Create PO** per vendor — a real draft purchase order
599. **Create all POs** to raise every vendor order at once
600. Auto-generated PO number and a note recording the formula used
601. WhatsApp the order list straight to the vendor's number
602. CSV export of the full reorder plan
603. Out-of-stock-and-selling counter so nothing profitable stays empty
604. Days-of-cover colour warning under 7 days
605. Reset button to rebuild suggestions from scratch
606. Activity-log entry for every auto-generated PO

### WhatsApp marketing campaigns (`/campaigns`)

607. Campaign screen for targeted WhatsApp marketing
608. Seven ready-made customer segments
609. VIP segment with an adjustable minimum-spend threshold
610. Lapsed-customer segment with an adjustable inactivity window
611. Birthday-today segment pulled from customer records
612. Outstanding-dues segment for polite payment nudges
613. Points-to-redeem segment to bring loyalty members back
614. New-customers (last 30 days) segment
615. Everyone segment, automatically skipping blocked customers
616. Six pre-written Hinglish message templates
617. Personalisation variables: name, full name, shop, phone, due, points, spend
618. Live preview of the message rendered for a real customer
619. Character counter and copy-to-clipboard
620. Send to a single customer with one tap
621. Bulk send: opens WhatsApp for up to 20 customers, staggered so nothing is blocked
622. Sent markers so you know who has already been messaged
623. Audience list with spend, visits, points, dues and last visit
624. Segment stats: size, average spend and lifetime revenue
625. CSV export of the segment including each personalised message
626. Works with WhatsApp Web on desktop and the app on mobile

### Platform & plumbing

627. Database schema upgraded to **v5** with four new stores (gift cards, write-offs, targets, tasks)
628. 31 tables now covered by backup, restore and the compressed backup file
629. Four new live-query hooks so new screens update instantly across tabs
630. Nine new lazy-loaded routes — first paint stays fast
631. Nine new navigation entries, grouped logically in the sidebar and command palette
632. New screens are searchable from the ⌘K command palette
633. All new pages follow the same AMOLED-black, mobile-first design system
634. Every new screen is fully responsive from 360px phones to desktop
635. Type-safe throughout — zero TypeScript errors in the build
636. Service worker bumped to v11.0 so all devices update cleanly

### What-if lab — pricing, margin & breakeven (`/simulator`)

637. Business simulator built on your real last-30-days numbers
638. Price-change slider (−30% to +30%) with instant profit impact
639. Volume-change slider to model a busy or slow month
640. Purchase-cost slider for supplier price hikes
641. Extra fixed-cost input (new staff, new rent) in the same scenario
642. Before vs after comparison of revenue, COGS and profit
643. Verdict line in Hinglish: profit kitna badhega ya ghatega
644. New gross-margin percentage for the scenario
645. One-tap preset scenarios (+5% price −5% volume, push volume, supplier hike)
646. Reset button to clear all levers
647. Margin calculator tab: cost, selling price, GST and target margin
648. Handles both tax-inclusive and tax-extra pricing automatically
649. Shows base price, profit per unit, margin % and markup %
650. GST amount broken out per unit
651. Reverse calculation: the exact price needed for a target margin
652. Catalogue-wide average margin and below-cost item count for context
653. Breakeven tab using your real gross margin
654. Monthly, daily and per-bill breakeven figures
655. Quick fixed-cost presets (₹30k / ₹60k / ₹1L / ₹2L)
656. Above / below breakeven verdict with the exact gap
657. Discount-impact tab: how much extra you must sell to fund a discount
658. Warns when a discount is larger than your margin (loss on every bill)
659. Profit per ₹100 bill shown before and after the discount
660. Everything recalculates instantly, fully offline

### Customer feedback & NPS (`/feedback`)

661. Feedback screen with proper Net Promoter Score tracking
662. 0–10 NPS picker with promoter / passive / detractor colouring
663. Separate 1–5 star rating
664. Live NPS score calculated across all responses
665. Average star rating headline
666. Promoter percentage and open-complaint counters
667. Eight feedback tags (service, price, quality, staff, waiting time…)
668. Top-tags summary so you see the repeating problem instantly
669. Free-text comment for what the customer actually said
670. Link feedback to a customer record or keep it as walk-in
671. Link feedback to a recent bill for full context
672. Source tracking: counter, WhatsApp, QR or phone call
673. "Needs follow-up" tab listing unresolved detractors
674. Mark a complaint resolved once you have fixed it
675. One-tap WhatsApp reply with a tone-appropriate pre-written message
676. Delete feedback with undo
677. CSV export of all feedback for deeper analysis
678. Google review QR generator from any review link
679. Printable counter card with the review QR
680. New `feedback` store (database schema v6), included in backups
681. Activity log entry for every feedback captured

### Dashboard & platform additions

682. New **Aaj ka focus** panel on the dashboard
683. Monthly revenue target progress shown right on the home screen
684. Pace marker on the dashboard target bar (ahead / behind today)
685. Tasks-due-today list on the dashboard with priority flags
686. Open-task counter with one-tap jump to the task board
687. Focus panel hides itself when no target and no tasks are set
688. Eleven new screens in total this release, all lazy-loaded
689. Navigation regrouped so Money / Relations / Ops stay readable
690. Every new screen reachable from the ⌘K command palette
691. Database schema now at **v6** with 32 backed-up tables
692. Full TypeScript type-check and production build pass with zero errors
693. Service worker bumped so every installed device updates itself
694. README and FEATURES documentation refreshed for v11

### Gift card payments at the POS

695. Gift cards & wallets are now accepted as payment at the POS
696. Wallet payment mode asks for a card code and validates it live
697. Card lookup checks that the card exists, is active and is not expired
698. Balance is shown before you confirm the payment
699. Full-cover case: card pays the whole bill and shows the remaining balance
700. Partial-cover case: app tells you exactly how much to collect separately
701. Card balance is deducted and a redeem entry is written to its history on confirm
702. Card code can be typed or scanned, Enter checks it instantly
703. Loyalty liability on the Gift & Wallet screen updates the moment a card is used


### In-app feature index (`/features`)

704. In-app **Feature Index** screen listing every documented feature
705. Full-text search across all features and sections
706. Search by feature number as well as by words
707. Filter by release (v7, v8, v9, v10, v11…)
708. Features grouped by module with a count per section
709. Live totals: total features, matching results and section count
710. App version badge shown next to the counts
711. Export the filtered feature list as CSV
712. Download the complete FEATURES.md from inside the app
713. Works offline — the feature list ships with the app bundle

**Total: 713 documented features.**

