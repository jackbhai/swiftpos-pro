import { describe, it, expect } from 'vitest';
import {
  SHOP_CATALOG_FORMATS, detectCatalogFormat, exportCatalog, getCatalogFormat, normalizeUnit,
} from '../src/lib/shopFormats';
import { detectKind, mapProduct, unwrap } from '../src/lib/importer';
import { SHOP_PROFILES } from '../src/lib/shopProfiles';
import { SYSTEMS } from '../src/lib/systems';

const opts = { mode: 'merge' as const, defaultMarginPct: 25, defaultGst: 5, defaultLowStock: 10, categoryFrom: 'category' as const };

describe('shop catalogue formats', () => {
  it('ships a distinct JSON shape for every shop / system', () => {
    expect(SHOP_CATALOG_FORMATS.length).toBeGreaterThanOrEqual(12);
    const ids = SHOP_CATALOG_FORMATS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('kirana');
    expect(ids).toContain('sweets');
    expect(ids).toContain('restaurant');
    expect(ids).toContain('pharmacy');
  });

  it('every format has a wrap key, version, required name+price-ish fields and a sample', () => {
    for (const f of SHOP_CATALOG_FORMATS) {
      expect(f.formatVersion).toMatch(/v1$/);
      expect(f.wrapKey.length).toBeGreaterThan(2);
      expect(f.sample.length).toBeGreaterThan(0);
      expect(f.fields.some((x) => x.required)).toBe(true);
      const row = f.exportRow({
        id: 'p1', name: 'Demo', sku: 'SKU1', category: 'Cat', unit: 'kg', cost: 80, price: 100,
        stock: 5, lowStock: 2, gst: 5, active: true, trackStock: true, createdAt: 1, updatedAt: 1,
      } as any);
      expect(Object.keys(row).length).toBeGreaterThan(3);
    }
  });

  it('resolves kirana / sweets / restaurant from system or shop type', () => {
    expect(getCatalogFormat('kirana', 'grocery').id).toBe('kirana');
    expect(getCatalogFormat('sweets', 'sweets').id).toBe('sweets');
    expect(getCatalogFormat('rms', 'restaurant').id).toBe('restaurant');
    expect(getCatalogFormat('pharmacy', 'pharmacy').wrapKey).toBe('medicines');
    expect(getCatalogFormat('sweets').wrapKey).toBe('mithai');
  });

  it('every live system and shop profile maps to a format', () => {
    for (const sys of SYSTEMS) expect(getCatalogFormat(sys.id).id).toBeTruthy();
    for (const p of SHOP_PROFILES) expect(getCatalogFormat(undefined, p.id).id).toBeTruthy();
  });
});

describe('detect + unwrap shop JSON', () => {
  it('does not treat a shop catalogue as a full backup', () => {
    const data = { app: 'SwiftPOS Pro', format: 'sweets-catalog-v1', shop_type: 'sweets', mithai: [{ item_name: 'Kaju Katli', price_per_kg: 900 }] };
    expect(detectKind(data)).toBe('products');
    expect(detectCatalogFormat(data)?.id).toBe('sweets');
    expect(unwrap(data)).toHaveLength(1);
  });

  it('unwraps restaurant menu and pharmacy medicines', () => {
    expect(unwrap({ format: 'restaurant-menu-v1', menu: [{ dish_name: 'Dal' }] })[0].dish_name).toBe('Dal');
    expect(unwrap({ format: 'pharmacy-catalog-v1', medicines: [{ medicine_name: 'PCM' }] })[0].medicine_name).toBe('PCM');
  });

  it('still recognises a full backup', () => {
    expect(detectKind({ app: 'SwiftPOS Pro', version: 9, settings: {}, sales: [], products: [] })).toBe('backup');
  });
});

describe('mapProduct understands shop fields', () => {
  it('maps a kirana row with price_per_unit and kg', () => {
    const p = mapProduct({ product_name: 'Toor Dal', unit: 'kg', price_per_unit: 152, stock_quantity: 40, brand: 'Tata' }, opts, 0, getCatalogFormat('kirana'));
    expect(p.name).toBe('Toor Dal');
    expect(p.unit).toBe('kg');
    expect(p.price).toBe(152);
    expect(p.stock).toBe(40);
    expect(p.brand).toBe('Tata');
  });

  it('maps mithai price_per_kg and pack variants', () => {
    const p = mapProduct({ item_name: 'Kaju Katli', category: 'Dry Fruit', unit: 'kg', price_per_kg: 900, price_250g: 230, stock_kg: 12 }, opts, 0, getCatalogFormat('sweets'));
    expect(p.name).toBe('Kaju Katli');
    expect(p.price).toBe(900);
    expect(p.stock).toBe(12);
    expect(p.unit).toBe('kg');
    expect(p.variants?.some((v) => v.name === '250 g' && v.price === 230)).toBe(true);
  });

  it('maps a restaurant dish with half/full', () => {
    const p = mapProduct({ dish_name: 'Butter Chicken', course: 'Main Course', price: 280, half_price: 160, veg: false, unit: 'plate' }, opts, 0, getCatalogFormat('rms'));
    expect(p.name).toBe('Butter Chicken');
    expect(p.category).toBe('Main Course');
    expect(p.price).toBe(280);
    expect(p.unit).toBe('plate');
    expect(p.variants?.some((v) => v.name === 'Half' && v.price === 160)).toBe(true);
    expect(p.tags).toContain('non-veg');
  });

  it('maps pharmacy salt + batch + expiry', () => {
    const p = mapProduct({ medicine_name: 'Paracetamol 650', salt: 'Paracetamol', rate: 32, batch: 'B1', expiry: '2027-04-30', unit: 'strip' }, opts, 0, getCatalogFormat('pharmacy'));
    expect(p.name).toBe('Paracetamol 650');
    expect(p.price).toBe(32);
    expect(p.batch).toBe('B1');
    expect(p.expiry).toBe('2027-04-30');
    expect(p.tags).toContain('Paracetamol');
    expect(p.unit).toBe('strip');
  });
});

describe('exportCatalog', () => {
  const products = [{
    id: 'p1', name: 'Kaju Katli', sku: 'SKU1', category: 'Dry Fruit', unit: 'kg', cost: 700, price: 900,
    stock: 12, lowStock: 2, gst: 5, active: true, trackStock: true, createdAt: 1, updatedAt: 1,
  }] as any;

  it('wraps sweets under mithai with sweets-catalog-v1', () => {
    const out = exportCatalog(products, { systemId: 'sweets', shopType: 'sweets', shopName: 'Haldiram' });
    expect(out.format).toBe('sweets-catalog-v1');
    expect(out.mithai[0].item_name).toBe('Kaju Katli');
    expect(out.mithai[0].price_per_kg).toBe(900);
    expect(out.count).toBe(1);
  });

  it('wraps kirana under products with kirana-catalog-v1', () => {
    const out = exportCatalog(products, { systemId: 'kirana', shopType: 'grocery' });
    expect(out.format).toBe('kirana-catalog-v1');
    expect(out.products[0].product_name).toBe('Kaju Katli');
    expect(out.products[0].price_per_unit).toBe(900);
  });
});

describe('normalizeUnit', () => {
  it('collapses common spellings', () => {
    expect(normalizeUnit('kilogram')).toBe('kg');
    expect(normalizeUnit('grams')).toBe('g');
    expect(normalizeUnit('litre')).toBe('l');
    expect(normalizeUnit('pcs')).toBe('pc');
    expect(normalizeUnit('strip')).toBe('strip');
    expect(normalizeUnit('plate')).toBe('plate');
  });
});
