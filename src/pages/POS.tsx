import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScanLine, Trash2, Plus, Minus, User, Tag, Pause, Play, Percent, StickyNote,
  ShoppingCart, X, Grid3x3, List, Star, ChevronDown, Utensils, Truck, Store, Globe,
  CreditCard, Sparkles, AlertCircle, Hash, CheckCircle2,
} from 'lucide-react';
import { useHolds, useCoupons, useCustomers } from '@/hooks/useData';
import { useCatalog, useDebounced, searchProducts } from '@/hooks/useCatalog';
import { VirtualList } from '@/components/ui/Virtual';
import { useCart } from '@/store/cart';
import { useSettings, useShop } from '@/store/settings';
import { useSession } from '@/store/session';
import { db, uid } from '@/db/db';
import { computeTotals, stockState } from '@/lib/calc';
import { money, cx } from '@/lib/format';
import { finalizeSale } from '@/lib/sale';
import { toast, useUI } from '@/store/ui';
import { beep, clickSound, successSound, errorSound, buzz } from '@/lib/sound';
import { useHotkeys } from '@/hooks/useKeys';
import { Modal, Field, Input, Empty, SearchBar, Badge, Select, Textarea } from '@/components/ui';
import ProductGrid, { ProductCard, ProductRow } from '@/components/pos/ProductGrid';
import PaymentModal from '@/components/pos/PaymentModal';
import ReceiptModal from '@/components/pos/ReceiptModal';
import CustomerPicker from '@/components/pos/CustomerPicker';
import SystemFields from '@/components/pos/SystemFields';
import { useBillMeta } from '@/store/billMeta';
import Scanner from '@/components/pos/Scanner';
import type { Product, Sale } from '@/db/types';

const CHANNELS = [
  { id: 'counter', label: 'Counter', icon: Store },
  { id: 'takeaway', label: 'Takeaway', icon: ShoppingCart },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'online', label: 'Online', icon: Globe },
] as const;

export default function POS() {
  const { products, loading: catLoading } = useCatalog();
  const holds = useHolds() || [];
  const coupons = useCoupons() || [];
  const customers = useCustomers() || [];
  const cart = useCart();
  const s = useSettings();
  const { terms, modules, system } = useShop();
  const billMeta = useBillMeta();
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
  const [chargeOpen, setChargeOpen] = useState(false);
  const [lineEdit, setLineEdit] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dq = useDebounced(q, 100);
  const scanBuf = useRef({ text: '', t: 0 });

  useEffect(() => setLayout(s.posLayout), [s.posLayout]);

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    products.forEach((p: Product) => p.active && m.set(p.category, (m.get(p.category) || 0) + 1));
    return ['All', ...[...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.active);
    if (favOnly) list = list.filter((p) => p.favorite);
    if (cat !== 'All') list = list.filter((p) => p.category === cat);
    if (dq.trim()) return searchProducts(list as any, dq, 400) as any[];
    if (session.recentProductIds.length) {
      const rank = new Map(session.recentProductIds.map((id, i) => [id, i]));
      list = [...list].sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999));
    }
    return list;
  }, [products, dq, cat, favOnly, session.recentProductIds]);

  const totals = computeTotals(cart.lines, {
    billDiscount: cart.billDiscount,
    billDiscountType: cart.billDiscountType,
    coupon: cart.coupon,
    taxInclusive: s.taxInclusive,
    roundOff: s.roundOff,
    roundMode: s.roundMode,
    pointsRedeemed: cart.pointsRedeemed,
    pointValue: s.pointValue,
    serviceChargePct: cart.serviceChargePct || (s.serviceChargeEnabled ? s.serviceChargePct : 0),
    deliveryCharge: cart.deliveryCharge || (cart.channel === 'delivery' ? s.deliveryCharge : 0),
    packagingCharge: cart.packagingCharge || (cart.channel !== 'counter' ? s.packagingCharge : 0),
    tip: cart.tip,
  });

  const customer = customers.find((c: any) => c.id === cart.customerId);

  const [vw, setVw] = useState(typeof window === 'undefined' ? 1200 : window.innerWidth);
  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  const cols = vw >= 1536 ? 5 : vw >= 1280 ? 4 : vw >= 768 ? 4 : s.gridCols;

  const addProduct = (p: Product) => {
    if (!s.negativeStock && p.trackStock && p.stock <= 0) {
      errorSound();
      buzz('warning');
      return toast(`${p.name} is out of stock`, 'err');
    }
    cart.add(p);
    session.pushRecent(p.id);
    clickSound();
    buzz('light');
  };

  const onScan = (code: string) => {
    const p = products.find((x: Product) => x.barcode === code || x.sku === code);
    if (p) {
      addProduct(p);
      beep();
      toast(`Added: ${p.name}`);
    } else {
      errorSound();
      buzz('warning');
      toast(`No ${terms.product.toLowerCase()} for barcode: ${code}`, 'err');
    }
  };

  const doHold = async () => {
    if (!cart.lines.length) {
      errorSound();
      return toast('Cart is empty', 'err');
    }
    await db.holds.add({
      id: uid('h_'),
      label: cart.customerName || `Hold ${holds.length + 1}`,
      lines: cart.lines,
      customerId: cart.customerId,
      ts: Date.now(),
      note: cart.note,
    });
    cart.clear();
    clickSound();
    buzz('medium');
    toast('Bill held successfully');
    setCartOpen(false);
  };

  const openPay = () => {
    const need = system.capture.filter((f) => f.scope === 'bill' && f.required && !billMeta.values[f.key]);
    if (need.length) {
      errorSound();
      buzz('warning');
      return toast(`${need.map((f) => f.label).join(', ')} required before payment`, 'err');
    }
    clickSound();
    buzz('light');
    setPayOpen(true);
  };

  const pay = async (mode: any, tendered?: number, splits?: any) => {
    try {
      const sale = await finalizeSale({ payMode: mode, tendered, splits });
      setPayOpen(false);
      setCartOpen(false);
      setReceipt(sale);
      successSound();
      buzz('success');
      if (s.autoPrint) {
        setTimeout(() => document.getElementById('auto-print-trigger')?.click(), 100);
      }
    } catch (e: any) {
      errorSound();
      buzz('warning');
      toast(e.message ?? 'Payment failed', 'err');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement;
      const typingInSearch = el === searchRef.current;
      if (el && ['INPUT', 'TEXTAREA'].includes(el.tagName) && !typingInSearch) return;
      const now = Date.now();
      const b = scanBuf.current;
      if (now - b.t > 90) b.text = '';
      b.t = now;
      if (e.key === 'Enter') {
        if (b.text.length >= 4) {
          onScan(b.text);
          b.text = '';
          e.preventDefault();
        }
        return;
      }
      if (e.key.length === 1) b.text += e.key;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [products]);

  useHotkeys({
    'mod+enter': (e) => {
      e.preventDefault();
      cart.lines.length && openPay();
    },
    f8: (e) => {
      e.preventDefault();
      setScanOpen(true);
    },
    f9: (e) => {
      e.preventDefault();
      doHold();
    },
    f10: (e) => {
      e.preventDefault();
      setCustOpen(true);
    },
    '/': (e) => {
      if (document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    },
  });

  const CartBody = (
    <div className="flex h-full flex-col bg-surface/90">
      {/* Customer + Channel Bar */}
      <div className="space-y-2 border-b border-line p-3">
        <div className="flex gap-2">
          <button
            onClick={() => { clickSound(); setCustOpen(true); }}
            className={cx(
              'flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition active:scale-95',
              cart.customerId
                ? 'border-brand/60 bg-brand/10 text-brand shadow-sm'
                : 'border-line bg-surface2/60 text-ink2 hover:border-brand/40',
            )}
          >
            <User size={15} />
            <span className="min-w-0 flex-1 truncate">
              {cart.customerName ?? `Walk-in ${terms.customer}`}
            </span>
            {customer && (
              <span className="shrink-0 rounded-md bg-brand/20 px-1.5 py-0.5 text-[10px] font-extrabold text-brand">
                {customer.points} pts
              </span>
            )}
          </button>
          <button
            onClick={() => { clickSound(); setHoldOpen(true); }}
            className="btn-ghost relative px-3 text-xs"
            title="Held Bills (F9)"
          >
            <Pause size={15} />
            {holds.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-extrabold text-black">
                {holds.length}
              </span>
            )}
          </button>
        </div>

        {/* Order Channel Selector */}
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => { clickSound(); cart.setChannel(c.id); }}
                className={cx('chip flex items-center gap-1.5 py-1 text-xs', cart.channel === c.id && 'chip-on')}
              >
                <Icon size={13} />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <SystemFields compact />
        {cart.lines.length === 0 ? (
          <Empty
            title="Cart is empty"
            sub={`Tap any ${terms.product.toLowerCase()} or scan barcode to add to bill.`}
            icon={<ShoppingCart size={28} className="text-ink3" />}
          />
        ) : (
          <div className="space-y-2">
            {cart.lines.map((l) => (
              <div
                key={l.id}
                className="rounded-2xl border border-line bg-surface2/60 p-3 hover:border-brand/40 transition"
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => { clickSound(); setLineEdit(l.id); }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-bold text-ink">{l.name}</p>
                    <p className="text-[11px] text-ink3 font-medium">
                      {money(l.price, s.currency)} × {l.qty} {l.unit || 'pcs'}
                      {l.discount > 0 && (
                        <span className="text-ok font-bold"> · −{money(l.discount, s.currency)}</span>
                      )}
                      {l.price !== l.basePrice && (
                        <span className="text-warn font-bold"> · custom price</span>
                      )}
                    </p>
                    {l.note && <p className="truncate text-[11px] font-semibold text-brand italic">“{l.note}”</p>}
                  </button>

                  <span className="shrink-0 font-mono text-sm font-extrabold text-ink">
                    {money(l.price * l.qty - l.discount, s.currency)}
                  </span>

                  <button
                    onClick={() => {
                      cart.remove(l.id);
                      clickSound();
                      buzz('light');
                    }}
                    className="shrink-0 rounded-lg p-1 text-ink3 hover:text-bad hover:bg-bad/10 transition"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Stepper + Quick Edit */}
                <div className="mt-2.5 flex items-center gap-1.5 border-t border-line/50 pt-2">
                  <button
                    onClick={() => {
                      cart.inc(l.id, -1);
                      clickSound();
                      buzz('light');
                    }}
                    className="grid h-7 w-7 place-items-center rounded-xl border border-line bg-surface text-ink hover:border-brand/50 active:scale-95"
                  >
                    <Minus size={13} />
                  </button>
                  <input
                    value={l.qty}
                    onChange={(e) => cart.setQty(l.id, parseFloat(e.target.value) || 0)}
                    inputMode="decimal"
                    className="h-7 w-14 rounded-xl border border-line bg-surface text-center font-mono text-xs font-bold text-ink outline-none focus:border-brand"
                  />
                  <button
                    onClick={() => {
                      cart.inc(l.id, 1);
                      clickSound();
                      buzz('light');
                    }}
                    className="grid h-7 w-7 place-items-center rounded-xl border border-line bg-surface text-ink hover:border-brand/50 active:scale-95"
                  >
                    <Plus size={13} />
                  </button>

                  <button
                    onClick={() => { clickSound(); setLineEdit(l.id); }}
                    className="ml-auto rounded-lg px-2 py-1 text-[11px] font-extrabold text-brand hover:bg-brand/10 transition"
                  >
                    Edit Line
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary & Checkout Footer */}
      <div className="safe-b border-t border-line bg-surface2/60 p-3 space-y-2.5">
        {/* Quick action chips */}
        <div className="flex flex-wrap gap-1.5">
          <button className="chip" onClick={() => { clickSound(); setDiscOpen(true); }}>
            <Percent size={12} className="mr-1 inline text-brand" />Discount
          </button>
          <button className="chip" onClick={() => { clickSound(); setChargeOpen(true); }}>
            <Plus size={12} className="mr-1 inline text-brand" />Charges
          </button>
          <button className="chip" onClick={() => { clickSound(); setNoteOpen(true); }}>
            <StickyNote size={12} className="mr-1 inline text-brand" />Note
          </button>
          <button className="chip" onClick={doHold}>
            <Pause size={12} className="mr-1 inline text-brand" />Hold
          </button>
          <button
            className="chip text-bad hover:border-bad/50"
            onClick={() => {
              if (!s.confirmClearCart || cart.lines.length === 0 || confirm('Clear the current cart?')) {
                cart.clear();
                clickSound();
                buzz('medium');
                toast('Cart cleared');
              }
            }}
          >
            <Trash2 size={12} className="mr-1 inline" />Clear
          </button>
        </div>

        {/* Calculated Breakdown */}
        <div className="space-y-1 text-xs">
          <Row label="Subtotal" value={money(totals.subTotal, s.currency)} />
          {totals.itemDiscount > 0 && (
            <Row label="Item discount" value={'−' + money(totals.itemDiscount, s.currency)} tone="ok" />
          )}
          {totals.billDiscount > 0 && (
            <Row label="Bill discount" value={'−' + money(totals.billDiscount, s.currency)} tone="ok" />
          )}
          {totals.couponValue > 0 && (
            <Row
              label={cart.coupon ? `Coupon ${cart.coupon.code}` : 'Points redeemed'}
              value={'−' + money(totals.couponValue, s.currency)}
              tone="ok"
            />
          )}
          {totals.serviceCharge > 0 && (
            <Row label="Service charge" value={money(totals.serviceCharge, s.currency)} />
          )}
          {totals.packagingCharge > 0 && (
            <Row label="Packaging" value={money(totals.packagingCharge, s.currency)} />
          )}
          {totals.deliveryCharge > 0 && (
            <Row label="Delivery" value={money(totals.deliveryCharge, s.currency)} />
          )}
          {totals.tip > 0 && <Row label="Tip" value={money(totals.tip, s.currency)} />}
          <Row
            label={`GST (${s.taxInclusive ? 'incl.' : 'extra'})`}
            value={money(totals.gstAmount, s.currency)}
          />
          {!!totals.roundOff && <Row label="Round off" value={money(totals.roundOff, s.currency)} />}
        </div>

        {/* Total & Charge Button */}
        <div className="pt-2 border-t border-line flex items-end justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink3">Total Payable</span>
            <p className="text-[11px] text-ink2">{totals.qty} items</p>
          </div>
          <span className="font-mono text-2xl font-extrabold text-brand drop-shadow-sm">
            {money(totals.total, s.currency)}
          </span>
        </div>

        <button
          disabled={!cart.lines.length}
          onClick={openPay}
          className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 shadow-glow active:scale-[0.98]"
        >
          <span>Pay & Settle</span>
          <span className="font-mono font-extrabold">({money(totals.total, s.currency)})</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex gap-3 h-[calc(100dvh-5rem)]">
      {/* Catalogue column */}
      <div className="min-w-0 flex-1 flex flex-col space-y-2.5">
        {/* Search and control bar */}
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchBar
              ref={searchRef}
              value={q}
              onChange={setQ}
              placeholder={`Search ${terms.products.toLowerCase()}, barcode, SKU, brand, salt… (Press /)`}
            />
          </div>
          <button
            onClick={() => { clickSound(); setScanOpen(true); }}
            className="btn-primary px-3.5"
            title="Camera Barcode Scanner (F8)"
          >
            <ScanLine size={18} />
          </button>
          <button
            onClick={() => { clickSound(); setLayout(layout === 'grid' ? 'list' : 'grid'); }}
            className="btn-ghost px-3"
            title="Toggle View Mode"
          >
            {layout === 'grid' ? <List size={18} /> : <Grid3x3 size={18} />}
          </button>
        </div>

        {/* Categories Bar */}
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
          <button
            onClick={() => { clickSound(); setFavOnly(!favOnly); }}
            className={cx('chip flex items-center gap-1 font-bold', favOnly && 'chip-on')}
          >
            <Star size={12} className={favOnly ? 'fill-brand text-brand' : ''} />
            <span>Favourites</span>
          </button>
          {categories.slice(0, 30).map((c) => (
            <button
              key={c}
              onClick={() => { clickSound(); setCat(c); }}
              className={cx('chip font-bold', cat === c && 'chip-on')}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Product Items Area */}
        <div className="flex-1 min-h-0">
          {catLoading ? (
            <div className="grid h-64 place-items-center text-ink3">Loading catalogue…</div>
          ) : filtered.length === 0 ? (
            <Empty
              title={`No ${terms.products.toLowerCase()} found`}
              sub="Try another search, or import items from Settings → JSON Data."
            />
          ) : (
            <VirtualList
              items={filtered}
              columns={layout === 'list' ? 1 : cols}
              rowHeight={layout === 'list' ? 64 : s.showImages ? 168 : 112}
              gap={10}
              height="100%"
              render={(p: any) =>
                layout === 'list' ? (
                  <ProductRow p={p} onPick={addProduct} />
                ) : (
                  <ProductCard p={p} onPick={addProduct} />
                )
              }
            />
          )}
        </div>
      </div>

      {/* Cart — Desktop Column */}
      <aside className="hidden w-[390px] shrink-0 xl:block">
        <div className="h-full overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {CartBody}
        </div>
      </aside>

      {/* Cart — Mobile Floating Bottom Sheet Bar */}
      <button
        onClick={() => { clickSound(); buzz('light'); setCartOpen(true); }}
        className="no-print safe-b fixed inset-x-3 bottom-[64px] z-30 flex items-center justify-between rounded-2xl bg-brand px-4 py-3 text-black shadow-glow-lg active:scale-98 xl:hidden"
      >
        <span className="flex items-center gap-2 text-sm font-extrabold">
          <ShoppingCart size={18} />
          <span>{totals.qty} item{totals.qty === 1 ? '' : 's'} in cart</span>
        </span>
        <span className="font-mono text-base font-extrabold">
          {money(totals.total, s.currency)}
        </span>
      </button>

      {/* Cart — Mobile Full Drawer */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-[70] xl:hidden"
          onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="absolute inset-x-0 bottom-0 top-12 animate-slideup overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-surface2/80">
              <h3 className="text-sm font-extrabold text-ink flex items-center gap-2">
                <ShoppingCart size={16} className="text-brand" /> Current {terms.sale}
              </h3>
              <button
                onClick={() => setCartOpen(false)}
                className="rounded-xl p-1.5 text-ink3 hover:bg-surface hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <div className="h-[calc(100%-49px)]">{CartBody}</div>
          </div>
        </div>
      )}

      {/* All POS Modals */}
      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        total={totals.total}
        hasCustomer={!!cart.customerId}
        onConfirm={pay}
      />
      <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />
      <CustomerPicker open={custOpen} onClose={() => setCustOpen(false)} />
      <Scanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={onScan} />
      <LineEditor lineId={lineEdit} onClose={() => setLineEdit(null)} kitchenNote={modules.kitchenNote} />
      <DiscountModal
        open={discOpen}
        onClose={() => setDiscOpen(false)}
        coupons={coupons}
        subtotal={totals.subTotal}
        customer={customer}
      />
      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Bill Note / Instructions"
        footer={
          <button className="btn-primary w-full" onClick={() => setNoteOpen(false)}>
            Save Note
          </button>
        }
      >
        <Textarea
          value={cart.note}
          onChange={(e) => cart.setNote(e.target.value)}
          placeholder="Delivery address, customer instructions, reference order number…"
          autoFocus
        />
      </Modal>

      <Modal
        open={chargeOpen}
        onClose={() => setChargeOpen(false)}
        title="Extra Charges & Tips"
        footer={
          <button className="btn-primary w-full" onClick={() => setChargeOpen(false)}>
            Apply Charges
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Service charge %">
            <Input
              inputMode="decimal"
              value={cart.serviceChargePct || ''}
              onChange={(e) => cart.setCharges({ serviceChargePct: +e.target.value || 0 })}
              placeholder={String(s.serviceChargePct)}
            />
          </Field>
          <Field label="Packaging charge">
            <Input
              inputMode="decimal"
              value={cart.packagingCharge || ''}
              onChange={(e) => cart.setCharges({ packagingCharge: +e.target.value || 0 })}
              placeholder={String(s.packagingCharge)}
            />
          </Field>
          <Field label="Delivery charge">
            <Input
              inputMode="decimal"
              value={cart.deliveryCharge || ''}
              onChange={(e) => cart.setCharges({ deliveryCharge: +e.target.value || 0 })}
              placeholder={String(s.deliveryCharge)}
            />
          </Field>
          <Field label="Tip">
            <Input
              inputMode="decimal"
              value={cart.tip || ''}
              onChange={(e) => cart.setCharges({ tip: +e.target.value || 0 })}
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[5, 10].map((p) => (
            <button key={p} className="chip" onClick={() => cart.setCharges({ serviceChargePct: p })}>
              {p}% service
            </button>
          ))}
          {[10, 20, 50, 100].map((p) => (
            <button key={p} className="chip" onClick={() => cart.setCharges({ tip: p })}>
              Tip {money(p, s.currency)}
            </button>
          ))}
          <button
            className="chip border-bad/40 text-bad"
            onClick={() =>
              cart.setCharges({ serviceChargePct: 0, deliveryCharge: 0, packagingCharge: 0, tip: 0 })
            }
          >
            Clear charges
          </button>
        </div>
      </Modal>

      <Modal open={holdOpen} onClose={() => setHoldOpen(false)} title={`Held Bills (${holds.length})`}>
        {holds.length === 0 ? (
          <Empty title="Nothing on hold" sub="Press F9 or tap Hold to park the active cart." />
        ) : (
          <div className="space-y-2">
            {holds.map((h: any) => (
              <div key={h.id} className="flex items-center gap-2 rounded-2xl border border-line p-3 bg-surface2/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{h.label}</p>
                  <p className="text-[11px] text-ink3 font-mono">
                    {h.lines.length} items · {new Date(h.ts).toLocaleTimeString('en-IN')}
                  </p>
                </div>
                <button
                  className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
                  onClick={async () => {
                    cart.load(h.lines, h.customerId, h.label);
                    await db.holds.delete(h.id);
                    setHoldOpen(false);
                    successSound();
                    toast('Bill recalled to terminal');
                  }}
                >
                  <Play size={13} /> Recall
                </button>
                <button
                  className="btn-ghost px-2 py-1.5"
                  onClick={async () => {
                    await db.holds.delete(h.id);
                    clickSound();
                    toast('Held bill deleted');
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-ink3 font-medium">{label}</span>
      <span className={cx('font-mono font-bold', tone === 'ok' ? 'text-ok' : 'text-ink2')}>{value}</span>
    </div>
  );
}

function LineEditor({
  lineId,
  onClose,
  kitchenNote,
}: {
  lineId: string | null;
  onClose: () => void;
  kitchenNote: boolean;
}) {
  const cart = useCart();
  const s = useSettings();
  const line = cart.lines.find((l) => l.id === lineId);
  if (!line) return null;

  return (
    <Modal
      open={!!lineId}
      onClose={onClose}
      title={`Edit ${line.name}`}
      footer={
        <div className="flex gap-2">
          <button
            className="btn-danger flex-1"
            onClick={() => {
              cart.remove(line.id);
              onClose();
            }}
          >
            Remove Item
          </button>
          <button className="btn-primary flex-1" onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity">
          <Input
            inputMode="decimal"
            value={line.qty}
            onChange={(e) => cart.setQty(line.id, parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label="Unit Price">
          <Input
            inputMode="decimal"
            value={line.price}
            onChange={(e) => cart.setPrice(line.id, parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label="Line Discount (₹)">
          <Input
            inputMode="decimal"
            value={line.discount || ''}
            onChange={(e) => cart.setLineDiscount(line.id, parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label="Discount %">
          <Input
            inputMode="decimal"
            placeholder="0"
            onChange={(e) =>
              cart.setLineDiscount(
                line.id,
                +((line.price * line.qty * (parseFloat(e.target.value) || 0)) / 100).toFixed(2),
              )
            }
          />
        </Field>
      </div>

      {kitchenNote && (
        <Field label="Kitchen / Cooking Note" className="mt-3">
          <Input
            value={line.note ?? ''}
            onChange={(e) => cart.setLineNote(line.id, e.target.value)}
            placeholder="Less spicy, no onion, extra cheese…"
          />
        </Field>
      )}

      <div className="mt-4 rounded-2xl border border-brand/30 bg-brand/10 p-3 text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink3">Line Total</p>
        <p className="font-mono text-2xl font-extrabold text-brand">
          {money(line.price * line.qty - (line.discount || 0), s.currency)}
        </p>
      </div>
    </Modal>
  );
}

function DiscountModal({ open, onClose, coupons, subtotal, customer }: any) {
  const cart = useCart();
  const s = useSettings();
  const [code, setCode] = useState('');
  const maxPoints = customer ? Math.min(customer.points, Math.floor(subtotal / s.pointValue)) : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Discounts & Special Offers"
      footer={
        <button className="btn-primary w-full" onClick={onClose}>
          Apply
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bill Discount">
          <Input
            inputMode="decimal"
            value={cart.billDiscount || ''}
            onChange={(e) => cart.setBillDiscount(parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label="Discount Type">
          <Select
            value={cart.billDiscountType}
            onChange={(e) => cart.setBillDiscount(cart.billDiscount, e.target.value as any)}
          >
            <option value="flat">Flat ₹</option>
            <option value="percent">Percent %</option>
          </Select>
        </Field>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[5, 10, 15, 20, 25, 50].map((p) => (
          <button key={p} className="chip" onClick={() => cart.setBillDiscount(p, 'percent')}>
            {p}% off
          </button>
        ))}
      </div>

      <p className="label mt-4">Promo Coupon</p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
        />
        <button
          className="btn-soft"
          onClick={() => {
            const c = coupons.find((x: any) => x.code === code.trim() && x.active);
            if (!c) return toast('Invalid coupon code', 'err');
            if (subtotal < c.minBill) return toast(`Minimum bill ${money(c.minBill, s.currency)}`, 'err');
            cart.setCoupon(c);
            toast(`Coupon ${c.code} applied 🎉`);
          }}
        >
          Apply
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {coupons
          .filter((c: any) => c.active)
          .map((c: any) => (
            <button
              key={c.id}
              className={cx('chip', cart.coupon?.id === c.id && 'chip-on')}
              onClick={() => {
                if (subtotal < c.minBill)
                  return toast(`Min bill ${money(c.minBill, s.currency)}`, 'err');
                cart.setCoupon(c);
              }}
            >
              {c.code} · {c.type === 'flat' ? money(c.value, s.currency) : c.value + '%'}
            </button>
          ))}
        {cart.coupon && (
          <button className="chip border-bad/50 text-bad" onClick={() => cart.setCoupon(null)}>
            Remove coupon
          </button>
        )}
      </div>

      {s.loyaltyEnabled && customer && (
        <div className="mt-4 pt-3 border-t border-line">
          <p className="label">Loyalty Points ({customer.points} available)</p>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              value={cart.pointsRedeemed || ''}
              onChange={(e) => cart.setPoints(Math.min(maxPoints, parseInt(e.target.value) || 0))}
              placeholder="0"
            />
            <button className="btn-soft" onClick={() => cart.setPoints(maxPoints)}>
              Max ({maxPoints})
            </button>
          </div>
          <p className="mt-1 text-[11px] text-ink3">
            1 point = {money(s.pointValue, s.currency)} · Min redemption {s.minRedeem} pts
          </p>
        </div>
      )}
    </Modal>
  );
}
