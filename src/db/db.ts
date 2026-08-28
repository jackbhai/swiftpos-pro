import Dexie, { Table as DexTable } from 'dexie';
import type {
  Product, Sale, Customer, Vendor, PurchaseOrder, Expense, StockLog,
  Activity, HeldBill, Coupon, Staff, Shift, Table, Reservation, CustomTemplate, Quote,
  LedgerEntry, Order, Attendance, PayrollRule, Recipe, Subscription,
} from './types';

export class SwiftDB extends Dexie {
  products!: DexTable<Product, string>;
  sales!: DexTable<Sale, string>;
  customers!: DexTable<Customer, string>;
  vendors!: DexTable<Vendor, string>;
  purchaseOrders!: DexTable<PurchaseOrder, string>;
  expenses!: DexTable<Expense, string>;
  stockLogs!: DexTable<StockLog, string>;
  activity!: DexTable<Activity, string>;
  holds!: DexTable<HeldBill, string>;
  coupons!: DexTable<Coupon, string>;
  staff!: DexTable<Staff, string>;
  shifts!: DexTable<Shift, string>;
  restaurantTables!: DexTable<Table, string>;
  reservations!: DexTable<Reservation, string>;
  templates!: DexTable<CustomTemplate, string>;
  quotes!: DexTable<Quote, string>;
  ledger!: DexTable<LedgerEntry, string>;
  orders!: DexTable<Order, string>;
  attendance!: DexTable<Attendance, string>;
  payroll!: DexTable<PayrollRule, string>;
  recipes!: DexTable<Recipe, string>;
  subscriptions!: DexTable<Subscription, string>;

  constructor() {
    super('swiftpos-pro-v7');
    this.version(1).stores({
      products: 'id, name, sku, barcode, category, stock, active, favorite, vendorId, expiry, updatedAt',
      sales: 'id, invoiceNo, ts, customerId, payMode, status, staffId, shiftId',
      customers: 'id, name, phone, points, credit, lastVisit, totalSpend',
      vendors: 'id, name, phone',
      purchaseOrders: 'id, poNo, vendorId, status, createdAt',
      expenses: 'id, ts, category',
      stockLogs: 'id, productId, ts, type',
      activity: 'id, ts, type',
      holds: 'id, ts',
      coupons: 'id, code, active',
      staff: 'id, name, role, active',
      shifts: 'id, openedAt, closedAt',
      restaurantTables: 'id, name, area, status',
      reservations: 'id, ts, status',
    });
    this.version(2).stores({
      templates: 'id, name, paper, createdAt',
      quotes: 'id, ts, customerId, status',
    });
    this.version(3).stores({
      ledger: 'id, ts, party, partyId, direction',
      orders: 'id, orderNo, ts, status, channel, customerId',
      attendance: 'id, staffId, date, status',
      payroll: 'id, staffId',
      recipes: 'id, productId, updatedAt',
      subscriptions: 'id, customerId, nextDue, active',
    });
  }
}

export const db = new SwiftDB();

export const uid = (p = '') =>
  p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export async function logActivity(type: string, message: string, by?: string) {
  await db.activity.add({ id: uid('a_'), ts: Date.now(), type, message, by });
  const count = await db.activity.count();
  if (count > 800) {
    const old = await db.activity.orderBy('ts').limit(count - 800).toArray();
    await db.activity.bulkDelete(old.map((o) => o.id));
  }
}

export async function addStockLog(
  productId: string, productName: string,
  type: StockLog['type'], qty: number, before: number, after: number, ref?: string,
) {
  await db.stockLogs.add({ id: uid('s_'), productId, productName, type, qty, before, after, ts: Date.now(), ref });
}
