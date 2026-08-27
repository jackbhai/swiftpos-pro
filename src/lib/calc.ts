import type { CartLine, Coupon, Product } from '@/db/types';

export interface Totals {
  count: number; qty: number; subTotal: number; itemDiscount: number;
  billDiscount: number; couponValue: number; taxable: number; gstAmount: number;
  cgst: number; sgst: number; roundOff: number; total: number; profit: number; margin: number;
}

export function computeTotals(
  lines: CartLine[],
  opts: { billDiscount?: number; billDiscountType?: 'flat' | 'percent'; coupon?: Coupon | null; taxInclusive?: boolean; roundOff?: boolean; pointsRedeemed?: number; pointValue?: number } = {},
): Totals {
  const { billDiscountType = 'flat', taxInclusive = true, roundOff: doRound = true } = opts;
  const gross = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const itemDiscount = lines.reduce((s, l) => s + (l.discount || 0), 0);
  const afterItem = Math.max(0, gross - itemDiscount);

  let billDiscount = 0;
  if (opts.billDiscount) {
    billDiscount = billDiscountType === 'percent'
      ? (afterItem * opts.billDiscount) / 100
      : opts.billDiscount;
  }
  billDiscount = Math.min(billDiscount, afterItem);

  let couponValue = 0;
  const c = opts.coupon;
  if (c && c.active && afterItem >= c.minBill) {
    couponValue = c.type === 'flat' ? c.value : (afterItem * c.value) / 100;
    if (c.maxDiscount) couponValue = Math.min(couponValue, c.maxDiscount);
  }
  const pointsCut = (opts.pointsRedeemed || 0) * (opts.pointValue ?? 1);

  const net = Math.max(0, afterItem - billDiscount - couponValue - pointsCut);
  const ratio = afterItem > 0 ? net / afterItem : 0;

  let gstAmount = 0;
  for (const l of lines) {
    const lineNet = (l.price * l.qty - (l.discount || 0)) * ratio;
    gstAmount += taxInclusive ? (lineNet * l.gst) / (100 + l.gst) : (lineNet * l.gst) / 100;
  }
  const taxable = taxInclusive ? net - gstAmount : net;
  const preRound = taxInclusive ? net : net + gstAmount;
  const total = doRound ? Math.round(preRound) : +preRound.toFixed(2);
  const profit = lines.reduce((s, l) => s + (l.price - l.cost) * l.qty - (l.discount || 0), 0) - billDiscount - couponValue - pointsCut;

  return {
    count: lines.length,
    qty: lines.reduce((s, l) => s + l.qty, 0),
    subTotal: +gross.toFixed(2),
    itemDiscount: +itemDiscount.toFixed(2),
    billDiscount: +billDiscount.toFixed(2),
    couponValue: +(couponValue + pointsCut).toFixed(2),
    taxable: +taxable.toFixed(2),
    gstAmount: +gstAmount.toFixed(2),
    cgst: +(gstAmount / 2).toFixed(2),
    sgst: +(gstAmount / 2).toFixed(2),
    roundOff: +(total - preRound).toFixed(2),
    total,
    profit: +profit.toFixed(2),
    margin: total > 0 ? +((profit / total) * 100).toFixed(1) : 0,
  };
}

export const stockState = (p: Product) =>
  !p.trackStock ? 'ok' : p.stock <= 0 ? 'out' : p.stock <= p.lowStock ? 'low' : 'ok';

export function expiryState(p: Product, days = 30) {
  if (!p.expiry) return null;
  const diff = Math.ceil((new Date(p.expiry).getTime() - Date.now()) / 864e5);
  if (diff < 0) return 'expired';
  if (diff <= days) return 'soon';
  return 'fresh';
}

export function fuzzyScore(q: string, text: string) {
  const t = text.toLowerCase(); const s = q.toLowerCase().trim();
  if (!s) return 1;
  if (t.startsWith(s)) return 100;
  if (t.includes(s)) return 60;
  let i = 0;
  for (const ch of t) if (ch === s[i]) i++;
  return i === s.length ? 25 : 0;
}
