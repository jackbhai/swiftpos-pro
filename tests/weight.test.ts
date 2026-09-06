import { describe, it, expect } from 'vitest';
import {
  convertToProductUnit, formatQty, isLooseUnit, needsWeightPopup, parseCustomWeight, weightPresets,
} from '../src/lib/weight';

describe('loose units', () => {
  it('detects kg / g / l / ml', () => {
    expect(isLooseUnit('kg')).toBe(true);
    expect(isLooseUnit('g')).toBe(true);
    expect(isLooseUnit('liter')).toBe(true);
    expect(isLooseUnit('ml')).toBe(true);
    expect(isLooseUnit('pc')).toBe(false);
    expect(isLooseUnit('strip')).toBe(false);
  });

  it('only kirana / sweets / bakery / grocery open the weight popup', () => {
    expect(needsWeightPopup('kirana', 'grocery', 'kg')).toBe(true);
    expect(needsWeightPopup('sweets', 'sweets', 'l')).toBe(true);
    expect(needsWeightPopup('bakery', 'bakery', 'kg')).toBe(true);
    expect(needsWeightPopup('rms', 'restaurant', 'kg')).toBe(false);
    expect(needsWeightPopup('kirana', 'grocery', 'pc')).toBe(false);
    expect(needsWeightPopup('pharmacy', 'pharmacy', 'kg')).toBe(false);
  });
});

describe('weight presets', () => {
  it('gives 250g 500g 750g 1kg for a per-kg item', () => {
    const p = weightPresets('kg');
    expect(p.map((x) => x.label)).toEqual(['250 gram', '500 gram', '750 gram', '1 kg']);
    expect(p.map((x) => x.qty)).toEqual([0.25, 0.5, 0.75, 1]);
  });

  it('gives gram quantities when the product itself is in grams', () => {
    const p = weightPresets('g');
    expect(p.map((x) => x.qty)).toEqual([250, 500, 750, 1000]);
  });

  it('gives 250ml–1L for litre items', () => {
    const p = weightPresets('l');
    expect(p.map((x) => x.label)).toEqual(['250 ml', '500 ml', '750 ml', '1 liter']);
    expect(p.map((x) => x.qty)).toEqual([0.25, 0.5, 0.75, 1]);
  });
});

describe('parseCustomWeight', () => {
  it('treats a bare number as already in the product unit', () => {
    expect(parseCustomWeight('0.35', 'kg')).toBeCloseTo(0.35);
    expect(parseCustomWeight('350', 'g')).toBe(350);
  });

  it('converts grams into kg for a per-kg product', () => {
    expect(parseCustomWeight('250g', 'kg')).toBeCloseTo(0.25);
    expect(parseCustomWeight('250 gram', 'kg')).toBeCloseTo(0.25);
    expect(parseCustomWeight('1.25 kg', 'kg')).toBeCloseTo(1.25);
  });

  it('converts ml into litres', () => {
    expect(parseCustomWeight('750 ml', 'l')).toBeCloseTo(0.75);
    expect(parseCustomWeight('1 liter', 'l')).toBe(1);
  });

  it('rejects empty / zero / mixed families', () => {
    expect(parseCustomWeight('', 'kg')).toBeNull();
    expect(parseCustomWeight('0', 'kg')).toBeNull();
    expect(parseCustomWeight('250 ml', 'kg')).toBeNull();
  });
});

describe('convert + format', () => {
  it('converts between g/kg and ml/l', () => {
    expect(convertToProductUnit(500, 'g', 'kg')).toBeCloseTo(0.5);
    expect(convertToProductUnit(2, 'kg', 'g')).toBe(2000);
    expect(convertToProductUnit(250, 'ml', 'l')).toBeCloseTo(0.25);
  });

  it('pretty-prints sub-kilo amounts as grams', () => {
    expect(formatQty(0.25, 'kg')).toBe('250 g');
    expect(formatQty(1, 'kg')).toBe('1 kg');
    expect(formatQty(0.5, 'l')).toBe('500 ml');
  });
});
