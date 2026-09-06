/** Loose-weight helpers for kirana / sweets / bakery billing. */

const MASS = new Set(['kg', 'g', 'gm', 'gram', 'grams', 'kilo', 'kilos', 'kilogram', 'kilograms']);
const VOLUME = new Set(['l', 'ml', 'lt', 'ltr', 'liter', 'litre', 'liters', 'litres', 'milliliter', 'millilitre']);

export type WeightFamily = 'mass' | 'volume';

export function normalizeLooseUnit(unit: string): string {
  const u = String(unit || '').trim().toLowerCase();
  if (['g', 'gm', 'gram', 'grams'].includes(u)) return 'g';
  if (['kg', 'kilo', 'kilos', 'kilogram', 'kilograms'].includes(u)) return 'kg';
  if (['ml', 'milliliter', 'millilitre'].includes(u)) return 'ml';
  if (['l', 'lt', 'ltr', 'liter', 'litre', 'liters', 'litres'].includes(u)) return 'l';
  return u;
}

export function isLooseUnit(unit: string): boolean {
  const u = String(unit || '').trim().toLowerCase();
  return MASS.has(u) || VOLUME.has(u);
}

export function weightFamily(unit: string): WeightFamily | null {
  const u = String(unit || '').trim().toLowerCase();
  if (MASS.has(u)) return 'mass';
  if (VOLUME.has(u)) return 'volume';
  return null;
}

/** Kirana + sweets-type shops prompt for weight on kg / litre items. */
export function needsWeightPopup(systemId: string, shopType: string, unit: string): boolean {
  if (!isLooseUnit(unit)) return false;
  const shops = new Set(['kirana', 'sweets', 'bakery', 'grocery']);
  return shops.has(systemId) || shops.has(shopType);
}

export interface WeightPreset {
  id: string;
  label: string;
  /** Quantity expressed in the product's own unit (kg item → 0.25, g item → 250). */
  qty: number;
  hint: string;
}

export function weightPresets(productUnit: string): WeightPreset[] {
  const family = weightFamily(productUnit);
  const u = normalizeLooseUnit(productUnit);
  if (family === 'mass') {
    const toQty = (grams: number) => (u === 'g' ? grams : grams / 1000);
    return [
      { id: '250g', label: '250 gram', qty: toQty(250), hint: '¼ kg' },
      { id: '500g', label: '500 gram', qty: toQty(500), hint: '½ kg' },
      { id: '750g', label: '750 gram', qty: toQty(750), hint: '¾ kg' },
      { id: '1kg', label: '1 kg', qty: toQty(1000), hint: 'full kg' },
    ];
  }
  if (family === 'volume') {
    const toQty = (ml: number) => (u === 'ml' ? ml : ml / 1000);
    return [
      { id: '250ml', label: '250 ml', qty: toQty(250), hint: '¼ L' },
      { id: '500ml', label: '500 ml', qty: toQty(500), hint: '½ L' },
      { id: '750ml', label: '750 ml', qty: toQty(750), hint: '¾ L' },
      { id: '1l', label: '1 liter', qty: toQty(1000), hint: 'full litre' },
    ];
  }
  return [];
}

/** Convert a quantity in `fromUnit` into the product's unit. */
export function convertToProductUnit(amount: number, fromUnit: string, productUnit: string): number {
  const from = normalizeLooseUnit(fromUnit);
  const to = normalizeLooseUnit(productUnit);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (from === to) return +amount.toFixed(3);
  if (from === 'g' && to === 'kg') return +(amount / 1000).toFixed(3);
  if (from === 'kg' && to === 'g') return +(amount * 1000).toFixed(3);
  if (from === 'ml' && to === 'l') return +(amount / 1000).toFixed(3);
  if (from === 'l' && to === 'ml') return +(amount * 1000).toFixed(3);
  return +amount.toFixed(3);
}

/**
 * Parse a custom weight typed by the cashier.
 * Accepts "250", "250g", "0.5kg", "500 gram", "1.25 kg", "750 ml", "1 liter".
 * Returns quantity in the product's unit, or null if unusable.
 */
export function parseCustomWeight(input: string, productUnit: string): number | null {
  const raw = String(input || '').trim().toLowerCase().replace(',', '.');
  if (!raw) return null;
  const m = raw.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
  if (!m) return null;
  const amount = parseFloat(m[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const suffix = (m[2] || '').replace(/\s+/g, '');
  const family = weightFamily(productUnit);
  const product = normalizeLooseUnit(productUnit);

  let from = product;
  if (suffix) {
    if (MASS.has(suffix) || VOLUME.has(suffix)) from = normalizeLooseUnit(suffix);
    else if (suffix === 'kgs') from = 'kg';
    else return null;
  }

  const fromFam = weightFamily(from);
  if (family && fromFam && family !== fromFam) return null;

  if (from === product) return +amount.toFixed(3);

  if (from === 'g' && product === 'kg') return +(amount / 1000).toFixed(3);
  if (from === 'kg' && product === 'g') return +(amount * 1000).toFixed(3);
  if (from === 'ml' && product === 'l') return +(amount / 1000).toFixed(3);
  if (from === 'l' && product === 'ml') return +(amount * 1000).toFixed(3);
  return +amount.toFixed(3);
}

export function formatQty(qty: number, unit: string): string {
  const u = normalizeLooseUnit(unit) || unit;
  const n = +qty.toFixed(qty >= 10 ? 2 : 3);
  if (u === 'kg' && n < 1) return `${Math.round(n * 1000)} g`;
  if (u === 'l' && n < 1) return `${Math.round(n * 1000)} ml`;
  return `${n} ${u}`;
}

export function inputUnits(productUnit: string): { id: string; label: string }[] {
  const family = weightFamily(productUnit);
  if (family === 'mass') return [{ id: 'g', label: 'gram' }, { id: 'kg', label: 'kg' }];
  if (family === 'volume') return [{ id: 'ml', label: 'ml' }, { id: 'l', label: 'liter' }];
  return [{ id: normalizeLooseUnit(productUnit) || 'pc', label: productUnit || 'unit' }];
}
