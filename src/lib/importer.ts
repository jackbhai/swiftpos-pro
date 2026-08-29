/* Universal data importer.
   Accepts: SwiftPOS full backup, arrays of products/customers/vendors/sales,
   or "wrapped" objects like { products: [...] } / { data: [...] } / { inventory: [...] }.
   Field names are auto-mapped, so exports from other POS tools usually just work. */

import { db, uid, logActivity } from '@/db/db';
import type { Product, Customer, Vendor } from '@/db/types';
import { useSettings } from '@/store/settings';
import { importBackup } from './backup';
import { parseCSV } from './csv';

export type ImportKind = 'backup' | 'products' | 'customers' | 'vendors' | 'unknown';

export interface ImportOptions {
  mode: 'merge' | 'replace';       // merge = keep existing, replace = wipe that table first
  defaultMarginPct: number;        // used when cost is missing
  defaultGst: number;
  defaultLowStock: number;
  categoryFrom: 'category' | 'unit_type';  // which source field becomes the app category
  onProgress?: (done: number, total: number, label: string) => void;
}

export const defaultImportOptions = (): ImportOptions => ({
  mode: 'merge', defaultMarginPct: 25, defaultGst: useSettings.getState().defaultGst,
  defaultLowStock: 10, categoryFrom: 'category',
});

const pick = (o: any, keys: string[]) => {
  for (const k of keys) {
    const hit = Object.keys(o).find((x) => x.toLowerCase().replace(/[\s_-]/g, '') === k.toLowerCase().replace(/[\s_-]/g, ''));
    if (hit && o[hit] !== '' && o[hit] !== null && o[hit] !== undefined) return o[hit];
  }
  return undefined;
};
const numOf = (v: any, d = 0) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : d;
};

export function detectKind(data: any): ImportKind {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.app === 'SwiftPOS Pro') return 'backup';
    if (Array.isArray(data.products) || Array.isArray(data.inventory) || Array.isArray(data.items)) return 'products';
    if (Array.isArray(data.customers)) return 'customers';
    if (Array.isArray(data.vendors) || Array.isArray(data.suppliers)) return 'vendors';
    if (Array.isArray(data.data)) return detectKind(data.data);
    return 'unknown';
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row !== 'object') return 'unknown';
  const keys = Object.keys(row).map((k) => k.toLowerCase().replace(/[\s_-]/g, ''));
  const has = (...c: string[]) => c.some((x) => keys.includes(x));
  if (has('productname', 'itemname', 'name', 'product', 'medicinename', 'dish', 'sku', 'barcode') &&
      has('priceperunit', 'price', 'mrp', 'sellingprice', 'rate', 'stockquantity', 'stock', 'qty')) return 'products';
  if (has('phone', 'mobile', 'contact') && has('name', 'customername')) return 'customers';
  if (has('vendorname', 'suppliername')) return 'vendors';
  return 'unknown';
}

export function unwrap(data: any): any[] {
  if (Array.isArray(data)) return data;
  for (const k of ['products', 'inventory', 'items', 'customers', 'vendors', 'suppliers', 'data', 'rows', 'records']) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  return [];
}

/** Map one arbitrary row to a SwiftPOS product. */
export function mapProduct(row: any, o: ImportOptions, i: number): Product {
  const now = Date.now();
  const name = String(pick(row, ['product_name', 'productname', 'item_name', 'name', 'title', 'medicine_name', 'dish', 'description']) ?? `Item ${i + 1}`).trim();
  const price = numOf(pick(row, ['price_per_unit', 'selling_price', 'sale_price', 'price', 'rate', 'mrp', 'amount']), 0);
  const mrpRaw = numOf(pick(row, ['mrp', 'max_retail_price', 'list_price']), 0);
  const costRaw = numOf(pick(row, ['cost', 'cost_price', 'purchase_price', 'buy_price', 'wholesale_price']), 0);
  const cost = costRaw > 0 ? costRaw : +(price / (1 + o.defaultMarginPct / 100)).toFixed(2);
  const catField = o.categoryFrom === 'unit_type'
    ? pick(row, ['unit_type', 'sub_category', 'subcategory', 'type', 'category'])
    : pick(row, ['category', 'category_name', 'dept', 'department', 'group', 'unit_type']);
  const unitRaw = String(pick(row, ['unit', 'uom', 'measure']) ?? 'pc').toLowerCase();
  const unit = (['pc', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'dozen'] as const).find((u) => unitRaw.startsWith(u)) ?? 'pc';

  return {
    id: uid('p_'),
    name,
    sku: String(pick(row, ['sku', 'code', 'item_code', 'product_code']) ?? 'SKU' + String(i + 1).padStart(5, '0')),
    barcode: String(pick(row, ['barcode', 'ean', 'upc', 'gtin', 'product_id']) ?? '') || undefined,
    category: String(catField ?? 'General').trim() || 'General',
    unit,
    cost,
    price: price || +(cost * (1 + o.defaultMarginPct / 100)).toFixed(2),
    mrp: mrpRaw > price ? mrpRaw : Math.round((price || cost) * 1.1),
    stock: numOf(pick(row, ['stock_quantity', 'stock', 'qty', 'quantity', 'available', 'on_hand']), 0),
    lowStock: numOf(pick(row, ['low_stock', 'reorder_level', 'min_stock']), o.defaultLowStock),
    gst: numOf(pick(row, ['gst', 'tax', 'tax_rate', 'gst_rate', 'vat']), o.defaultGst),
    hsn: pick(row, ['hsn', 'hsn_code', 'sac']) ? String(pick(row, ['hsn', 'hsn_code', 'sac'])) : undefined,
    brand: pick(row, ['brand_name', 'brand', 'manufacturer', 'company', 'mfr']) ? String(pick(row, ['brand_name', 'brand', 'manufacturer', 'company', 'mfr'])).trim() : undefined,
    batch: pick(row, ['batch', 'batch_no', 'lot']) ? String(pick(row, ['batch', 'batch_no', 'lot'])) : undefined,
    expiry: pick(row, ['expiry', 'expiry_date', 'exp', 'best_before']) ? String(pick(row, ['expiry', 'expiry_date', 'exp', 'best_before'])).slice(0, 10) : undefined,
    rack: pick(row, ['rack', 'shelf', 'location', 'bin']) ? String(pick(row, ['rack', 'shelf', 'location', 'bin'])) : undefined,
    favorite: false,
    active: true,
    trackStock: true,
    image: pick(row, ['image', 'image_url', 'img_url', 'img', 'photo', 'picture', 'thumbnail', 'emoji', 'icon']) ? String(pick(row, ['image', 'image_url', 'img_url', 'img', 'photo', 'picture', 'thumbnail', 'emoji', 'icon'])) : undefined,
    tags: [String(pick(row, ['unit_type', 'sub_category']) ?? '').trim()].filter(Boolean),
    createdAt: now,
    updatedAt: now,
  };
}

export function mapCustomer(row: any, i: number): Customer {
  const now = Date.now();
  return {
    id: uid('c_'),
    name: String(pick(row, ['name', 'customer_name', 'full_name']) ?? `Customer ${i + 1}`),
    phone: String(pick(row, ['phone', 'mobile', 'contact', 'phone_number']) ?? ''),
    email: pick(row, ['email', 'mail']) ? String(pick(row, ['email', 'mail'])) : undefined,
    address: pick(row, ['address', 'addr', 'city']) ? String(pick(row, ['address', 'addr', 'city'])) : undefined,
    gstin: pick(row, ['gstin', 'gst_no', 'tax_id']) ? String(pick(row, ['gstin', 'gst_no', 'tax_id'])) : undefined,
    points: numOf(pick(row, ['points', 'loyalty_points']), 0),
    credit: numOf(pick(row, ['credit', 'due', 'balance', 'outstanding']), 0),
    totalSpend: numOf(pick(row, ['total_spend', 'lifetime_value', 'spend']), 0),
    visits: numOf(pick(row, ['visits', 'orders', 'order_count']), 0),
    createdAt: now,
  };
}

export function mapVendor(row: any, i: number): Vendor {
  return {
    id: uid('v_'),
    name: String(pick(row, ['vendor_name', 'supplier_name', 'name', 'company']) ?? `Vendor ${i + 1}`),
    phone: pick(row, ['phone', 'mobile', 'contact']) ? String(pick(row, ['phone', 'mobile', 'contact'])) : undefined,
    email: pick(row, ['email']) ? String(pick(row, ['email'])) : undefined,
    gstin: pick(row, ['gstin', 'gst_no']) ? String(pick(row, ['gstin', 'gst_no'])) : undefined,
    address: pick(row, ['address', 'city']) ? String(pick(row, ['address', 'city'])) : undefined,
    payable: numOf(pick(row, ['payable', 'due', 'balance']), 0),
    createdAt: Date.now(),
  };
}

export interface ImportResult { kind: ImportKind; inserted: number; skipped: number; message: string }

/** Parse text (JSON or CSV) then import. */
export async function importText(text: string, opts: ImportOptions): Promise<ImportResult> {
  const trimmed = text.trim();
  let data: any;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) data = JSON.parse(trimmed);
  else data = parseCSV(trimmed);
  return importData(data, opts);
}

export async function importData(data: any, opts: ImportOptions): Promise<ImportResult> {
  const kind = detectKind(data);
  if (kind === 'backup') {
    await importBackup(JSON.stringify(data), opts.mode === 'merge');
    await logActivity('import', 'Restored full SwiftPOS backup');
    return { kind, inserted: -1, skipped: 0, message: 'Full backup restored (all modules).' };
  }
  const rows = unwrap(data);
  if (!rows.length) return { kind: 'unknown', inserted: 0, skipped: 0, message: 'No rows found in file.' };

  if (kind === 'customers') {
    if (opts.mode === 'replace') await db.customers.clear();
    const mapped = rows.map(mapCustomer);
    await chunked(mapped, (c) => db.customers.bulkPut(c as any), opts, 'customers');
    await logActivity('import', `Imported ${mapped.length} customers`);
    return { kind, inserted: mapped.length, skipped: 0, message: `${mapped.length} customers imported.` };
  }
  if (kind === 'vendors') {
    if (opts.mode === 'replace') await db.vendors.clear();
    const mapped = rows.map(mapVendor);
    await chunked(mapped, (c) => db.vendors.bulkPut(c as any), opts, 'vendors');
    return { kind, inserted: mapped.length, skipped: 0, message: `${mapped.length} vendors imported.` };
  }

  // products (default)
  if (opts.mode === 'replace') await db.products.clear();
  const existing = opts.mode === 'merge' ? await db.products.toArray() : [];
  const seenBarcode = new Map(existing.filter((p) => p.barcode).map((p) => [p.barcode!, p.id]));
  const seenName = new Map(existing.map((p) => [p.name.toLowerCase(), p.id]));

  const mapped: Product[] = [];
  let skipped = 0;
  rows.forEach((r: any, i: number) => {
    const p = mapProduct(r, opts, i);
    if (!p.name) { skipped++; return; }
    const dupId = (p.barcode && seenBarcode.get(p.barcode)) || seenName.get(p.name.toLowerCase());
    if (dupId) { p.id = dupId; }           // upsert over the duplicate
    else { if (p.barcode) seenBarcode.set(p.barcode, p.id); seenName.set(p.name.toLowerCase(), p.id); }
    mapped.push(p);
  });

  await chunked(mapped, (c) => db.products.bulkPut(c), opts, 'products');
  await logActivity('import', `Imported ${mapped.length} products`);
  return { kind: 'products', inserted: mapped.length, skipped, message: `${mapped.length} products imported${skipped ? `, ${skipped} skipped` : ''}.` };
}

async function chunked<T>(items: T[], fn: (chunk: T[]) => Promise<any>, opts: ImportOptions, label: string) {
  const SIZE = 800;
  for (let i = 0; i < items.length; i += SIZE) {
    await fn(items.slice(i, i + SIZE));
    opts.onProgress?.(Math.min(i + SIZE, items.length), items.length, label);
    await new Promise((r) => setTimeout(r, 0));
  }
}

/** Fetch + import a remote/bundled JSON file (e.g. the demo catalogue). */
export async function importFromURL(url: string, opts: ImportOptions): Promise<ImportResult> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  return importData(await res.json(), opts);
}

export const SAMPLE_FORMATS: { id: string; title: string; note: string; sample: any }[] = [
  {
    id: 'products', title: 'Products / Inventory', note: 'The most common import. Only name + price are mandatory — everything else is auto-filled.',
    sample: [{
      product_id: 'SKU1001', product_name: 'Paracetamol 650mg Strip', brand_name: 'Cipla',
      category: 'Tablets', unit_type: 'strip', barcode: '8901234567890',
      price_per_unit: 32, cost: 24, mrp: 35, stock_quantity: 120,
      gst: 12, hsn: '3004', batch: 'B2291', expiry: '2027-04-30', low_stock: 15, rack: 'R2-3',
    }],
  },
  {
    id: 'customers', title: 'Customers / Patients', note: 'Phone is used to de-duplicate and to send WhatsApp bills.',
    sample: [{ name: 'Aarav Sharma', phone: '9810000001', email: 'aarav@mail.com', address: 'Delhi', points: 120, credit: 0, gstin: '' }],
  },
  {
    id: 'vendors', title: 'Vendors / Distributors', note: 'Used by purchase orders and payables.',
    sample: [{ vendor_name: 'Metro Wholesale', phone: '9810000010', gstin: '07AAACS1234A1Z5', address: 'Azadpur, Delhi', payable: 0 }],
  },
  {
    id: 'backup', title: 'Full SwiftPOS backup', note: 'Exported from Settings → Backup. Restores products, sales, customers, settings — everything.',
    sample: { app: 'SwiftPOS Pro', version: 7, ts: 1750000000000, settings: { shopName: 'My Store' }, products: [], sales: [], customers: [] },
  },
];
