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
