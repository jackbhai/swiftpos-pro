/** Per-shop JSON catalogue formats.
 *  Every business type imports and exports a different product JSON shape so
 *  a kirana file, a pharmacy file and a mithai file never get mixed up. */

import type { Product } from '@/db/types';
import type { ShopTypeId } from './shopProfiles';
import type { SystemId } from './systems';

export type CatalogFormatId =
  | 'kirana' | 'pharmacy' | 'restaurant' | 'cafe' | 'bakery' | 'sweets'
  | 'retail' | 'electronics' | 'fashion' | 'salon' | 'hardware'
  | 'stationery' | 'garage' | 'general';

export interface CatalogField {
  key: string;
  aliases: string[];
  required?: boolean;
  hint: string;
}

export interface ShopCatalogFormat {
  id: CatalogFormatId;
  title: string;
  emoji: string;
  wrapKey: string;
  formatVersion: string;
  note: string;
  fields: CatalogField[];
  sample: Record<string, any>[];
  exportRow: (p: Product) => Record<string, any>;
}

const n = (v: any, d = 0) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const x = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(x) ? x : d;
};

export const UNIT_ALIASES: Record<string, string> = {
  pc: 'pc', pcs: 'pc', piece: 'pc', pieces: 'pc', nos: 'pc', no: 'pc', each: 'pc', unit: 'pc',
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  g: 'g', gm: 'g', gram: 'g', grams: 'g',
  l: 'l', lt: 'l', ltr: 'l', liter: 'l', litre: 'l', liters: 'l', litres: 'l',
  ml: 'ml', milliliter: 'ml', millilitre: 'ml',
  box: 'box', pack: 'pack', pkt: 'pack', packet: 'pack',
  dozen: 'dozen', dz: 'dozen',
  plate: 'plate', half: 'half', full: 'full', glass: 'glass', bowl: 'bowl', cup: 'cup',
  strip: 'strip', tablet: 'tablet', tab: 'tablet', bottle: 'bottle', tube: 'tube', vial: 'vial',
  pair: 'pair', set: 'set', session: 'session', tray: 'tray',
  m: 'm', meter: 'm', metre: 'm', ft: 'ft', feet: 'ft',
  hour: 'hour', hr: 'hour',
};

export function normalizeUnit(raw: string, fallback = 'pc'): string {
  const u = String(raw || '').trim().toLowerCase();
  if (!u) return fallback;
  if (UNIT_ALIASES[u]) return UNIT_ALIASES[u];
  for (const [k, v] of Object.entries(UNIT_ALIASES)) {
    if (u.startsWith(k)) return v;
  }
  return u.slice(0, 16) || fallback;
}

const kirana: ShopCatalogFormat = {
  id: 'kirana', title: 'Kirana / Grocery catalogue', emoji: '🛒',
  wrapKey: 'products', formatVersion: 'kirana-catalog-v1',
  note: 'Loose items use unit kg / l. Price is per unit (per kg or per litre). Barcode + MRP are the usual kirana fields.',
  fields: [
    { key: 'product_name', aliases: ['product_name', 'item_name', 'name'], required: true, hint: 'Item name' },
    { key: 'brand', aliases: ['brand', 'brand_name'], hint: 'Brand' },
    { key: 'category', aliases: ['category', 'aisle'], hint: 'Grocery aisle' },
    { key: 'unit', aliases: ['unit', 'uom'], hint: 'pc / kg / g / l / ml / pack' },
    { key: 'price_per_unit', aliases: ['price_per_unit', 'price_per_kg', 'selling_price', 'price'], required: true, hint: 'Selling price per unit' },
    { key: 'mrp', aliases: ['mrp'], hint: 'Printed MRP' },
    { key: 'cost', aliases: ['cost', 'purchase_price'], hint: 'Purchase rate' },
    { key: 'stock_quantity', aliases: ['stock_quantity', 'stock_kg', 'stock'], hint: 'On-hand qty in unit' },
    { key: 'barcode', aliases: ['barcode', 'ean'], hint: 'EAN / barcode' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
    { key: 'hsn', aliases: ['hsn'], hint: 'HSN code' },
    { key: 'rack', aliases: ['rack', 'shelf'], hint: 'Rack / shelf' },
    { key: 'pack_size', aliases: ['pack_size'], hint: 'e.g. 1kg, 500g, 1L' },
  ],
  sample: [
    { product_name: 'Toor Dal', brand: 'Tata Sampann', category: 'Grocery', unit: 'kg', price_per_unit: 152, mrp: 165, cost: 118, stock_quantity: 40, barcode: '8901030865420', gst: 5, hsn: '0713', rack: 'A-2', pack_size: 'loose' },
    { product_name: 'Sunflower Oil', brand: 'Fortune', category: 'Grocery', unit: 'l', price_per_unit: 149, mrp: 160, cost: 121, stock_quantity: 28, barcode: '8901030890011', gst: 5, hsn: '1512', rack: 'B-1', pack_size: '1L' },
    { product_name: 'Parle-G 376g', brand: 'Parle', category: 'Snacks', unit: 'pc', price_per_unit: 40, mrp: 40, cost: 32, stock_quantity: 80, barcode: '8901030871112', gst: 18, hsn: '1905', rack: 'C-4', pack_size: '376g' },
  ],
  exportRow: (p) => ({
    product_name: p.name, brand: p.brand ?? '', category: p.category, unit: p.unit,
    price_per_unit: p.price, mrp: p.mrp ?? '', cost: p.cost, stock_quantity: p.stock,
    barcode: p.barcode ?? '', sku: p.sku, gst: p.gst, hsn: p.hsn ?? '', rack: p.rack ?? '',
    pack_size: p.tags?.find((t) => /g|kg|ml|l/i.test(t)) ?? '', low_stock: p.lowStock,
  }),
};

const pharmacy: ShopCatalogFormat = {
  id: 'pharmacy', title: 'Pharmacy / Medical catalogue', emoji: '💊',
  wrapKey: 'medicines', formatVersion: 'pharmacy-catalog-v1',
  note: 'Medicines use batch + expiry. Salt/composition is searchable. MRP is the billed ceiling.',
  fields: [
    { key: 'medicine_name', aliases: ['medicine_name', 'product_name', 'name'], required: true, hint: 'Brand + strength' },
    { key: 'salt', aliases: ['salt', 'composition', 'generic'], hint: 'Salt / composition' },
    { key: 'brand_name', aliases: ['brand_name', 'brand', 'manufacturer'], hint: 'Manufacturer' },
    { key: 'category', aliases: ['category', 'segment'], hint: 'Tablets / Syrups / …' },
    { key: 'unit', aliases: ['unit', 'pack_type'], hint: 'strip / bottle / tube / vial' },
    { key: 'mrp', aliases: ['mrp'], hint: 'Printed MRP' },
    { key: 'rate', aliases: ['rate', 'price', 'selling_price'], required: true, hint: 'Selling rate' },
    { key: 'cost', aliases: ['cost', 'purchase_price'], hint: 'Distributor rate' },
    { key: 'stock', aliases: ['stock', 'stock_quantity'], hint: 'Strips / bottles on hand' },
    { key: 'batch', aliases: ['batch', 'batch_no'], hint: 'Batch number' },
    { key: 'expiry', aliases: ['expiry', 'expiry_date'], hint: 'YYYY-MM-DD' },
    { key: 'hsn', aliases: ['hsn'], hint: 'HSN 3004…' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
    { key: 'schedule', aliases: ['schedule', 'schedule_h'], hint: 'H / H1 / X / OTC' },
    { key: 'barcode', aliases: ['barcode'], hint: 'EAN' },
  ],
  sample: [
    { medicine_name: 'Paracetamol 650mg Strip', salt: 'Paracetamol', brand_name: 'Cipla', category: 'Tablets', unit: 'strip', mrp: 35, rate: 32, cost: 24, stock: 120, batch: 'B2291', expiry: '2027-04-30', hsn: '3004', gst: 12, schedule: 'OTC', barcode: '8901234567890' },
    { medicine_name: 'Amoxicillin 500mg Caps', salt: 'Amoxicillin', brand_name: 'GSK', category: 'Capsules', unit: 'strip', mrp: 78, rate: 72, cost: 51, stock: 40, batch: 'AX441', expiry: '2026-12-31', hsn: '3004', gst: 12, schedule: 'H', barcode: '8901234567001' },
  ],
  exportRow: (p) => ({
    medicine_name: p.name, salt: p.tags?.find((t) => t && !/schedule|otc|h1/i.test(t)) ?? '',
    brand_name: p.brand ?? '', category: p.category, unit: p.unit,
    mrp: p.mrp ?? '', rate: p.price, cost: p.cost, stock: p.stock,
    batch: p.batch ?? '', expiry: p.expiry ?? '', hsn: p.hsn ?? '', gst: p.gst,
    schedule: p.tags?.find((t) => /schedule|^h$|^h1$|^otc$/i.test(t)) ?? '',
    barcode: p.barcode ?? '', sku: p.sku, rack: p.rack ?? '', low_stock: p.lowStock,
  }),
};

const restaurant: ShopCatalogFormat = {
  id: 'restaurant', title: 'Restaurant / Dhaba menu', emoji: '🍽️',
  wrapKey: 'menu', formatVersion: 'restaurant-menu-v1',
  note: 'Menu JSON — dishes, course, veg flag, half/full prices, kitchen station. Stock is portions.',
  fields: [
    { key: 'dish_name', aliases: ['dish_name', 'item_name', 'name'], required: true, hint: 'Dish name' },
    { key: 'course', aliases: ['course', 'category'], hint: 'Starter / Main / Dessert' },
    { key: 'unit', aliases: ['unit'], hint: 'plate / bowl / glass / pc' },
    { key: 'price', aliases: ['price', 'full_price'], required: true, hint: 'Full plate price' },
    { key: 'half_price', aliases: ['half_price', 'price_half'], hint: 'Half plate (optional)' },
    { key: 'veg', aliases: ['veg', 'is_veg'], hint: 'true / false' },
    { key: 'kitchen_station', aliases: ['kitchen_station', 'station'], hint: 'Tandoor / Chinese / Tawa' },
    { key: 'prep_minutes', aliases: ['prep_minutes', 'prep_time'], hint: 'Kitchen prep time' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
    { key: 'description', aliases: ['description', 'note'], hint: 'Menu blurb' },
  ],
  sample: [
    { dish_name: 'Butter Chicken', course: 'Main Course', unit: 'plate', price: 280, half_price: 160, veg: false, kitchen_station: 'Tandoor', prep_minutes: 18, gst: 5, description: 'Creamy tomato gravy' },
    { dish_name: 'Dal Tadka', course: 'Main Course', unit: 'bowl', price: 140, half_price: 80, veg: true, kitchen_station: 'Tawa', prep_minutes: 12, gst: 5, description: 'Yellow dal with ghee tadka' },
    { dish_name: 'Gulab Jamun', course: 'Desserts', unit: 'pc', price: 40, veg: true, kitchen_station: 'Dessert', prep_minutes: 2, gst: 5, description: '2 pcs' },
  ],
  exportRow: (p) => ({
    dish_name: p.name, course: p.category, unit: p.unit, price: p.price,
    half_price: p.variants?.find((v) => /half/i.test(v.name))?.price ?? '',
    veg: p.tags?.includes('veg') ?? '', kitchen_station: p.tags?.find((t) => t && t !== 'veg' && t !== 'non-veg') ?? '',
    gst: p.gst, sku: p.sku, stock: p.stock, image: p.image ?? '',
  }),
};

const cafe: ShopCatalogFormat = {
  id: 'cafe', title: 'Cafe / QSR menu', emoji: '☕',
  wrapKey: 'menu', formatVersion: 'cafe-menu-v1',
  note: 'Drinks and snacks with size prices (regular / large) and add-on notes.',
  fields: [
    { key: 'item_name', aliases: ['item_name', 'name', 'dish_name'], required: true, hint: 'Item name' },
    { key: 'section', aliases: ['section', 'category'], hint: 'Hot Coffee / Shakes / …' },
    { key: 'unit', aliases: ['unit'], hint: 'cup / glass / pc' },
    { key: 'price_regular', aliases: ['price_regular', 'price'], required: true, hint: 'Regular size' },
    { key: 'price_large', aliases: ['price_large', 'large_price'], hint: 'Large size' },
    { key: 'addons', aliases: ['addons'], hint: 'Extra shot, no sugar…' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
  ],
  sample: [
    { item_name: 'Cappuccino', section: 'Hot Coffee', unit: 'cup', price_regular: 120, price_large: 160, addons: 'extra shot, oat milk', gst: 5 },
    { item_name: 'Mango Shake', section: 'Shakes', unit: 'glass', price_regular: 140, price_large: 180, addons: 'no sugar', gst: 5 },
  ],
  exportRow: (p) => ({
    item_name: p.name, section: p.category, unit: p.unit, price_regular: p.price,
    price_large: p.variants?.find((v) => /large/i.test(v.name))?.price ?? '',
    addons: (p.tags || []).join(', '), gst: p.gst, sku: p.sku, stock: p.stock,
  }),
};

const bakery: ShopCatalogFormat = {
  id: 'bakery', title: 'Bakery catalogue', emoji: '🧁',
  wrapKey: 'items', formatVersion: 'bakery-catalog-v1',
  note: 'Cakes billed per kg, pastries per piece. Short shelf-life in days.',
  fields: [
    { key: 'item_name', aliases: ['item_name', 'name'], required: true, hint: 'Item name' },
    { key: 'category', aliases: ['category'], hint: 'Cakes / Pastries / Breads' },
    { key: 'unit', aliases: ['unit'], hint: 'kg / pc / box' },
    { key: 'price_per_kg', aliases: ['price_per_kg', 'price'], hint: 'Per kg (cakes)' },
    { key: 'price_per_pc', aliases: ['price_per_pc'], hint: 'Per piece (pastries)' },
    { key: 'flavour', aliases: ['flavour', 'flavor'], hint: 'Chocolate / Pineapple…' },
    { key: 'shelf_life_days', aliases: ['shelf_life_days', 'shelf_life'], hint: 'Days' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
  ],
  sample: [
    { item_name: 'Chocolate Truffle Cake', category: 'Cakes', unit: 'kg', price_per_kg: 750, flavour: 'Chocolate', shelf_life_days: 3, gst: 5, stock: 6 },
    { item_name: 'Butter Croissant', category: 'Pastries', unit: 'pc', price_per_pc: 45, flavour: 'Butter', shelf_life_days: 1, gst: 5, stock: 24 },
  ],
  exportRow: (p) => ({
    item_name: p.name, category: p.category, unit: p.unit,
    price_per_kg: p.unit === 'kg' ? p.price : '', price_per_pc: p.unit === 'pc' ? p.price : p.price,
    flavour: p.tags?.[0] ?? '', shelf_life_days: '', gst: p.gst, stock: p.stock, sku: p.sku, expiry: p.expiry ?? '',
  }),
};

const sweets: ShopCatalogFormat = {
  id: 'sweets', title: 'Sweets / Mithai catalogue', emoji: '🍬',
  wrapKey: 'mithai', formatVersion: 'sweets-catalog-v1',
  note: 'Mithai is billed per kg. Optional pack prices for 250g / 500g boxes. POS pops a weight picker on add.',
  fields: [
    { key: 'item_name', aliases: ['item_name', 'mithai_name', 'name'], required: true, hint: 'Mithai name' },
    { key: 'category', aliases: ['category', 'variety'], hint: 'Milk Sweets / Dry Fruit / …' },
    { key: 'unit', aliases: ['unit'], hint: 'kg / g / box / tray' },
    { key: 'price_per_kg', aliases: ['price_per_kg', 'price'], required: true, hint: 'Rate per kg' },
    { key: 'price_250g', aliases: ['price_250g', 'pack_250g'], hint: 'Optional packed 250g price' },
    { key: 'price_500g', aliases: ['price_500g', 'pack_500g'], hint: 'Optional packed 500g price' },
    { key: 'stock_kg', aliases: ['stock_kg', 'stock'], hint: 'Kg on hand' },
    { key: 'shelf_life_days', aliases: ['shelf_life_days'], hint: 'Days' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
  ],
  sample: [
    { item_name: 'Kaju Katli', category: 'Dry Fruit', unit: 'kg', price_per_kg: 900, price_250g: 230, price_500g: 460, stock_kg: 12, shelf_life_days: 10, gst: 5 },
    { item_name: 'Rasgulla', category: 'Bengali', unit: 'kg', price_per_kg: 320, price_250g: 85, price_500g: 165, stock_kg: 8, shelf_life_days: 3, gst: 5 },
    { item_name: 'Besan Ladoo', category: 'Milk Sweets', unit: 'kg', price_per_kg: 420, price_250g: 110, price_500g: 215, stock_kg: 15, shelf_life_days: 12, gst: 5 },
  ],
  exportRow: (p) => ({
    item_name: p.name, category: p.category, unit: p.unit, price_per_kg: p.price,
    price_250g: p.variants?.find((v) => /250/.test(v.name))?.price ?? +(p.price * 0.25).toFixed(2),
    price_500g: p.variants?.find((v) => /500/.test(v.name))?.price ?? +(p.price * 0.5).toFixed(2),
    stock_kg: p.stock, gst: p.gst, sku: p.sku, expiry: p.expiry ?? '', batch: p.batch ?? '',
  }),
};

const retail: ShopCatalogFormat = {
  id: 'retail', title: 'General retail catalogue', emoji: '🏪',
  wrapKey: 'products', formatVersion: 'retail-catalog-v1',
  note: 'Everyday retail: name, barcode, MRP, selling price, stock.',
  fields: [
    { key: 'product_name', aliases: ['product_name', 'name'], required: true, hint: 'Name' },
    { key: 'category', aliases: ['category'], hint: 'Category' },
    { key: 'barcode', aliases: ['barcode'], hint: 'Barcode' },
    { key: 'price', aliases: ['price', 'selling_price'], required: true, hint: 'Selling price' },
    { key: 'mrp', aliases: ['mrp'], hint: 'MRP' },
    { key: 'cost', aliases: ['cost'], hint: 'Cost' },
    { key: 'stock', aliases: ['stock', 'stock_quantity'], hint: 'Qty' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
  ],
  sample: [
    { product_name: 'LED Bulb 9W', category: 'Home', barcode: '8901030000111', price: 110, mrp: 149, cost: 68, stock: 40, gst: 18, unit: 'pc' },
  ],
  exportRow: (p) => ({
    product_name: p.name, category: p.category, brand: p.brand ?? '', barcode: p.barcode ?? '',
    sku: p.sku, unit: p.unit, price: p.price, mrp: p.mrp ?? '', cost: p.cost, stock: p.stock, gst: p.gst, hsn: p.hsn ?? '',
  }),
};

const electronics: ShopCatalogFormat = {
  id: 'electronics', title: 'Electronics / Mobile catalogue', emoji: '📱',
  wrapKey: 'products', formatVersion: 'electronics-catalog-v1',
  note: 'IMEI/serial is captured at billing. Warranty months print on the invoice.',
  fields: [
    { key: 'product_name', aliases: ['product_name', 'name', 'model'], required: true, hint: 'Model name' },
    { key: 'brand', aliases: ['brand'], hint: 'Brand' },
    { key: 'category', aliases: ['category'], hint: 'Mobiles / Audio / …' },
    { key: 'mrp', aliases: ['mrp'], hint: 'MRP' },
    { key: 'price', aliases: ['price', 'selling_price'], required: true, hint: 'Selling price' },
    { key: 'cost', aliases: ['cost'], hint: 'Landing cost' },
    { key: 'stock', aliases: ['stock'], hint: 'Units' },
    { key: 'warranty_months', aliases: ['warranty_months', 'warranty'], hint: 'Warranty months' },
    { key: 'imei_required', aliases: ['imei_required', 'serial_required'], hint: 'true for mobiles' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
    { key: 'hsn', aliases: ['hsn'], hint: 'HSN' },
  ],
  sample: [
    { product_name: 'Galaxy A15 8/128', brand: 'Samsung', category: 'Mobiles', mrp: 21999, price: 19999, cost: 17200, stock: 6, warranty_months: 12, imei_required: true, gst: 18, hsn: '8517' },
  ],
  exportRow: (p) => ({
    product_name: p.name, brand: p.brand ?? '', category: p.category, mrp: p.mrp ?? '', price: p.price, cost: p.cost,
    stock: p.stock, warranty_months: parseInt(p.tags?.find((t) => t.startsWith('warranty:'))?.split(':')[1] || '') || '',
    imei_required: p.tags?.includes('imei') || false, gst: p.gst, hsn: p.hsn ?? '', sku: p.sku, barcode: p.barcode ?? '',
  }),
};

const fashion: ShopCatalogFormat = {
  id: 'fashion', title: 'Clothing / Footwear catalogue', emoji: '👕',
  wrapKey: 'articles', formatVersion: 'fashion-catalog-v1',
  note: 'Style + size + colour. Each size can be a variant; stock is per article.',
  fields: [
    { key: 'article_name', aliases: ['article_name', 'product_name', 'name'], required: true, hint: 'Style name' },
    { key: 'category', aliases: ['category'], hint: 'Men / Women / Kids' },
    { key: 'size', aliases: ['size'], hint: 'S / M / L / XL' },
    { key: 'colour', aliases: ['colour', 'color'], hint: 'Colour' },
    { key: 'mrp', aliases: ['mrp'], hint: 'MRP' },
    { key: 'price', aliases: ['price'], required: true, hint: 'Selling price' },
    { key: 'cost', aliases: ['cost'], hint: 'Cost' },
    { key: 'stock', aliases: ['stock'], hint: 'Qty' },
    { key: 'season', aliases: ['season'], hint: 'SS26 / Winter' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
  ],
  sample: [
    { article_name: 'Oxford Shirt', category: 'Men', size: 'M', colour: 'Sky Blue', mrp: 1499, price: 999, cost: 520, stock: 14, season: 'SS26', gst: 5, barcode: '890200000111' },
  ],
  exportRow: (p) => ({
    article_name: p.name, category: p.category, size: p.variants?.[0]?.name ?? '', colour: p.tags?.[0] ?? '',
    mrp: p.mrp ?? '', price: p.price, cost: p.cost, stock: p.stock, season: p.tags?.[1] ?? '', gst: p.gst,
    sku: p.sku, barcode: p.barcode ?? '', brand: p.brand ?? '',
  }),
};

const salon: ShopCatalogFormat = {
  id: 'salon', title: 'Salon / Spa services', emoji: '💇',
  wrapKey: 'services', formatVersion: 'salon-catalog-v1',
  note: 'Services (not goods). Duration in minutes, optional stylist default.',
  fields: [
    { key: 'service_name', aliases: ['service_name', 'name'], required: true, hint: 'Service name' },
    { key: 'type', aliases: ['type', 'category'], hint: 'Hair / Skin / Nails' },
    { key: 'price', aliases: ['price'], required: true, hint: 'Price' },
    { key: 'duration_min', aliases: ['duration_min', 'duration'], hint: 'Minutes' },
    { key: 'stylist', aliases: ['stylist'], hint: 'Default stylist' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
  ],
  sample: [
    { service_name: 'Haircut + Blowdry', type: 'Hair', price: 650, duration_min: 45, stylist: '', gst: 18, unit: 'session' },
    { service_name: 'Cleanup', type: 'Skin', price: 900, duration_min: 40, gst: 18, unit: 'session' },
  ],
  exportRow: (p) => ({
    service_name: p.name, type: p.category, price: p.price, duration_min: parseInt(p.tags?.[0] || '') || '',
    gst: p.gst, sku: p.sku, unit: p.unit, stock: p.stock,
  }),
};

const hardware: ShopCatalogFormat = {
  id: 'hardware', title: 'Hardware / Building material catalogue', emoji: '🔧',
  wrapKey: 'parts', formatVersion: 'hardware-catalog-v1',
  note: 'Parts with part number, bulk units (kg, bag, running feet) and rack location.',
  fields: [
    { key: 'part_name', aliases: ['part_name', 'name', 'product_name'], required: true, hint: 'Part name' },
    { key: 'part_no', aliases: ['part_no', 'sku', 'code'], hint: 'Part number' },
    { key: 'category', aliases: ['category'], hint: 'Tools / Plumbing / …' },
    { key: 'unit', aliases: ['unit'], hint: 'pc / kg / m / ft / bag' },
    { key: 'price', aliases: ['price'], required: true, hint: 'Rate' },
    { key: 'cost', aliases: ['cost'], hint: 'Cost' },
    { key: 'stock', aliases: ['stock'], hint: 'Qty' },
    { key: 'rack', aliases: ['rack'], hint: 'Bin / rack' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
    { key: 'hsn', aliases: ['hsn'], hint: 'HSN' },
  ],
  sample: [
    { part_name: 'PVC Pipe 1 inch', part_no: 'PVC-1', category: 'Plumbing', unit: 'm', price: 85, cost: 62, stock: 240, rack: 'P-12', gst: 18, hsn: '3917' },
  ],
  exportRow: (p) => ({
    part_name: p.name, part_no: p.sku, category: p.category, unit: p.unit, price: p.price, cost: p.cost,
    stock: p.stock, rack: p.rack ?? '', gst: p.gst, hsn: p.hsn ?? '', barcode: p.barcode ?? '', brand: p.brand ?? '',
  }),
};

const stationery: ShopCatalogFormat = {
  id: 'stationery', title: 'Stationery / Book catalogue', emoji: '📚',
  wrapKey: 'items', formatVersion: 'stationery-catalog-v1',
  note: 'Books (ISBN) and stationery SKUs. Publisher sits in brand.',
  fields: [
    { key: 'item_name', aliases: ['item_name', 'name', 'title'], required: true, hint: 'Title / item' },
    { key: 'category', aliases: ['category'], hint: 'Books / Notebooks / Pens' },
    { key: 'isbn', aliases: ['isbn', 'barcode'], hint: 'ISBN / barcode' },
    { key: 'publisher', aliases: ['publisher', 'brand'], hint: 'Publisher / brand' },
    { key: 'price', aliases: ['price'], required: true, hint: 'Price' },
    { key: 'mrp', aliases: ['mrp'], hint: 'MRP' },
    { key: 'stock', aliases: ['stock'], hint: 'Qty' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
  ],
  sample: [
    { item_name: 'Class 10 Maths NCERT', category: 'Books', isbn: '9788174504968', publisher: 'NCERT', price: 135, mrp: 135, stock: 40, gst: 0, unit: 'pc' },
  ],
  exportRow: (p) => ({
    item_name: p.name, category: p.category, isbn: p.barcode ?? '', publisher: p.brand ?? '',
    price: p.price, mrp: p.mrp ?? '', stock: p.stock, gst: p.gst, sku: p.sku, unit: p.unit,
  }),
};

const garage: ShopCatalogFormat = {
  id: 'garage', title: 'Auto garage parts & labour', emoji: '🛠️',
  wrapKey: 'parts', formatVersion: 'garage-catalog-v1',
  note: 'Spare parts plus labour lines. Vehicle make is optional.',
  fields: [
    { key: 'part_name', aliases: ['part_name', 'name'], required: true, hint: 'Part / labour name' },
    { key: 'category', aliases: ['category'], hint: 'Parts / Labour / Consumable' },
    { key: 'oem', aliases: ['oem', 'part_no'], hint: 'OEM number' },
    { key: 'vehicle_make', aliases: ['vehicle_make', 'make'], hint: 'Maruti / Hyundai…' },
    { key: 'price', aliases: ['price'], required: true, hint: 'Rate' },
    { key: 'cost', aliases: ['cost'], hint: 'Cost' },
    { key: 'stock', aliases: ['stock'], hint: 'Qty (0 for labour)' },
    { key: 'labour_minutes', aliases: ['labour_minutes'], hint: 'Fitment time' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
  ],
  sample: [
    { part_name: 'Engine Oil 5W-30 4L', category: 'Consumable', oem: '5W30-4', vehicle_make: 'Universal', price: 1850, cost: 1320, stock: 18, gst: 18, unit: 'pc' },
    { part_name: 'Labour — Periodic service', category: 'Labour', price: 1200, cost: 0, stock: 0, labour_minutes: 90, gst: 18, unit: 'session' },
  ],
  exportRow: (p) => ({
    part_name: p.name, category: p.category, oem: p.sku, vehicle_make: p.brand ?? '', price: p.price, cost: p.cost,
    stock: p.stock, labour_minutes: '', gst: p.gst, hsn: p.hsn ?? '', barcode: p.barcode ?? '',
  }),
};

const general: ShopCatalogFormat = {
  id: 'general', title: 'Generic item catalogue', emoji: '⚙️',
  wrapKey: 'items', formatVersion: 'general-catalog-v1',
  note: 'Neutral shape. Only name + price are mandatory.',
  fields: [
    { key: 'name', aliases: ['name', 'item_name', 'product_name'], required: true, hint: 'Name' },
    { key: 'category', aliases: ['category'], hint: 'Category' },
    { key: 'unit', aliases: ['unit'], hint: 'Unit' },
    { key: 'price', aliases: ['price'], required: true, hint: 'Price' },
    { key: 'cost', aliases: ['cost'], hint: 'Cost' },
    { key: 'stock', aliases: ['stock'], hint: 'Qty' },
    { key: 'gst', aliases: ['gst'], hint: 'GST %' },
  ],
  sample: [
    { name: 'Sample item', category: 'General', unit: 'pc', price: 100, cost: 70, stock: 10, gst: 18 },
  ],
  exportRow: (p) => ({
    name: p.name, category: p.category, unit: p.unit, price: p.price, cost: p.cost, stock: p.stock,
    gst: p.gst, sku: p.sku, barcode: p.barcode ?? '', brand: p.brand ?? '',
  }),
};

export const SHOP_CATALOG_FORMATS: ShopCatalogFormat[] = [
  kirana, pharmacy, restaurant, cafe, bakery, sweets, retail, electronics, fashion, salon, hardware, stationery, garage, general,
];

const FORMAT_BY_SYSTEM: Partial<Record<SystemId | string, CatalogFormatId>> = {
  kirana: 'kirana', pharmacy: 'pharmacy', rms: 'restaurant', cafe: 'cafe', bakery: 'bakery',
  sweets: 'sweets', retail: 'fashion', electronics: 'electronics', salon: 'salon',
  hardware: 'hardware', garage: 'garage',
};

const FORMAT_BY_SHOP: Record<ShopTypeId | string, CatalogFormatId> = {
  grocery: 'kirana', pharmacy: 'pharmacy', restaurant: 'restaurant', cafe: 'cafe', bakery: 'bakery',
  sweets: 'sweets', retail: 'retail', electronics: 'electronics', fashion: 'fashion', salon: 'salon',
  hardware: 'hardware', stationery: 'stationery', general: 'general',
};

export function getCatalogFormat(systemId?: string, shopType?: string): ShopCatalogFormat {
  const id = (systemId && FORMAT_BY_SYSTEM[systemId]) || (shopType && FORMAT_BY_SHOP[shopType]) || 'general';
  return SHOP_CATALOG_FORMATS.find((f) => f.id === id) ?? general;
}

export function formatById(id: string): ShopCatalogFormat | undefined {
  return SHOP_CATALOG_FORMATS.find((f) => f.id === id || f.formatVersion === id);
}

export function detectCatalogFormat(data: any): ShopCatalogFormat | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const ver = String(data.format || data.catalog_format || data.formatVersion || '');
  if (ver) {
    const hit = SHOP_CATALOG_FORMATS.find((f) => f.formatVersion === ver || f.id === ver);
    if (hit) return hit;
  }
  const shop = String(data.shop_type || data.shopType || data.system || data.systemId || '');
  if (shop) {
    const viaSys = FORMAT_BY_SYSTEM[shop];
    const viaShop = FORMAT_BY_SHOP[shop];
    const id = viaSys || viaShop;
    if (id) return SHOP_CATALOG_FORMATS.find((f) => f.id === id);
  }
  for (const f of SHOP_CATALOG_FORMATS) {
    if (Array.isArray(data[f.wrapKey]) && f.wrapKey !== 'products' && f.wrapKey !== 'items') return f;
  }
  return undefined;
}

export interface CatalogExportMeta {
  systemId?: string;
  shopType?: string;
  shopName?: string;
}

export function exportCatalog(products: Product[], meta: CatalogExportMeta = {}) {
  const format = getCatalogFormat(meta.systemId, meta.shopType);
  return {
    app: 'SwiftPOS Pro',
    format: format.formatVersion,
    shop_type: meta.shopType || format.id,
    system: meta.systemId || format.id,
    shop_name: meta.shopName || '',
    exported_at: new Date().toISOString(),
    count: products.length,
    [format.wrapKey]: products.map(format.exportRow),
  };
}

export const CATALOG_UNWRAP_KEYS = [
  'mithai', 'medicines', 'menu', 'dishes', 'articles', 'services', 'parts',
  'products', 'inventory', 'items', 'customers', 'vendors', 'suppliers', 'data', 'rows', 'records',
];

/** Apply shop-specific extras (variants, tags) after the generic product map. */
export function enrichProductFromFormat(p: Product, row: any, format?: ShopCatalogFormat): Product {
  if (!format) return p;
  const pick = (keys: string[]) => {
    for (const k of keys) {
      const hit = Object.keys(row).find((x) => x.toLowerCase().replace(/[\s_-]/g, '') === k.toLowerCase().replace(/[\s_-]/g, ''));
      if (hit && row[hit] !== '' && row[hit] !== null && row[hit] !== undefined) return row[hit];
    }
    return undefined;
  };
  const tags = [...(p.tags || [])];
  const add = (t?: string) => { const s = String(t ?? '').trim(); if (s && !tags.includes(s)) tags.push(s); };

  if (format.id === 'pharmacy') {
    add(pick(['salt', 'composition', 'generic']));
    add(pick(['schedule', 'schedule_h']));
  }
  if (format.id === 'restaurant' || format.id === 'cafe') {
    const veg = pick(['veg', 'is_veg', 'vegetarian']);
    if (veg !== undefined) add(veg === true || String(veg).toLowerCase() === 'true' || String(veg).toLowerCase() === 'veg' ? 'veg' : 'non-veg');
    add(pick(['kitchen_station', 'station']));
    const half = n(pick(['half_price', 'price_half']));
    const large = n(pick(['price_large', 'large_price']));
    const variants = [...(p.variants || [])];
    if (half > 0) variants.push({ name: 'Half', price: half, stock: p.stock });
    if (half > 0) variants.push({ name: 'Full', price: p.price, stock: p.stock });
    if (large > 0) {
      variants.push({ name: 'Regular', price: p.price, stock: p.stock });
      variants.push({ name: 'Large', price: large, stock: p.stock });
    }
    if (variants.length) p.variants = variants;
  }
  if (format.id === 'sweets' || format.id === 'bakery' || format.id === 'kirana') {
    const p250 = n(pick(['price_250g', 'pack_250g']));
    const p500 = n(pick(['price_500g', 'pack_500g']));
    const variants = [...(p.variants || [])];
    if (p250 > 0) variants.push({ name: '250 g', price: p250, stock: 0 });
    if (p500 > 0) variants.push({ name: '500 g', price: p500, stock: 0 });
    if (variants.length) p.variants = variants;
    add(pick(['flavour', 'flavor']));
    add(pick(['pack_size']));
  }
  if (format.id === 'electronics') {
    const w = pick(['warranty_months', 'warranty']);
    if (w) add(`warranty:${w}m`);
    const imei = pick(['imei_required', 'serial_required']);
    if (imei === true || String(imei).toLowerCase() === 'true') add('imei');
  }
  if (format.id === 'fashion') {
    add(pick(['colour', 'color']));
    add(pick(['season']));
    const size = pick(['size']);
    if (size) p.variants = [...(p.variants || []), { name: String(size), price: p.price, stock: p.stock }];
  }
  if (format.id === 'salon') {
    const dur = pick(['duration_min', 'duration']);
    if (dur) add(String(dur));
  }
  if (format.id === 'garage') {
    add(pick(['vehicle_make', 'make']));
  }
  p.tags = tags.filter(Boolean);
  return p;
}

export const extraNameKeys = (format?: ShopCatalogFormat): string[] => {
  if (!format) return [];
  return format.fields.filter((f) => /name|title|dish|medicine|service|article|part|mithai/i.test(f.key)).flatMap((f) => f.aliases);
};

export const extraPriceKeys = (format?: ShopCatalogFormat): string[] => {
  if (!format) return [];
  return format.fields.filter((f) => /price|rate|mrp/i.test(f.key)).flatMap((f) => f.aliases);
};
