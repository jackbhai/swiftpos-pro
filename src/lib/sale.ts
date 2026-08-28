import { db, uid, addStockLog, logActivity } from '@/db/db';
import type { CartLine, PayMode, Sale, SplitPart } from '@/db/types';
import { computeTotals } from './calc';
import { useCart } from '@/store/cart';
import { useBillMeta } from '@/store/billMeta';
import { useSettings } from '@/store/settings';
import { useSession } from '@/store/session';

export async function finalizeSale(opts: {
  payMode: PayMode; tendered?: number; splits?: SplitPart[];
}): Promise<Sale> {
  const cart = useCart.getState();
  const s = useSettings.getState();
  const session = useSession.getState();
  const lines: CartLine[] = cart.lines;
  if (!lines.length) throw new Error('Cart is empty');

  const t = computeTotals(lines, {
    billDiscount: cart.billDiscount, billDiscountType: cart.billDiscountType,
    coupon: cart.coupon, taxInclusive: s.taxInclusive, roundOff: s.roundOff, roundMode: s.roundMode,
    pointsRedeemed: cart.pointsRedeemed, pointValue: s.pointValue,
    serviceChargePct: cart.serviceChargePct, deliveryCharge: cart.deliveryCharge,
    packagingCharge: cart.packagingCharge, tip: cart.tip,
  });

  const invoiceNo = s.invoicePrefix + String(s.invoiceNext).padStart(s.invoicePadding ?? 5, '0') + (s.invoiceSuffix ?? '');
  const pointsEarned = s.loyaltyEnabled && cart.customerId ? Math.floor((t.total / 100) * s.pointsPer100) : 0;

  const sale: Sale = {
    id: uid('sa_'), invoiceNo, ts: Date.now(), lines: JSON.parse(JSON.stringify(lines)),
    subTotal: t.subTotal, itemDiscount: t.itemDiscount, billDiscount: t.billDiscount,
    couponCode: cart.coupon?.code, couponValue: t.couponValue, taxable: t.taxable,
    gstAmount: t.gstAmount, roundOff: t.roundOff, total: t.total, profit: t.profit,
    serviceCharge: t.serviceCharge, deliveryCharge: t.deliveryCharge, packagingCharge: t.packagingCharge, tip: t.tip,
    payMode: opts.payMode, splits: opts.splits, tendered: opts.tendered,
    change: opts.tendered ? +(opts.tendered - t.total).toFixed(2) : undefined,
    customerId: cart.customerId, customerName: cart.customerName,
    staffId: session.staff?.id, staffName: session.staff?.name,
    note: cart.note || undefined, status: 'completed',
    pointsEarned, pointsRedeemed: cart.pointsRedeemed || 0,
    shiftId: session.shiftId, channel: cart.channel,
    meta: Object.keys(useBillMeta.getState().values).length ? { ...useBillMeta.getState().values } : undefined,
  };

  await db.transaction('rw', [db.sales, db.products, db.customers, db.stockLogs, db.activity, db.coupons], async () => {
    await db.sales.add(sale);
    for (const l of lines) {
      const p = await db.products.get(l.productId);
      if (!p || !p.trackStock) continue;
      const after = +(p.stock - l.qty).toFixed(3);
      await db.products.update(p.id, { stock: after, updatedAt: Date.now() });
      await addStockLog(p.id, p.name, 'sale', -l.qty, p.stock, after, invoiceNo);
    }
    if (cart.customerId) {
      const c = await db.customers.get(cart.customerId);
      if (c) await db.customers.update(c.id, {
        totalSpend: +(c.totalSpend + t.total).toFixed(2),
        visits: c.visits + 1, lastVisit: Date.now(),
        points: Math.max(0, c.points + pointsEarned - (cart.pointsRedeemed || 0)),
        credit: opts.payMode === 'credit' ? +(c.credit + t.total).toFixed(2) : c.credit,
      });
    }
    if (cart.coupon) {
      const cp = await db.coupons.get(cart.coupon.id);
      if (cp) await db.coupons.update(cp.id, { used: cp.used + 1 });
    }
  });

  await logActivity('sale', `${invoiceNo} · ₹${t.total} via ${opts.payMode}`, session.staff?.name);
  s.set({ invoiceNext: s.invoiceNext + 1 });
  const keepCust = s.keepCustomerAfterSale ? { id: cart.customerId, name: cart.customerName } : null;
  cart.clear();
  useBillMeta.getState().clear();
  if (keepCust?.id) cart.setCustomer(keepCust.id, keepCust.name);
  return sale;
}

export async function refundSale(saleId: string, amount?: number, restock = true) {
  const sale = await db.sales.get(saleId);
  if (!sale) throw new Error('Sale not found');
  const amt = amount ?? sale.total;
  await db.transaction('rw', [db.sales, db.products, db.customers, db.stockLogs, db.activity], async () => {
    await db.sales.update(saleId, {
      status: amt >= sale.total ? 'refunded' : 'partial-refund',
      refundedAmount: +( (sale.refundedAmount || 0) + amt ).toFixed(2),
    });
    if (restock && amt >= sale.total) {
      for (const l of sale.lines) {
        const p = await db.products.get(l.productId);
        if (!p || !p.trackStock) continue;
        const after = +(p.stock + l.qty).toFixed(3);
        await db.products.update(p.id, { stock: after });
        await addStockLog(p.id, p.name, 'return', l.qty, p.stock, after, sale.invoiceNo);
      }
    }
    if (sale.customerId) {
      const c = await db.customers.get(sale.customerId);
      if (c) await db.customers.update(c.id, { totalSpend: Math.max(0, +(c.totalSpend - amt).toFixed(2)) });
    }
  });
  await logActivity('refund', `Refund ${sale.invoiceNo} · ₹${amt}`);
}
