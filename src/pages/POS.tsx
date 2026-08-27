import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScanLine, Trash2, Plus, Minus, User, Tag, Pause, Play, Percent, StickyNote,
  ShoppingCart, X, Grid3x3, List, Star, ChevronDown, Utensils, Truck, Store, Globe,
} from 'lucide-react';
import { useProducts, useHolds, useCoupons, useCustomers } from '@/hooks/useData';
import { useCart } from '@/store/cart';
import { useSettings, useShop } from '@/store/settings';
import { useSession } from '@/store/session';
import { db, uid } from '@/db/db';
import { computeTotals, fuzzyScore, stockState } from '@/lib/calc';
import { money, cx } from '@/lib/format';
import { finalizeSale } from '@/lib/sale';
import { toast, useUI } from '@/store/ui';
import { clickSound, successSound, errorSound, buzz } from '@/lib/sound';
import { useHotkeys } from '@/hooks/useKeys';
import { Modal, Field, Input, Empty, SearchBar, Badge, Select, Textarea } from '@/components/ui';
import ProductGrid from '@/components/pos/ProductGrid';
import PaymentModal from '@/components/pos/PaymentModal';
import ReceiptModal from '@/components/pos/ReceiptModal';
import CustomerPicker from '@/components/pos/CustomerPicker';
import Scanner from '@/components/pos/Scanner';
import type { Product, Sale } from '@/db/types';

const CHANNELS = [
  { id: 'counter', label: 'Counter', icon: Store },
  { id: 'takeaway', label: 'Takeaway', icon: ShoppingCart },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'online', label: 'Online', icon: Globe },
] as const;

export default function POS() {
  const products = useProducts() || [];
  const holds = useHolds() || [];
  const coupons = useCoupons() || [];
  const customers = useCustomers() || [];
  const cart = useCart();
  const s = useSettings();
  const { terms, modules } = useShop();
  const session = useSession();

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [favOnly, setFavOnly] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'list'>(s.posLayout);
  const [cartOpen, setCartOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [custOpen, setCustOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [lineEdit, setLineEdit] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [limit, setLimit] = useState(60);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setLayout(s.posLayout), [s.posLayout]);
  useEffect(() => setLimit(60), [q, cat, favOnly]);

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    products.forEach((p: Product) => p.active && m.set(p.category, (m.get(p.category) || 0) + 1));
    return ['All', ...[...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.filter((p: Product) => p.active);
    if (favOnly) list = list.filter((p: Product) => p.favorite);
    if (cat !== 'All') list = list.filter((p: Product) => p.category === cat);
    if (q.trim()) {
      const scored = list.map((p: Product) => ({
        p, s: Math.max(fuzzyScore(q, p.name), fuzzyScore(q, p.sku) * 0.9,
          p.barcode ? fuzzyScore(q, p.barcode) : 0, p.brand ? fuzzyScore(q, p.brand) * 0.7 : 0),
      })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
      list = scored.map((x) => x.p);
    } else if (session.recentProductIds.length) {
      const rank = new Map(session.recentProductIds.map((id, i) => [id, i]));
      list = [...list].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
    }
    return list;
  }, [products, q, cat, favOnly, session.recentProductIds]);

  const totals = computeTotals(cart.lines, {
    billDiscount: cart.billDiscount, billDiscountType: cart.billDiscountType,
    coupon: cart.coupon, taxInclusive: s.taxInclusive, roundOff: s.roundOff,
    pointsRedeemed: cart.pointsRedeemed, pointValue: s.pointValue,
  });

  const customer = customers.find((c: any) => c.id === cart.customerId);

  const addProduct = (p: Product) => {
    if (!s.negativeStock && p.trackStock && p.stock <= 0) { errorSound(); return toast(`${p.name} is out of stock`, 'err'); }
    cart.add(p); session.pushRecent(p.id); clickSound(); buzz(8);
  };

  const onScan = (code: string) => {
    const p = products.find((x: Product) => x.barcode === code || x.sku === code);
    if (p) addProduct(p); else { errorSound(); toast(`No ${terms.product.toLowerCase()} for code ${code}`, 'err'); }
  };

  const doHold = async () => {
    if (!cart.lines.length) return toast('Cart is empty', 'err');
    await db.holds.add({ id: uid('h_'), label: cart.customerName || `Hold ${holds.length + 1}`, lines: cart.lines, customerId: cart.customerId, ts: Date.now(), note: cart.note });
    cart.clear(); toast('Bill held'); setCartOpen(false);
  };

  const pay = async (mode: any, tendered?: number, splits?: any) => {
    try {
      const sale = await finalizeSale({ payMode: mode, tendered, splits });
      setPayOpen(false); setCartOpen(false); setReceipt(sale); successSound(); buzz([10, 40, 10]);
      if (s.autoPrint) setTimeout(() => document.getElementById('auto-print-trigger')?.click(), 100);
    } catch (e: any) { errorSound(); toast(e.message ?? 'Payment failed', 'err'); }
  };

  useHotkeys({
    'mod+enter': (e) => { e.preventDefault(); cart.lines.length && setPayOpen(true); },
    'f8': (e) => { e.preventDefault(); setScanOpen(true); },
    'f9': (e) => { e.preventDefault(); doHold(); },
    'f10': (e) => { e.preventDefault(); setCustOpen(true); },
    '/': (e) => { if (document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); searchRef.current?.focus(); } },
  });

  const CartBody = (
    <div className="flex h-full flex-col">
      {/* customer + channel */}
      <div className="space-y-2 border-b border-line p-3">
        <div className="flex gap-2">
          <button onClick={() => setCustOpen(true)} className={cx('flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold', cart.customerId ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line text-ink3')}>
            <User size={14} />
            <span className="min-w-0 flex-1 truncate">{cart.customerName ?? `Walk-in ${terms.customer.toLowerCase()}`}</span>
            {customer && <span className="shrink-0 text-[10px]">{customer.points} pts</span>}
          </button>
          <button onClick={() => setHoldOpen(true)} className="btn-ghost relative px-3">
            <Pause size={15} />{holds.length > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-brand px-1.5 text-[9px] font-bold text-black">{holds.length}</span>}
          </button>
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return <button key={c.id} onClick={() => cart.setChannel(c.id)} className={cx('chip flex items-center gap-1', cart.channel === c.id && 'chip-on')}><Icon size={12} />{c.label}</button>;
          })}
        </div>
      </div>

      {/* lines */}
      <div className="flex-1 overflow-y-auto p-3">
        {cart.lines.length === 0 ? (
          <Empty title="Cart is empty" sub={`Tap a ${terms.product.toLowerCase()} or scan a barcode to begin.`} icon={<ShoppingCart size={26} />} />
        ) : (
          <div className="space-y-2">
            {cart.lines.map((l) => (
              <div key={l.id} className="rounded-xl border border-line bg-surface2/40 p-2.5">
                <div className="flex items-start gap-2">
                  <button onClick={() => setLineEdit(l.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-ink">{l.name}</p>
                    <p className="text-[11px] text-ink3">
                      {money(l.price, s.currency)} × {l.qty} {l.unit}
                      {l.discount > 0 && <span className="text-ok"> · −{money(l.discount, s.currency)}</span>}
                      {l.price !== l.basePrice && <span className="text-warn"> · price edited</span>}
                    </p>
                    {l.note && <p className="truncate text-[11px] italic text-brand">“{l.note}”</p>}
                  </button>
                  <span className="shrink-0 font-mono text-sm font-bold text-ink">{money(l.price * l.qty - l.discount, s.currency)}</span>
                  <button onClick={() => cart.remove(l.id)} className="shrink-0 rounded-lg p-1 text-ink3 hover:text-bad"><X size={14} /></button>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <button onClick={() => { cart.inc(l.id, -1); buzz(6); }} className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink2 active:scale-95"><Minus size={13} /></button>
                  <input value={l.qty} onChange={(e) => cart.setQty(l.id, parseFloat(e.target.value) || 0)} inputMode="decimal"
                    className="h-7 w-14 rounded-lg border border-line bg-surface text-center font-mono text-xs text-ink outline-none focus:border-brand" />
                  <button onClick={() => { cart.inc(l.id, 1); buzz(6); }} className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink2 active:scale-95"><Plus size={13} /></button>
                  <button onClick={() => setLineEdit(l.id)} className="ml-auto text-[11px] font-bold text-brand">Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* totals */}
      <div className="safe-b border-t border-line bg-surface2/40 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <button className="chip" onClick={() => setDiscOpen(true)}><Percent size={11} className="mr-1 inline" />Discount</button>
          <button className="chip" onClick={() => setNoteOpen(true)}><StickyNote size={11} className="mr-1 inline" />Note</button>
          <button className="chip" onClick={doHold}><Pause size={11} className="mr-1 inline" />Hold</button>
          <button className="chip" onClick={() => { cart.clear(); toast('Cart cleared'); }}><Trash2 size={11} className="mr-1 inline" />Clear</button>
        </div>
        <div className="space-y-1 text-xs">
          <Row label="Subtotal" value={money(totals.subTotal, s.currency)} />
          {totals.itemDiscount > 0 && <Row label="Item discount" value={'−' + money(totals.itemDiscount, s.currency)} tone="ok" />}
          {totals.billDiscount > 0 && <Row label="Bill discount" value={'−' + money(totals.billDiscount, s.currency)} tone="ok" />}
          {totals.couponValue > 0 && <Row label={cart.coupon ? `Coupon ${cart.coupon.code}` : 'Points redeemed'} value={'−' + money(totals.couponValue, s.currency)} tone="ok" />}
          <Row label={`GST (${s.taxInclusive ? 'incl.' : 'extra'})`} value={money(totals.gstAmount, s.currency)} />
          {!!totals.roundOff && <Row label="Round off" value={money(totals.roundOff, s.currency)} />}
        </div>
        <div className="mt-2 flex items-end justify-between border-t border-line pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink3">Total</span>
          <span className="font-mono text-2xl font-extrabold text-brand">{money(totals.total, s.currency)}</span>
        </div>
        <button disabled={!cart.lines.length} onClick={() => setPayOpen(true)} className="btn-primary mt-2 w-full py-3 text-base">
          Charge {money(totals.total, s.currency)}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex gap-3">
      {/* catalogue */}
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1"><SearchBar value={q} onChange={setQ} placeholder={`Search ${terms.products.toLowerCase()}, SKU, barcode…`} /></div>
          <button onClick={() => setScanOpen(true)} className="btn-primary px-3"><ScanLine size={17} /></button>
          <button onClick={() => setLayout(layout === 'grid' ? 'list' : 'grid')} className="btn-ghost px-3">{layout === 'grid' ? <List size={16} /> : <Grid3x3 size={16} />}</button>
        </div>

        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setFavOnly(!favOnly)} className={cx('chip flex items-center gap-1', favOnly && 'chip-on')}><Star size={11} />Favourites</button>
          {categories.slice(0, 24).map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cx('chip', cat === c && 'chip-on')}>{c}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Empty title={`No ${terms.products.toLowerCase()} found`} sub="Try another search, or import your catalogue from Settings → JSON Data." />
        ) : (
          <>
            <ProductGrid products={filtered.slice(0, limit)} onPick={addProduct} layout={layout}
              cols={typeof window !== 'undefined' && window.innerWidth > 1024 ? 5 : s.gridCols} />
            {filtered.length > limit && (
              <button className="btn-ghost w-full" onClick={() => setLimit((l) => l + 120)}>
                <ChevronDown size={15} /> Show more ({filtered.length - limit} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {/* cart — desktop */}
      <aside className="hidden w-[370px] shrink-0 xl:block">
        <div className="sticky top-4 h-[calc(100dvh-6rem)] overflow-hidden rounded-2xl border border-line bg-surface">{CartBody}</div>
      </aside>

      {/* cart — mobile sheet trigger */}
      <button onClick={() => setCartOpen(true)} className="no-print safe-b fixed inset-x-3 bottom-[68px] z-30 flex items-center justify-between rounded-2xl bg-brand px-4 py-3 text-black shadow-glow xl:hidden">
        <span className="flex items-center gap-2 text-sm font-bold"><ShoppingCart size={17} />{totals.qty} item{totals.qty === 1 ? '' : 's'}</span>
        <span className="font-mono text-base font-extrabold">{money(totals.total, s.currency)}</span>
      </button>

      {cartOpen && (
        <div className="fixed inset-0 z-[70] xl:hidden" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="absolute inset-x-0 bottom-0 top-10 animate-slideup overflow-hidden rounded-t-3xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="text-sm font-bold text-ink">Current {terms.sale.toLowerCase()}</h3>
              <button onClick={() => setCartOpen(false)} className="rounded-lg p-1.5 text-ink3"><X size={18} /></button>
            </div>
            <div className="h-[calc(100%-49px)]">{CartBody}</div>
          </div>
        </div>
      )}

      {/* modals */}
      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} total={totals.total} hasCustomer={!!cart.customerId} onConfirm={pay} />
      <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />
      <CustomerPicker open={custOpen} onClose={() => setCustOpen(false)} />
      <Scanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={onScan} />
      <LineEditor lineId={lineEdit} onClose={() => setLineEdit(null)} kitchenNote={modules.kitchenNote} />
      <DiscountModal open={discOpen} onClose={() => setDiscOpen(false)} coupons={coupons} subtotal={totals.subTotal} customer={customer} />
      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Bill note"
        footer={<button className="btn-primary w-full" onClick={() => setNoteOpen(false)}>Save note</button>}>
        <Textarea value={cart.note} onChange={(e) => cart.setNote(e.target.value)} placeholder="Delivery address, instructions, reference…" autoFocus />
      </Modal>
      <Modal open={holdOpen} onClose={() => setHoldOpen(false)} title={`Held ${terms.sales.toLowerCase()} (${holds.length})`}>
        {holds.length === 0 ? <Empty title="Nothing on hold" sub="Press F9 to park the current cart." /> : (
          <div className="space-y-2">
            {holds.map((h: any) => (
              <div key={h.id} className="flex items-center gap-2 rounded-xl border border-line p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{h.label}</p>
                  <p className="text-[11px] text-ink3">{h.lines.length} items · {new Date(h.ts).toLocaleTimeString('en-IN')}</p>
                </div>
                <button className="btn-primary px-3 py-1.5 text-xs" onClick={async () => { cart.load(h.lines, h.customerId, h.label); await db.holds.delete(h.id); setHoldOpen(false); toast('Bill recalled'); }}><Play size={13} /> Recall</button>
                <button className="btn-ghost px-2 py-1.5" onClick={() => db.holds.delete(h.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' }) {
  return <div className="flex justify-between"><span className="text-ink3">{label}</span><span className={cx('font-mono', tone === 'ok' ? 'text-ok' : 'text-ink2')}>{value}</span></div>;
}

function LineEditor({ lineId, onClose, kitchenNote }: { lineId: string | null; onClose: () => void; kitchenNote: boolean }) {
  const cart = useCart(); const s = useSettings();
  const line = cart.lines.find((l) => l.id === lineId);
  if (!line) return null;
  return (
    <Modal open={!!lineId} onClose={onClose} title={line.name}
      footer={<div className="flex gap-2">
        <button className="btn-danger flex-1" onClick={() => { cart.remove(line.id); onClose(); }}>Remove</button>
        <button className="btn-primary flex-1" onClick={onClose}>Done</button>
      </div>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity"><Input inputMode="decimal" value={line.qty} onChange={(e) => cart.setQty(line.id, parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Unit price"><Input inputMode="decimal" value={line.price} onChange={(e) => cart.setPrice(line.id, parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Line discount (₹)"><Input inputMode="decimal" value={line.discount || ''} onChange={(e) => cart.setLineDiscount(line.id, parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Discount %">
          <Input inputMode="decimal" placeholder="0" onChange={(e) => cart.setLineDiscount(line.id, +((line.price * line.qty * (parseFloat(e.target.value) || 0)) / 100).toFixed(2))} />
        </Field>
      </div>
      {kitchenNote && <Field label="Kitchen / item note" className="mt-3"><Input value={line.note ?? ''} onChange={(e) => cart.setLineNote(line.id, e.target.value)} placeholder="Less spicy, no onion…" /></Field>}
      <div className="mt-3 rounded-xl border border-line bg-surface2 p-3 text-center">
        <p className="text-[11px] uppercase tracking-wider text-ink3">Line total</p>
        <p className="font-mono text-xl font-bold text-brand">{money(line.price * line.qty - (line.discount || 0), s.currency)}</p>
      </div>
    </Modal>
  );
}

function DiscountModal({ open, onClose, coupons, subtotal, customer }: any) {
  const cart = useCart(); const s = useSettings();
  const [code, setCode] = useState('');
  const maxPoints = customer ? Math.min(customer.points, Math.floor(subtotal / s.pointValue)) : 0;
  return (
    <Modal open={open} onClose={onClose} title="Discounts & offers" footer={<button className="btn-primary w-full" onClick={onClose}>Apply</button>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bill discount"><Input inputMode="decimal" value={cart.billDiscount || ''} onChange={(e) => cart.setBillDiscount(parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Type">
          <Select value={cart.billDiscountType} onChange={(e) => cart.setBillDiscount(cart.billDiscount, e.target.value as any)}>
            <option value="flat">Flat ₹</option><option value="percent">Percent %</option>
          </Select>
        </Field>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[5, 10, 15, 20].map((p) => <button key={p} className="chip" onClick={() => cart.setBillDiscount(p, 'percent')}>{p}% off</button>)}
      </div>

      <p className="label mt-4">Coupon</p>
      <div className="flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter code" />
        <button className="btn-soft" onClick={() => {
          const c = coupons.find((x: any) => x.code === code.trim() && x.active);
          if (!c) return toast('Invalid coupon', 'err');
          if (subtotal < c.minBill) return toast(`Minimum bill ${money(c.minBill, s.currency)}`, 'err');
          cart.setCoupon(c); toast(`${c.code} applied`);
        }}>Apply</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {coupons.filter((c: any) => c.active).map((c: any) => (
          <button key={c.id} className={cx('chip', cart.coupon?.id === c.id && 'chip-on')} onClick={() => { if (subtotal < c.minBill) return toast(`Min bill ${money(c.minBill, s.currency)}`, 'err'); cart.setCoupon(c); }}>
            {c.code} · {c.type === 'flat' ? money(c.value, s.currency) : c.value + '%'}
          </button>
        ))}
        {cart.coupon && <button className="chip border-bad/50 text-bad" onClick={() => cart.setCoupon(null)}>Remove coupon</button>}
      </div>

      {s.loyaltyEnabled && customer && (
        <>
          <p className="label mt-4">Loyalty points ({customer.points} available)</p>
          <div className="flex gap-2">
            <Input inputMode="numeric" value={cart.pointsRedeemed || ''} onChange={(e) => cart.setPoints(Math.min(maxPoints, parseInt(e.target.value) || 0))} placeholder="0" />
            <button className="btn-soft" onClick={() => cart.setPoints(maxPoints)}>Max ({maxPoints})</button>
          </div>
          <p className="mt-1 text-[11px] text-ink3">1 point = {money(s.pointValue, s.currency)} · min redemption {s.minRedeem} pts</p>
        </>
      )}
    </Modal>
  );
}
