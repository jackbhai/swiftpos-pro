/** Ten complete business systems.
 *  Choosing a system re-wires the whole app: screens, wording, POS capture fields,
 *  billing defaults, dashboard focus and workflow — not just the shop name. */
import type { ShopTypeId } from './shopProfiles';

export type SystemId =
  | 'rms' | 'pharmacy' | 'kirana' | 'retail' | 'electronics'
  | 'salon' | 'hardware' | 'bakery' | 'cafe' | 'garage';

export type CapKey =
  | 'tables' | 'kot' | 'token' | 'courses' | 'modifiers' | 'delivery'
  | 'batchExpiry' | 'prescription' | 'scheduleH' | 'saltSearch' | 'substitutes'
  | 'weighScale' | 'mrpMode' | 'looseItems'
  | 'variants' | 'sizeColor' | 'serialNumbers' | 'warranty' | 'amc'
  | 'jobCards' | 'appointments' | 'stylists' | 'memberships' | 'packages'
  | 'vehicle' | 'labour' | 'recipes' | 'production' | 'subscriptions' | 'loyalty';

export interface CaptureField {
  key: string; label: string; hint?: string;
  type: 'text' | 'number' | 'date' | 'select' | 'phone';
  options?: string[]; required?: boolean; scope: 'bill' | 'line';
  printOnBill?: boolean;
}

export interface BusinessSystem {
  id: SystemId;
  base: ShopTypeId;              // wording profile reused from shopProfiles
  label: string; short: string; emoji: string; blurb: string;
  accent: 'cyan' | 'mint' | 'violet' | 'amber' | 'rose' | 'lime';
  caps: CapKey[];                // capabilities switched ON
  screens: string[];             // navigation whitelist (paths)
  home: string[];                // quick-action tiles on dashboard
  capture: CaptureField[];       // extra fields captured at billing
  defaults: Record<string, any>; // settings applied on activation
  workflow: string[];            // how a day runs in this system
  highlights: string[];          // what makes it a *complete* system
}

const COMMON = [
  '/', '/pos', '/inventory', '/sales', '/returns', '/customers', '/vendors',
  '/purchases', '/autopo', '/expenses', '/ledger', '/reports', '/tax', '/dayclose',
  '/insights', '/simulator', '/targets', '/tasks', '/staff', '/attendance',
  '/activity', '/backup', '/cleanup', '/settings', '/features', '/help', '/cloud',
  '/labels', '/stocktake', '/offers', '/loyalty', '/pricing', '/writeoff',
  '/campaigns', '/feedback', '/reminders', '/quotes', '/display', '/branches',
];

export const SYSTEMS: BusinessSystem[] = [
  {
    id: 'rms', base: 'restaurant', label: 'Restaurant Management System (RMS)', short: 'Restaurant', emoji: '🍽️',
    blurb: 'Table floor, KOT to kitchen, courses, modifiers, delivery channels, recipe costing.',
    accent: 'amber',
    caps: ['tables', 'kot', 'token', 'courses', 'modifiers', 'delivery', 'variants', 'recipes', 'production', 'loyalty'],
    screens: [...COMMON, '/tables', '/orders', '/menu', '/recipes', '/subscriptions'],
    home: ['/pos', '/tables', '/orders', '/menu'],
    capture: [
      { key: 'tableNo', label: 'Table / Token', type: 'text', scope: 'bill', printOnBill: true, hint: 'Dine-in table ya token number' },
      { key: 'guests', label: 'Guests (pax)', type: 'number', scope: 'bill' },
      { key: 'waiter', label: 'Steward / Waiter', type: 'text', scope: 'bill', printOnBill: true },
      { key: 'course', label: 'Course', type: 'select', scope: 'line', options: ['Starter', 'Main', 'Dessert', 'Beverage'] },
      { key: 'cooking', label: 'Cooking note', type: 'text', scope: 'line', hint: 'Kam mirchi, jain, extra cheese…' },
    ],
    defaults: {
      restaurantMode: true, serviceChargeEnabled: true, serviceChargePct: 5, autoPrintKot: true,
      defaultGst: 5, posLayout: 'grid', printPaper: '80mm', kotTemplate: 'kot-kitchen', taxInclusive: false,
      footerNote: 'Thank you! Visit again 🙏', packagingCharge: 10,
    },
    workflow: ['Table select ya token', 'Dish add + cooking note', 'KOT kitchen ko auto print', 'Course-wise serve', 'Bill + service charge', 'Table free + feedback'],
    highlights: [
      'Floor plan with live table status, guest count and running bill',
      'KOT printing per order and per course, with modifier notes',
      'Dine-in / takeaway / delivery / online channels on the same bill screen',
      'Kitchen Display (KDS) board with order ageing',
      'Recipe/BOM costing so every dish shows real margin',
      'Menu engineering: stars, plough-horses, dogs from real sales',
    ],
  },
  {
    id: 'pharmacy', base: 'pharmacy', label: 'Medical Store / Pharmacy System', short: 'Pharmacy', emoji: '💊',
    blurb: 'Batch + expiry, Rx capture, schedule-H register, salt search, substitutes, distributor returns.',
    accent: 'mint',
    caps: ['batchExpiry', 'prescription', 'scheduleH', 'saltSearch', 'substitutes', 'mrpMode', 'subscriptions', 'loyalty'],
    screens: [...COMMON, '/subscriptions', '/service'],
    home: ['/pos', '/inventory', '/writeoff', '/autopo'],
    capture: [
      { key: 'doctor', label: 'Doctor name', type: 'text', scope: 'bill', printOnBill: true, hint: 'Prescribing doctor' },
      { key: 'rxNo', label: 'Prescription no.', type: 'text', scope: 'bill', printOnBill: true },
      { key: 'patientAge', label: 'Patient age', type: 'number', scope: 'bill' },
      { key: 'batch', label: 'Batch', type: 'text', scope: 'line', printOnBill: true },
      { key: 'expiry', label: 'Expiry', type: 'date', scope: 'line', printOnBill: true },
    ],
    defaults: {
      defaultGst: 12, posLayout: 'list', expiryAlertDays: 90, showHsn: true, taxInclusive: true,
      negativeStock: false, printPaper: '80mm', termsText: 'Drugs sold once are not returnable. Keep out of reach of children.',
    },
    workflow: ['Patient + doctor entry', 'Salt/brand se search', 'Batch & expiry pick', 'Schedule-H flag', 'Bill + Rx number print', 'Expiry register update'],
    highlights: [
      'Batch-wise stock with expiry, near-expiry alerts at 90 days',
      'Prescription capture: doctor, Rx number, patient age on the bill',
      'Schedule-H / narcotic flag with a printable register',
      'Salt / composition search and cheaper substitute suggestions',
      'MRP-based billing with distributor rate and margin tracking',
      'Expiry write-off register for distributor credit notes',
    ],
  },
  {
    id: 'kirana', base: 'grocery', label: 'Kirana / Supermarket System', short: 'Kirana', emoji: '🛒',
    blurb: 'Barcode speed billing, loose weight, monthly khata, home delivery, repeat baskets.',
    accent: 'cyan',
    caps: ['weighScale', 'looseItems', 'batchExpiry', 'mrpMode', 'delivery', 'subscriptions', 'loyalty'],
    screens: [...COMMON, '/orders', '/subscriptions', '/menu'],
    home: ['/pos', '/inventory', '/ledger', '/autopo'],
    capture: [
      { key: 'delivery', label: 'Home delivery', type: 'select', scope: 'bill', options: ['No', 'Yes — today', 'Yes — tomorrow'] },
      { key: 'area', label: 'Delivery area', type: 'text', scope: 'bill' },
      { key: 'weight', label: 'Weight (kg)', type: 'number', scope: 'line' },
    ],
    defaults: { defaultGst: 5, posLayout: 'grid', taxInclusive: true, allowCredit: true, quickCash: [50, 100, 200, 500, 2000] },
    workflow: ['Barcode scan / weigh', 'Loose item quantity', 'Monthly khata customer', 'UPI ya cash', 'Home delivery slip', 'Din ka hisaab'],
    highlights: [
      'Fast barcode billing tuned for 25,000+ SKUs',
      'Loose / weighed items with kg-g conversion at the counter',
      'Monthly khata (udhaar) with statement and WhatsApp reminders',
      'Repeat basket: last order dobara ek tap me',
      'Home-delivery slips and delivery-area tagging',
      'MRP vs selling price control across the whole catalogue',
    ],
  },
  {
    id: 'retail', base: 'fashion', label: 'Retail / Fashion Store System', short: 'Retail', emoji: '👗',
    blurb: 'Size-colour matrix, barcode tags, exchange window, seasonal pricing, wholesale rates.',
    accent: 'rose',
    caps: ['variants', 'sizeColor', 'mrpMode', 'memberships', 'loyalty'],
    screens: [...COMMON, '/menu'],
    home: ['/pos', '/inventory', '/labels', '/pricing'],
    capture: [
      { key: 'size', label: 'Size', type: 'select', scope: 'line', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free'] },
      { key: 'colour', label: 'Colour', type: 'text', scope: 'line' },
      { key: 'salesman', label: 'Salesman', type: 'text', scope: 'bill', printOnBill: true },
    ],
    defaults: { defaultGst: 5, posLayout: 'grid', showImages: true, labelShowMrp: true, taxInclusive: true },
    workflow: ['Style + size pick', 'Trial & exchange note', 'Salesman tag', 'Discount / offer', 'Bill + exchange terms', 'Season-end pricing'],
    highlights: [
      'Size × colour variant matrix per style with separate stock',
      'Barcode/price tag printing in sheets for the whole rack',
      'Exchange window rules printed on every bill',
      'Salesman-wise sales and commission reporting',
      'Wholesale / retail rate cards for the same catalogue',
      'Season-end markdown planning in the What-if lab',
    ],
  },
  {
    id: 'electronics', base: 'electronics', label: 'Electronics / Mobile Shop System', short: 'Electronics', emoji: '📱',
    blurb: 'IMEI & serial tracking, warranty register, EMI bills, repair job cards, AMC.',
    accent: 'violet',
    caps: ['serialNumbers', 'warranty', 'amc', 'jobCards', 'variants', 'loyalty'],
    screens: [...COMMON, '/service', '/appointments'],
    home: ['/pos', '/service', '/inventory', '/ledger'],
    capture: [
      { key: 'imei', label: 'IMEI / Serial no.', type: 'text', scope: 'line', printOnBill: true, required: true },
      { key: 'warranty', label: 'Warranty (months)', type: 'number', scope: 'line', printOnBill: true },
      { key: 'finance', label: 'Payment plan', type: 'select', scope: 'bill', options: ['Full payment', 'EMI - Bajaj', 'EMI - Card', 'Exchange'] },
    ],
    defaults: { defaultGst: 18, posLayout: 'list', showHsn: true, taxInclusive: true, printPaper: 'A4', a4Template: 'a4-tax-invoice' },
    workflow: ['Model select', 'IMEI scan', 'Warranty months', 'EMI / exchange', 'A4 GST invoice', 'Service job card baad me'],
    highlights: [
      'IMEI / serial captured per unit and printed on the invoice',
      'Warranty register searchable by IMEI, with expiry dates',
      'Repair job cards: intake, estimate, parts, delivery',
      'AMC and extended-warranty tracking',
      'EMI / exchange payment plans recorded on the bill',
      'A4 GST tax invoice as the default print format',
    ],
  },
  {
    id: 'salon', base: 'salon', label: 'Salon / Spa / Clinic System', short: 'Salon', emoji: '💇',
    blurb: 'Appointments, stylist commission, service packages, memberships, client history.',
    accent: 'violet',
    caps: ['appointments', 'stylists', 'memberships', 'packages', 'variants', 'loyalty'],
    screens: [...COMMON, '/appointments', '/service', '/subscriptions', '/menu'],
    home: ['/appointments', '/pos', '/customers', '/loyalty'],
    capture: [
      { key: 'stylist', label: 'Stylist / therapist', type: 'text', scope: 'line', printOnBill: true, required: true },
      { key: 'duration', label: 'Duration (min)', type: 'number', scope: 'line' },
      { key: 'membership', label: 'Membership used', type: 'select', scope: 'bill', options: ['None', 'Silver', 'Gold', 'Platinum', 'Package session'] },
    ],
    defaults: { defaultGst: 18, posLayout: 'list', loyaltyEnabled: true, taxInclusive: true, serviceChargeEnabled: false },
    workflow: ['Appointment book', 'Client check-in', 'Service + stylist', 'Package session deduct', 'Bill + tip', 'Next visit reminder'],
    highlights: [
      'Appointment calendar with slots, reminders and no-show tracking',
      'Stylist-wise revenue and commission calculation',
      'Prepaid service packages with session-by-session deduction',
      'Membership tiers with automatic pricing',
      'Client history: last service, formula, allergies in notes',
      'Automatic "time for next visit" WhatsApp campaigns',
    ],
  },
  {
    id: 'hardware', base: 'hardware', label: 'Hardware / Building Material System', short: 'Hardware', emoji: '🔩',
    blurb: 'Bulk units, cut-length billing, contractor rates, site delivery, credit khata.',
    accent: 'amber',
    caps: ['weighScale', 'looseItems', 'variants', 'warranty', 'delivery', 'labour'],
    screens: [...COMMON, '/orders'],
    home: ['/pos', '/quotes', '/ledger', '/pricing'],
    capture: [
      { key: 'site', label: 'Site / project', type: 'text', scope: 'bill', printOnBill: true },
      { key: 'vehicle', label: 'Vehicle no.', type: 'text', scope: 'bill', printOnBill: true },
      { key: 'length', label: 'Length / size', type: 'text', scope: 'line' },
    ],
    defaults: { defaultGst: 18, posLayout: 'list', allowCredit: true, showHsn: true, taxInclusive: false, printPaper: 'A4' },
    workflow: ['Contractor rate list', 'Bulk qty / cut length', 'Site + vehicle detail', 'Challan + GST bill', 'Credit khata', 'Monthly settlement'],
    highlights: [
      'Contractor / builder rate cards separate from counter rates',
      'Bulk units: bag, quintal, ton, running feet, cut lengths',
      'Site and vehicle details printed on delivery challans',
      'Heavy credit khata with ageing and statement WhatsApp',
      'Quotation → order → delivery → invoice flow',
      'Labour / freight charge lines on any bill',
    ],
  },
  {
    id: 'bakery', base: 'bakery', label: 'Bakery / Sweet Shop System', short: 'Bakery', emoji: '🧁',
    blurb: 'Weight billing, production batches, custom cake orders, festival pre-booking.',
    accent: 'rose',
    caps: ['weighScale', 'looseItems', 'batchExpiry', 'recipes', 'production', 'delivery', 'variants', 'loyalty'],
    screens: [...COMMON, '/orders', '/recipes', '/menu', '/subscriptions'],
    home: ['/pos', '/orders', '/recipes', '/menu'],
    capture: [
      { key: 'orderFor', label: 'Order for (date/time)', type: 'date', scope: 'bill', printOnBill: true },
      { key: 'message', label: 'Cake message', type: 'text', scope: 'line', printOnBill: true },
      { key: 'weight', label: 'Weight (kg)', type: 'number', scope: 'line' },
    ],
    defaults: { defaultGst: 5, posLayout: 'grid', expiryAlertDays: 7, taxInclusive: true, packagingCharge: 20 },
    workflow: ['Counter ya advance order', 'Weight / piece billing', 'Cake message + delivery date', 'Advance payment', 'Production batch', 'Pickup / delivery'],
    highlights: [
      'Weight-based billing with per-kg and per-piece pricing',
      'Advance / pre-booking orders with delivery date and token',
      'Custom cake message and design notes on the kitchen slip',
      'Production batches from recipes with raw-material deduction',
      'Short shelf-life expiry alerts (default 7 days)',
      'Festival pre-booking list with a pickup schedule',
    ],
  },
  {
    id: 'cafe', base: 'cafe', label: 'Cafe / QSR / Food Court System', short: 'Cafe', emoji: '☕',
    blurb: 'Token counter service, size variants, add-on modifiers, combo deals, quick settle.',
    accent: 'lime',
    caps: ['token', 'kot', 'modifiers', 'variants', 'delivery', 'recipes', 'loyalty', 'tables'],
    screens: [...COMMON, '/orders', '/tables', '/menu', '/recipes'],
    home: ['/pos', '/orders', '/menu', '/display'],
    capture: [
      { key: 'token', label: 'Token no.', type: 'number', scope: 'bill', printOnBill: true },
      { key: 'size', label: 'Size', type: 'select', scope: 'line', options: ['Regular', 'Medium', 'Large'] },
      { key: 'addons', label: 'Add-ons', type: 'text', scope: 'line', hint: 'Extra shot, no sugar…' },
    ],
    defaults: { defaultGst: 5, posLayout: 'grid', autoPrint: true, taxInclusive: true, printPaper: '58mm', askTender: false },
    workflow: ['Item tap', 'Size + add-on', 'Token generate', 'Instant pay', 'Counter display call', 'Combo upsell'],
    highlights: [
      'Token-number service flow with a customer-facing display',
      'One-tap size variants and add-on modifiers with price deltas',
      'Combo / meal deals with automatic pricing',
      '58mm quick receipts with auto-print for speed',
      'Peak-hour analytics to plan staffing',
      'Recipe costing for every drink and add-on',
    ],
  },
  {
    id: 'garage', base: 'general', label: 'Auto Garage / Service Centre System', short: 'Garage', emoji: '🛠️',
    blurb: 'Vehicle history, job cards, labour + parts billing, estimates, service reminders.',
    accent: 'cyan',
    caps: ['vehicle', 'jobCards', 'labour', 'warranty', 'amc', 'appointments', 'serialNumbers'],
    screens: [...COMMON, '/service', '/appointments', '/orders'],
    home: ['/service', '/pos', '/quotes', '/appointments'],
    capture: [
      { key: 'vehicleNo', label: 'Vehicle number', type: 'text', scope: 'bill', printOnBill: true, required: true },
      { key: 'odometer', label: 'Odometer (km)', type: 'number', scope: 'bill', printOnBill: true },
      { key: 'model', label: 'Make / model', type: 'text', scope: 'bill', printOnBill: true },
      { key: 'labour', label: 'Labour charge', type: 'number', scope: 'line' },
    ],
    defaults: { defaultGst: 18, posLayout: 'list', printPaper: 'A4', taxInclusive: false, allowCredit: true },
    workflow: ['Vehicle intake + photos note', 'Job card + estimate', 'Parts issue', 'Labour lines', 'Final invoice', 'Next service reminder'],
    highlights: [
      'Vehicle-wise service history by registration number',
      'Job cards: complaint → estimate → approval → delivery',
      'Separate labour and parts lines with different GST rates',
      'Odometer logging and automatic next-service reminders',
      'Estimate → invoice conversion without re-typing',
      'Warranty / AMC tracking on parts and jobs',
    ],
  },
];

export const getSystem = (id?: string): BusinessSystem =>
  SYSTEMS.find((x) => x.id === id) ?? SYSTEMS[0];

export const hasCap = (sys: BusinessSystem, cap: CapKey) => sys.caps.includes(cap);

/** Screens a system does not use are hidden from navigation (user can force-show all). */
export const screenAllowed = (sys: BusinessSystem, path: string) => sys.screens.includes(path);
