import { db, uid } from './db';
import type { Product, Customer, Vendor, Coupon, Staff, Sale, Expense, Table } from './types';

const CAT: Record<string, string> = {
  Grocery: '🛒', Beverages: '🥤', Snacks: '🍿', Dairy: '🥛', Bakery: '🍞',
  Personal: '🧴', Household: '🧹', Stationery: '✏️', Electronics: '🔌', Frozen: '🧊',
};

export const CATEGORY_EMOJI = CAT;

const RAW: [string, string, number, number, number, number][] = [
  ['Basmati Rice 1kg', 'Grocery', 82, 115, 40, 5],
  ['Toor Dal 1kg', 'Grocery', 118, 152, 26, 5],
  ['Sunflower Oil 1L', 'Grocery', 121, 149, 32, 5],
  ['Wheat Atta 5kg', 'Grocery', 210, 265, 18, 5],
  ['Sugar 1kg', 'Grocery', 41, 52, 55, 5],
  ['Iodized Salt 1kg', 'Grocery', 18, 26, 70, 5],
  ['Tea Powder 500g', 'Beverages', 195, 260, 22, 5],
  ['Instant Coffee 100g', 'Beverages', 240, 315, 14, 18],
  ['Cola 750ml', 'Beverages', 30, 45, 60, 28],
  ['Orange Juice 1L', 'Beverages', 78, 110, 16, 12],
  ['Mineral Water 1L', 'Beverages', 12, 20, 96, 18],
  ['Energy Drink 250ml', 'Beverages', 82, 125, 24, 28],
  ['Potato Chips 52g', 'Snacks', 14, 20, 120, 12],
  ['Choco Cookies 200g', 'Snacks', 42, 60, 44, 18],
  ['Salted Peanuts 200g', 'Snacks', 38, 55, 30, 12],
  ['Instant Noodles', 'Snacks', 11, 15, 180, 18],
  ['Dark Chocolate 80g', 'Snacks', 95, 140, 26, 18],
  ['Full Cream Milk 1L', 'Dairy', 54, 68, 42, 0],
  ['Paneer 200g', 'Dairy', 72, 95, 18, 5],
  ['Butter 100g', 'Dairy', 48, 62, 25, 12],
  ['Curd 400g', 'Dairy', 30, 42, 20, 5],
  ['Cheese Slices 200g', 'Dairy', 110, 145, 12, 12],
  ['Brown Bread', 'Bakery', 32, 45, 15, 5],
  ['Croissant', 'Bakery', 28, 45, 12, 5],
  ['Cup Cake Pack', 'Bakery', 45, 65, 18, 18],
  ['Shampoo 340ml', 'Personal', 195, 269, 20, 18],
  ['Toothpaste 150g', 'Personal', 78, 105, 34, 18],
  ['Bath Soap 125g', 'Personal', 28, 40, 65, 18],
  ['Face Wash 100ml', 'Personal', 122, 175, 18, 18],
  ['Hand Sanitizer 200ml', 'Personal', 55, 85, 22, 12],
  ['Detergent Powder 1kg', 'Household', 96, 135, 28, 18],
  ['Dish Wash Gel 750ml', 'Household', 105, 149, 20, 18],
  ['Floor Cleaner 1L', 'Household', 88, 130, 16, 18],
  ['Garbage Bags 30pc', 'Household', 60, 95, 24, 18],
  ['Notebook A4 200pg', 'Stationery', 42, 65, 40, 12],
  ['Gel Pen Pack 5', 'Stationery', 50, 80, 35, 12],
  ['Sticky Notes', 'Stationery', 30, 50, 28, 12],
  ['LED Bulb 9W', 'Electronics', 68, 110, 22, 18],
  ['USB-C Cable 1m', 'Electronics', 82, 149, 18, 18],
  ['AA Battery 4pc', 'Electronics', 65, 99, 30, 18],
  ['Power Bank 10000mAh', 'Electronics', 720, 999, 8, 18],
  ['Frozen Peas 500g', 'Frozen', 62, 89, 20, 5],
  ['Veg Nuggets 400g', 'Frozen', 118, 165, 14, 12],
  ['Ice Cream Tub 700ml', 'Frozen', 175, 245, 10, 18],
];

const FIRST = ['Aarav','Vivaan','Diya','Ananya','Kabir','Ishaan','Meera','Riya','Arjun','Sara','Rohan','Neha','Aditya','Pooja','Karan','Simran','Manav','Tara','Yash','Zoya'];
const LAST = ['Sharma','Verma','Gupta','Singh','Khan','Patel','Reddy','Nair','Iyer','Bose'];

function rnd(n: number) { return Math.floor(Math.random() * n); }

export async function seedIfEmpty(force = false) {
  const count = await db.products.count();
  if (count > 0 && !force) return false;
  const now = Date.now();

  const vendors: Vendor[] = ['Metro Wholesale', 'FreshLine Distributors', 'DailyMart Supply', 'ElectroHub Traders']
    .map((name, i) => ({ id: uid('v_'), name, phone: `98${10000000 + i * 4321}`, gstin: `07AAACS${1000 + i}A1Z${i}`, payable: 0, address: 'Delhi, IN', createdAt: now }));

  const products: Product[] = RAW.map(([name, category, cost, price, stock, gst], i) => ({
    id: uid('p_'), name, sku: 'SKU' + String(1001 + i),
    barcode: '890' + String(1000000000 + i * 7919).slice(0, 10),
    category, unit: 'pc', cost, price, mrp: Math.round(price * 1.12), stock,
    lowStock: 10, gst, hsn: String(1000 + rnd(8999)),
    vendorId: vendors[i % vendors.length].id, brand: ['Fresho', 'DailyGood', 'Nova', 'Prime'][i % 4],
    favorite: i % 9 === 0, active: true, trackStock: true,
    image: CAT[category], tags: [category.toLowerCase()],
    expiry: i % 6 === 0 ? new Date(now + (rnd(80) - 10) * 864e5).toISOString().slice(0, 10) : undefined,
    rack: `R${1 + (i % 8)}-${1 + (i % 4)}`,
    createdAt: now, updatedAt: now,
  }));

  const customers: Customer[] = Array.from({ length: 24 }, (_, i) => {
    const name = `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`;
    const spend = rnd(24000) + 500;
    return {
      id: uid('c_'), name, phone: `9${String(100000000 + rnd(899999999)).slice(0, 9)}`,
      email: name.toLowerCase().replace(' ', '.') + '@mail.com',
      points: Math.floor(spend / 100), credit: i % 7 === 0 ? rnd(2000) : 0, creditLimit: 5000,
      totalSpend: spend, visits: 1 + rnd(30), lastVisit: now - rnd(40) * 864e5,
      tags: i % 3 === 0 ? ['regular'] : [], createdAt: now - rnd(300) * 864e5,
    };
  });

  const coupons: Coupon[] = [
    { id: uid('cp_'), code: 'WELCOME10', type: 'percent', value: 10, minBill: 300, maxDiscount: 150, used: 0, active: true },
    { id: uid('cp_'), code: 'FLAT50', type: 'flat', value: 50, minBill: 500, used: 0, active: true },
    { id: uid('cp_'), code: 'BIG15', type: 'percent', value: 15, minBill: 1500, maxDiscount: 400, used: 0, active: true },
  ];

  const staff: Staff[] = [
    { id: uid('st_'), name: 'Owner', pin: '1234', role: 'owner', active: true, createdAt: now },
    { id: uid('st_'), name: 'Manager', pin: '2222', role: 'manager', active: true, commissionPct: 1, createdAt: now },
    { id: uid('st_'), name: 'Cashier 1', pin: '1111', role: 'cashier', active: true, commissionPct: 0.5, createdAt: now },
  ];

  const tables: Table[] = Array.from({ length: 8 }, (_, i) => ({
    id: uid('t_'), name: `T${i + 1}`, area: i < 4 ? 'Indoor' : 'Terrace', seats: 2 + (i % 3) * 2, status: 'free' as const,
  }));

  const expenses: Expense[] = [
    { id: uid('e_'), title: 'Shop Rent', amount: 18000, category: 'Rent', ts: now - 5 * 864e5, payMode: 'upi', recurring: true },
    { id: uid('e_'), title: 'Electricity Bill', amount: 3400, category: 'Utilities', ts: now - 3 * 864e5, payMode: 'upi' },
    { id: uid('e_'), title: 'Staff Salary', amount: 26000, category: 'Salary', ts: now - 2 * 864e5, payMode: 'cash', recurring: true },
    { id: uid('e_'), title: 'Packaging Material', amount: 1750, category: 'Supplies', ts: now - 1 * 864e5, payMode: 'cash' },
  ];

  // 60 days of synthetic sales history
  const sales: Sale[] = [];
  let inv = 1;
  for (let d = 59; d >= 0; d--) {
    const dayBase = now - d * 864e5;
    const orders = 4 + rnd(9);
    for (let o = 0; o < orders; o++) {
      const lineCount = 1 + rnd(5);
      const lines = Array.from({ length: lineCount }, () => {
        const p = products[rnd(products.length)];
        const qty = 1 + rnd(3);
        return {
          id: uid('l_'), productId: p.id, name: p.name, qty, price: p.price, basePrice: p.price,
          cost: p.cost, gst: p.gst, unit: p.unit, discount: 0,
        };
      });
      const subTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
      const gstAmount = lines.reduce((s, l) => s + (l.price * l.qty * l.gst) / (100 + l.gst), 0);
      const profit = lines.reduce((s, l) => s + (l.price - l.cost) * l.qty, 0);
      const total = Math.round(subTotal);
      const cust = rnd(10) > 5 ? customers[rnd(customers.length)] : undefined;
      const modes: Sale['payMode'][] = ['cash', 'upi', 'upi', 'card', 'cash', 'wallet'];
      sales.push({
        id: uid('sa_'), invoiceNo: 'INV-' + String(inv++).padStart(5, '0'),
        ts: dayBase - rnd(10) * 36e5, lines, subTotal, itemDiscount: 0, billDiscount: 0,
        couponValue: 0, taxable: subTotal - gstAmount, gstAmount: +gstAmount.toFixed(2),
        roundOff: +(total - subTotal).toFixed(2), total, profit: +profit.toFixed(2),
        payMode: modes[rnd(modes.length)], customerId: cust?.id, customerName: cust?.name,
        staffId: staff[rnd(staff.length)].id, staffName: staff[rnd(staff.length)].name,
        status: 'completed', channel: 'counter',
      });
    }
  }

  await db.transaction('rw', [db.products, db.customers, db.vendors, db.coupons, db.staff, db.sales, db.expenses, db.restaurantTables], async () => {
    await Promise.all([db.products.clear(), db.customers.clear(), db.vendors.clear(), db.coupons.clear(), db.staff.clear(), db.sales.clear(), db.expenses.clear(), db.restaurantTables.clear()]);
    await db.products.bulkAdd(products);
    await db.customers.bulkAdd(customers);
    await db.vendors.bulkAdd(vendors);
    await db.coupons.bulkAdd(coupons);
    await db.staff.bulkAdd(staff);
    await db.sales.bulkAdd(sales);
    await db.expenses.bulkAdd(expenses);
    await db.restaurantTables.bulkAdd(tables);
  });
  return true;
}
