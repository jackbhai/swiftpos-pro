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
