export type ID = string;

export interface Product {
  id: ID;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  unit: 'pc' | 'kg' | 'g' | 'l' | 'ml' | 'box' | 'pack' | 'dozen';
  cost: number;
  price: number;
  mrp?: number;
  stock: number;
  lowStock: number;
  gst: number;
  hsn?: string;
  vendorId?: ID;
  brand?: string;
  favorite?: boolean;
  active: boolean;
  trackStock: boolean;
  batch?: string;
  expiry?: string;      // ISO date
  rack?: string;
  image?: string;       // emoji or data-uri
  tags?: string[];
  variants?: { name: string; price: number; stock: number }[];
  createdAt: number;
  updatedAt: number;
}

export interface CartLine {
  id: ID;               // line id
  productId: ID;
  name: string;
  qty: number;
  price: number;        // unit price after price-override
  basePrice: number;
  cost: number;
  gst: number;
  unit: string;
  discount: number;     // absolute per-line discount
  note?: string;
  variant?: string;
}

export type PayMode = 'cash' | 'upi' | 'card' | 'credit' | 'wallet' | 'split';

export interface SplitPart { mode: Exclude<PayMode, 'split'>; amount: number }

export interface Sale {
  id: ID;
  invoiceNo: string;
  ts: number;
  lines: CartLine[];
  subTotal: number;
  itemDiscount: number;
  billDiscount: number;
  couponCode?: string;
  couponValue: number;
  taxable: number;
  gstAmount: number;
  roundOff: number;
  serviceCharge?: number;
  deliveryCharge?: number;
  packagingCharge?: number;
  tip?: number;
  total: number;
  profit: number;
  payMode: PayMode;
  splits?: SplitPart[];
  tendered?: number;
  change?: number;
  customerId?: ID;
  customerName?: string;
  staffId?: ID;
  staffName?: string;
  note?: string;
  status: 'completed' | 'refunded' | 'partial-refund' | 'void';
  refundedAmount?: number;
  pointsEarned?: number;
  pointsRedeemed?: number;
  shiftId?: ID;
  channel?: 'counter' | 'delivery' | 'takeaway' | 'online';
  meta?: Record<string, any>;   // system-specific capture (table, Rx, IMEI, vehicle…)
  synced?: boolean;
}

export interface Customer {
  id: ID;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  birthday?: string;
  notes?: string;
  tags?: string[];
  points: number;
  credit: number;        // outstanding due
  creditLimit?: number;
  totalSpend: number;
  visits: number;
  lastVisit?: number;
  createdAt: number;
  blocked?: boolean;
}

export interface Vendor {
  id: ID; name: string; phone?: string; email?: string; gstin?: string;
  address?: string; payable: number; notes?: string; createdAt: number;
}

export interface POItem { productId: ID; name: string; qty: number; cost: number; received: number }

export interface PurchaseOrder {
  id: ID; poNo: string; vendorId: ID; vendorName: string; items: POItem[];
  status: 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';
  total: number; paid: number; createdAt: number; expectedAt?: string; receivedAt?: number; note?: string;
}

export interface Expense {
  id: ID; title: string; amount: number; category: string; ts: number;
  payMode: PayMode; note?: string; recurring?: boolean;
}

export interface StockLog {
  id: ID; productId: ID; productName: string; type: 'sale' | 'purchase' | 'adjust' | 'return' | 'damage' | 'transfer';
  qty: number; before: number; after: number; ts: number; ref?: string; by?: string;
}

export interface Activity { id: ID; ts: number; type: string; message: string; by?: string }

export interface HeldBill { id: ID; label: string; lines: CartLine[]; customerId?: ID; ts: number; note?: string }

export interface Coupon {
  id: ID; code: string; type: 'flat' | 'percent'; value: number; minBill: number;
  maxDiscount?: number; usageLimit?: number; used: number; active: boolean; expiry?: string;
}

export interface Staff {
  id: ID; name: string; pin: string; role: 'owner' | 'manager' | 'cashier';
  active: boolean; commissionPct?: number; createdAt: number;
}

export interface Shift {
  id: ID; staffId?: ID; staffName?: string; openedAt: number; closedAt?: number;
  openingCash: number; closingCash?: number; expected?: number; variance?: number; note?: string;
}

export interface Table { id: ID; name: string; area: string; seats: number; status: 'free' | 'occupied' | 'billed'; holdId?: ID }

export interface Reservation { id: ID; name: string; phone: string; ts: number; people: number; note?: string; status: 'booked' | 'seated' | 'cancelled' }

export interface CustomTemplate {
  id: ID; name: string; paper: '58mm' | '80mm' | 'A4'; html: string;
  desc?: string; createdAt: number; updatedAt: number;
}

export interface Quote {
  id: ID; quoteNo: string; ts: number; customerId?: ID; customerName?: string;
  lines: CartLine[]; total: number; validTill?: string; note?: string;
  status: 'open' | 'converted' | 'expired';
}

export interface LedgerEntry {
  id: ID; ts: number; party: 'customer' | 'vendor'; partyId: ID; partyName: string;
  direction: 'in' | 'out';           // in = money received, out = money paid
  amount: number; mode: PayMode; ref?: string; note?: string; by?: string;
  balanceAfter?: number;
}

export interface Order {
  id: ID; orderNo: string; ts: number; channel: 'dine-in' | 'takeaway' | 'delivery' | 'online' | 'pickup';
  status: 'new' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
  lines: CartLine[]; total: number; customerId?: ID; customerName?: string; phone?: string;
  address?: string; tableId?: ID; rider?: string; note?: string; saleId?: ID;
  promisedAt?: number; readyAt?: number; deliveredAt?: number; prepMinutes?: number;
}

export interface Attendance {
  id: ID; staffId: ID; staffName: string; date: string;   // YYYY-MM-DD
  inTs?: number; outTs?: number; minutes: number; status: 'present' | 'half' | 'absent' | 'leave';
  note?: string;
}

export interface PayrollRule {
  id: ID; staffId: ID; monthlySalary: number; hourlyRate?: number; commissionPct?: number;
  paidTill?: string; note?: string;
}

export interface Recipe {
  id: ID; productId: ID; productName: string; yield: number;
  items: { productId: ID; name: string; qty: number; unit: string }[];
  labourCost?: number; note?: string; updatedAt: number;
}

export interface Subscription {
  id: ID; customerId: ID; customerName: string; phone?: string; title: string;
  lines: CartLine[]; amount: number; every: 'day' | 'week' | 'month'; nextDue: string;
  active: boolean; lastBilled?: number; note?: string; createdAt: number;
}

export interface Branch {
  id: ID; name: string; code: string; address?: string; phone?: string;
  gstin?: string; active: boolean; isDefault?: boolean; createdAt: number;
}

export interface Transfer {
  id: ID; transferNo: string; ts: number; fromBranch: ID; fromName: string;
  toBranch: ID; toName: string; items: { productId: ID; name: string; qty: number; unit: string; cost: number }[];
  status: 'draft' | 'sent' | 'received' | 'cancelled'; note?: string; receivedAt?: number; value: number;
}

export interface ServiceJob {
  id: ID; jobNo: string; ts: number; customerId?: ID; customerName: string; phone?: string;
  item: string; brand?: string; serial?: string; issue: string; accessories?: string;
  status: 'received' | 'diagnosing' | 'awaiting-parts' | 'repairing' | 'ready' | 'delivered' | 'returned';
  estimate: number; finalAmount?: number; advance: number; technician?: string;
  promisedAt?: number; deliveredAt?: number; warrantyDays?: number; parts?: { name: string; qty: number; cost: number }[];
  note?: string;
}

export interface Appointment {
  id: ID; ts: number; durationMin: number; customerId?: ID; customerName: string; phone?: string;
  service: string; staffId?: ID; staffName?: string; price: number;
  status: 'booked' | 'confirmed' | 'arrived' | 'done' | 'no-show' | 'cancelled'; note?: string; createdAt: number;
}

export interface PriceList {
  id: ID; name: string; kind: 'percent' | 'fixed-margin' | 'manual'; value: number;
  customerTag?: string; items?: { productId: ID; price: number }[]; active: boolean; note?: string;
}

export interface GiftCard {
  id: ID; code: string; kind: 'gift' | 'wallet' | 'voucher'; issuedTo?: ID; issuedName?: string;
  phone?: string; faceValue: number; balance: number; issuedAt: number; expiry?: string;
  active: boolean; note?: string; history: { ts: number; amount: number; type: 'issue' | 'redeem' | 'topup' | 'expire'; ref?: string }[];
}

export interface WriteOff {
  id: ID; ts: number; productId: ID; productName: string; qty: number; unit: string;
  reason: 'damage' | 'expiry' | 'theft' | 'sample' | 'personal' | 'wastage' | 'other';
  cost: number; value: number; by?: string; note?: string; batch?: string;
}

export interface Target {
  id: ID; period: string;              // YYYY-MM
  scope: 'shop' | 'staff' | 'category';
  refId?: ID; refName?: string;
  metric: 'revenue' | 'profit' | 'bills' | 'items' | 'customers';
  value: number; note?: string; createdAt: number;
}

export interface Task {
  id: ID; title: string; detail?: string; due?: string; done: boolean;
  priority: 'low' | 'normal' | 'high'; assignee?: string; tag?: string;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly'; createdAt: number; doneAt?: number;
}

export interface Feedback {
  id: ID; ts: number; customerId?: ID; customerName?: string; phone?: string;
  score: number;            // 0-10 NPS
  rating: number;           // 1-5 stars
  comment?: string; tags?: string[]; saleId?: ID; billNo?: string;
  resolved?: boolean; reply?: string; source: 'counter' | 'whatsapp' | 'qr' | 'phone';
}

export interface SyncState {
  table: string; lastPush: number; lastPull: number;
  pushed: number; pulled: number; failed: number; lastError?: string;
}
export interface SyncLog {
  id: ID; ts: number; level: 'info' | 'warn' | 'error' | 'fix';
  table?: string; code?: string; message: string; fix?: string; fixed?: boolean; attempt?: number;
}
export interface DeviceRec {
  id: ID; name: string; platform: string; version: string;
  lastSeen: number; pushes: number; pulls: number; owner?: string; current?: boolean;
}
