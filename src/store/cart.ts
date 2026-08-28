import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, Coupon, Product } from '@/db/types';
import { uid } from '@/db/db';

interface CartStore {
  lines: CartLine[];
  customerId?: string;
  customerName?: string;
  billDiscount: number;
  billDiscountType: 'flat' | 'percent';
  coupon: Coupon | null;
  pointsRedeemed: number;
  note: string;
  channel: 'counter' | 'delivery' | 'takeaway' | 'online';
  tableId?: string;
  serviceChargePct: number;
  deliveryCharge: number;
  packagingCharge: number;
  tip: number;
  add: (p: Product, qty?: number, variant?: string) => void;
  setQty: (lineId: string, qty: number) => void;
  inc: (lineId: string, d: number) => void;
  setPrice: (lineId: string, price: number) => void;
  setLineDiscount: (lineId: string, amt: number) => void;
  setLineNote: (lineId: string, note: string) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  setCustomer: (id?: string, name?: string) => void;
  setBillDiscount: (v: number, t?: 'flat' | 'percent') => void;
  setCoupon: (c: Coupon | null) => void;
  setPoints: (n: number) => void;
  setNote: (s: string) => void;
  setChannel: (c: CartStore['channel']) => void;
  setTable: (id?: string) => void;
  setCharges: (p: Partial<{ serviceChargePct: number; deliveryCharge: number; packagingCharge: number; tip: number }>) => void;
  load: (lines: CartLine[], customerId?: string, customerName?: string) => void;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      lines: [], billDiscount: 0, billDiscountType: 'flat', coupon: null,
      pointsRedeemed: 0, note: '', channel: 'counter',
      serviceChargePct: 0, deliveryCharge: 0, packagingCharge: 0, tip: 0,
      add: (p, qty = 1, variant) =>
        set((s) => {
          const found = s.lines.find((l) => l.productId === p.id && l.variant === variant);
          if (found) return { lines: s.lines.map((l) => (l === found ? { ...l, qty: +(l.qty + qty).toFixed(3) } : l)) };
          const v = variant ? p.variants?.find((x) => x.name === variant) : undefined;
          const line: CartLine = {
            id: uid('l_'), productId: p.id, name: p.name + (variant ? ` (${variant})` : ''),
            qty, price: v?.price ?? p.price, basePrice: v?.price ?? p.price, cost: p.cost,
            gst: p.gst, unit: p.unit, discount: 0, variant,
          };
          return { lines: [...s.lines, line] };
        }),
      setQty: (id, qty) => set((s) => ({ lines: qty <= 0 ? s.lines.filter((l) => l.id !== id) : s.lines.map((l) => (l.id === id ? { ...l, qty: +qty.toFixed(3) } : l)) })),
      inc: (id, d) => { const l = get().lines.find((x) => x.id === id); if (l) get().setQty(id, l.qty + d); },
      setPrice: (id, price) => set((s) => ({ lines: s.lines.map((l) => (l.id === id ? { ...l, price } : l)) })),
      setLineDiscount: (id, amt) => set((s) => ({ lines: s.lines.map((l) => (l.id === id ? { ...l, discount: amt } : l)) })),
      setLineNote: (id, note) => set((s) => ({ lines: s.lines.map((l) => (l.id === id ? { ...l, note } : l)) })),
      remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      clear: () => set({ lines: [], billDiscount: 0, coupon: null, pointsRedeemed: 0, note: '', customerId: undefined, customerName: undefined, tableId: undefined, serviceChargePct: 0, deliveryCharge: 0, packagingCharge: 0, tip: 0 }),
      setCustomer: (customerId, customerName) => set({ customerId, customerName }),
      setBillDiscount: (billDiscount, billDiscountType) => set({ billDiscount, ...(billDiscountType ? { billDiscountType } : {}) }),
      setCoupon: (coupon) => set({ coupon }),
      setPoints: (pointsRedeemed) => set({ pointsRedeemed }),
      setNote: (note) => set({ note }),
      setChannel: (channel) => set({ channel }),
      setTable: (tableId) => set({ tableId }),
      setCharges: (p) => set(p as any),
      load: (lines, customerId, customerName) => set({ lines, customerId, customerName }),
    }),
    { name: 'swiftpos-cart' },
  ),
);
