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
