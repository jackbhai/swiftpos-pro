import { describe, it, expect } from 'vitest';
import { computeTotals, stockState, expiryState, fuzzyScore } from '../src/lib/calc';

const line = (over: any = {}) => ({
  id: 'l1', productId: 'p1', name: 'Item', qty: 1, price: 100, basePrice: 100,
  cost: 60, gst: 5, unit: 'pc', discount: 0, ...over,
});

describe('computeTotals', () => {
  it('sums a simple tax-inclusive bill', () => {
    const t = computeTotals([line()], { taxInclusive: true, roundOff: false });
    expect(t.subTotal).toBe(100);
    expect(t.total).toBe(100);
    expect(t.gstAmount).toBeCloseTo(4.76, 2);
    expect(t.taxable).toBeCloseTo(95.24, 2);
  });

  it('adds tax on top when prices are tax-exclusive', () => {
    const t = computeTotals([line()], { taxInclusive: false, roundOff: false });
    expect(t.total).toBeCloseTo(105, 2);
    expect(t.gstAmount).toBeCloseTo(5, 2);
  });

  it('applies percent bill discount before tax', () => {
    const t = computeTotals([line({ qty: 2 })], { billDiscount: 10, billDiscountType: 'percent', roundOff: false });
    expect(t.subTotal).toBe(200);
    expect(t.billDiscount).toBe(20);
    expect(t.total).toBe(180);
  });

  it('never discounts below zero', () => {
    const t = computeTotals([line()], { billDiscount: 500, roundOff: false });
    expect(t.total).toBe(0);
    expect(t.billDiscount).toBe(100);
  });

  it('honours coupon minimum bill', () => {
    const coupon: any = { id: 'c', code: 'SAVE', type: 'flat', value: 50, minBill: 500, active: true };
    const small = computeTotals([line()], { coupon, roundOff: false });
    expect(small.couponValue).toBe(0);
    const big = computeTotals([line({ qty: 10 })], { coupon, roundOff: false });
    expect(big.couponValue).toBe(50);
  });

  it('caps a percent coupon at maxDiscount', () => {
    const coupon: any = { id: 'c', code: 'P', type: 'percent', value: 50, minBill: 0, maxDiscount: 30, active: true };
    const t = computeTotals([line()], { coupon, roundOff: false });
    expect(t.couponValue).toBe(30);
  });

  it('adds service, packaging, delivery and tip', () => {
    const t = computeTotals([line()], { serviceChargePct: 10, packagingCharge: 20, deliveryCharge: 30, tip: 5, roundOff: false, taxInclusive: true });
    expect(t.serviceCharge).toBe(10);
    expect(t.charges).toBe(65);
    expect(t.total).toBe(165);
  });

  it('rounds off correctly in each mode', () => {
    const l = [line({ price: 100.4 })];
    expect(computeTotals(l, { roundOff: true, roundMode: 'nearest' }).total).toBe(100);
    expect(computeTotals(l, { roundOff: true, roundMode: 'up' }).total).toBe(101);
    expect(computeTotals(l, { roundOff: true, roundMode: 'down' }).total).toBe(100);
  });

  it('computes profit and margin', () => {
    const t = computeTotals([line({ qty: 2 })], { roundOff: false });
    expect(t.profit).toBe(80);
    expect(t.margin).toBeCloseTo(40, 1);
  });

  it('handles an empty cart', () => {
    const t = computeTotals([], {});
    expect(t.total).toBe(0);
    expect(t.count).toBe(0);
  });
});

describe('stock & expiry state', () => {
  const p = (o: any) => ({ trackStock: true, stock: 10, lowStock: 3, ...o } as any);
  it('flags out / low / ok stock', () => {
    expect(stockState(p({ stock: 0 }))).toBe('out');
    expect(stockState(p({ stock: 2 }))).toBe('low');
    expect(stockState(p({ stock: 50 }))).toBe('ok');
    expect(stockState(p({ trackStock: false, stock: 0 }))).toBe('ok');
  });
  it('flags expired and soon-to-expire batches', () => {
    const day = 86400000;
    expect(expiryState(p({ expiry: new Date(Date.now() - day).toISOString() }), 30)).toBe('expired');
    expect(expiryState(p({ expiry: new Date(Date.now() + 5 * day).toISOString() }), 30)).toBe('soon');
    expect(expiryState(p({ expiry: new Date(Date.now() + 400 * day).toISOString() }), 30)).toBe('fresh');
  });
});

describe('fuzzyScore', () => {
  it('scores exact and partial matches higher than misses', () => {
    expect(fuzzyScore('para', 'Paracetamol 500')).toBeGreaterThan(0);
    expect(fuzzyScore('zzz', 'Paracetamol 500')).toBe(0);
  });
});
