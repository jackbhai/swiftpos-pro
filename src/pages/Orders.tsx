import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChefHat, Bike, Clock, CheckCircle2, XCircle, Plus, Phone, MapPin, Printer, ShoppingCart, Timer,
} from 'lucide-react';
import { useOrders, useCustomers } from '@/hooks/useData';
import { db, uid, logActivity } from '@/db/db';
import { money, num, tOnly, cx } from '@/lib/format';
import { Card, Stat, Modal, Field, Input, Select, Textarea, Empty, Badge, Tabs, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { useCart } from '@/store/cart';
import { toast, toastUndo } from '@/store/ui';
import { printHTML } from '@/lib/receipt';
import type { Order } from '@/db/types';

const FLOW: Order['status'][] = ['new', 'preparing', 'ready', 'dispatched', 'delivered'];
const TONE: Record<Order['status'], any> = { new: 'warn', preparing: 'brand', ready: 'ok', dispatched: 'brand', delivered: 'muted', cancelled: 'bad' };

/** Orders & kitchen display — live board for delivery, takeaway and online orders. */
export default function Orders() {
  const orders = useOrders() || [];
  const customers = useCustomers() || [];
  const s = useSettings();
  const nav = useNavigate();
  const [tab, setTab] = useState<'board' | 'kds' | 'done'>('board');
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setTick((v) => v + 1), 15000); return () => clearInterval(t); }, []);

  const live = orders.filter((o: Order) => !['delivered', 'cancelled'].includes(o.status));
  const done = orders.filter((o: Order) => ['delivered', 'cancelled'].includes(o.status));
  const late = live.filter((o: Order) => o.promisedAt && Date.now() > o.promisedAt);
  const avgPrep = (() => {
    const arr = orders.filter((o: Order) => o.readyAt).map((o: Order) => (o.readyAt! - o.ts) / 60000);
    return arr.length ? arr.reduce((t, v) => t + v, 0) / arr.length : 0;
  })();

  const advance = async (o: Order) => {
    const i = FLOW.indexOf(o.status);
    const next = FLOW[Math.min(i + 1, FLOW.length - 1)];
    const patch: Partial<Order> = { status: next };
    if (next === 'ready') patch.readyAt = Date.now();
    if (next === 'delivered') patch.deliveredAt = Date.now();
    await db.orders.update(o.id, patch);
    toast(`${o.orderNo} → ${next}`);
  };

  const billIt = (o: Order) => {
    useCart.getState().load(o.lines, o.customerId, o.customerName);
    useCart.getState().setChannel(o.channel === 'dine-in' ? 'counter' : (o.channel === 'online' ? 'online' : o.channel) as any);
    db.orders.update(o.id, { status: 'delivered', deliveredAt: Date.now() });
    nav('/pos');
  };

  const kot = (o: Order) => printHTML(`<html><head><meta charset="utf-8"><style>
    body{font-family:monospace;width:76mm;padding:6px}h2{margin:2px 0;font-size:16px}
    .row{display:flex;justify-content:space-between;font-size:14px;padding:2px 0;border-bottom:1px dashed #999}
    </style></head><body>
    <h2>KOT · ${o.orderNo}</h2>
    <div>${o.channel.toUpperCase()} · ${tOnly(o.ts)}</div>
    <div>${o.customerName || ''} ${o.phone || ''}</div><hr/>
    ${o.lines.map((l) => `<div class=row><span>${l.name}${l.note ? ' (' + l.note + ')' : ''}</span><b>x${l.qty}</b></div>`).join('')}
    ${o.note ? `<p>Note: ${o.note}</p>` : ''}
    </body></html>`);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Live orders" value={num(live.length)} tone="brand" icon={<ChefHat size={16} />} />
        <Stat label="Running late" value={num(late.length)} tone={late.length ? 'bad' : 'ok'} icon={<Timer size={16} />} />
        <Stat label="Avg prep time" value={avgPrep.toFixed(0) + ' min'} tone="warn" icon={<Clock size={16} />} />
        <Stat label="Completed" value={num(done.filter((o: Order) => o.status === 'delivered').length)} tone="ok" icon={<CheckCircle2 size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Orders & kitchen display" sub="Delivery, takeaway aur online orders ka live board"
          right={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> New order</button>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'board', label: 'Order board', count: live.length },
          { id: 'kds', label: 'Kitchen display', count: live.filter((o: Order) => o.status !== 'dispatched').length },
          { id: 'done', label: 'History', count: done.length },
        ]} />
      </Card>

      {tab === 'board' && (live.length === 0 ? <Empty title="No live orders" sub="New order banaiye ya POS se delivery bill kijiye." icon={<Bike size={22} />} /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {live.map((o: Order) => {
            const mins = Math.floor((Date.now() - o.ts) / 60000);
            const isLate = o.promisedAt && Date.now() > o.promisedAt;
            return (
              <Card key={o.id} className={cx(isLate && 'ring-1 ring-bad/50')}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{o.orderNo} · <span className="capitalize text-ink3">{o.channel}</span></p>
                    <p className="truncate text-[11px] text-ink3">{o.customerName || 'Walk-in'} {o.phone ? '· ' + o.phone : ''}</p>
                  </div>
                  <Badge tone={TONE[o.status]}>{o.status}</Badge>
                </div>
                {o.address && <p className="mt-1 flex gap-1 text-[11px] text-ink3"><MapPin size={12} className="mt-0.5 shrink-0" />{o.address}</p>}
                <div className="mt-2 space-y-1 rounded-xl border border-line p-2">
                  {o.lines.slice(0, 6).map((l) => (
                    <div key={l.id} className="flex justify-between text-[11px]"><span className="truncate text-ink2">{l.name}</span><span className="font-mono text-ink3">x{l.qty}</span></div>
                  ))}
                  {o.lines.length > 6 && <p className="text-[10px] text-ink3">+{o.lines.length - 6} more</p>}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className={cx(isLate ? 'font-bold text-bad' : 'text-ink3')}><Clock size={11} className="mr-1 inline" />{mins} min ago</span>
                  <span className="font-mono font-bold text-brand">{money(o.total, s.currency)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {o.status !== 'delivered' && <button className="btn-primary flex-1 px-2 py-1.5 text-xs" onClick={() => advance(o)}>→ {FLOW[Math.min(FLOW.indexOf(o.status) + 1, 4)]}</button>}
                  <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => kot(o)}><Printer size={13} /></button>
                  {o.phone && <a className="btn-soft px-2 py-1.5 text-xs" href={`tel:${o.phone}`}><Phone size={13} /></a>}
                  <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => billIt(o)}><ShoppingCart size={13} /> Bill</button>
                  <button className="btn-ghost px-2 py-1.5 text-xs" onClick={async () => { const prev = o.status; await db.orders.update(o.id, { status: 'cancelled' }); toastUndo(`${o.orderNo} cancelled`, async () => { await db.orders.update(o.id, { status: prev }); toast('Restored'); }); }}><XCircle size={13} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      ))}

      {tab === 'kds' && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {live.filter((o: Order) => o.status !== 'dispatched').map((o: Order) => {
            const mins = Math.floor((Date.now() - o.ts) / 60000);
            return (
              <button key={o.id} onClick={() => advance(o)}
                className={cx('rounded-2xl border p-3 text-left transition',
                  mins > 20 ? 'border-bad bg-bad/10' : mins > 10 ? 'border-warn bg-warn/10' : 'border-line bg-surface')}>
                <div className="flex items-center justify-between">
                  <p className="text-base font-extrabold text-ink">{o.orderNo}</p>
                  <span className={cx('font-mono text-sm font-bold', mins > 20 ? 'text-bad' : mins > 10 ? 'text-warn' : 'text-ink3')}>{mins}m</span>
                </div>
                <p className="mb-2 text-[11px] uppercase tracking-wide text-ink3">{o.channel} · {o.status}</p>
                {o.lines.map((l) => (
                  <p key={l.id} className="text-sm text-ink"><b className="font-mono text-brand">{l.qty}×</b> {l.name}{l.note ? <span className="text-[11px] text-warn"> ({l.note})</span> : null}</p>
                ))}
                {o.note && <p className="mt-1 rounded-lg bg-warn/10 p-1.5 text-[11px] text-warn">{o.note}</p>}
                <p className="mt-2 text-center text-[11px] font-semibold text-brand">tap to bump →</p>
              </button>
            );
          })}
          {live.length === 0 && <Empty title="Kitchen is clear 🎉" sub="Koi pending order nahi hai." />}
        </div>
      )}

      {tab === 'done' && (done.length === 0 ? <Empty title="No completed orders yet" /> : (
        <Card pad={false}>
          {done.slice(0, 100).map((o: Order) => (
            <div key={o.id} className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
              <span className="w-24 shrink-0 font-semibold text-ink">{o.orderNo}</span>
              <span className="min-w-0 flex-1 truncate text-ink3">{o.customerName || 'Walk-in'} · {o.channel} · {tOnly(o.ts)}</span>
              <Badge tone={TONE[o.status]}>{o.status}</Badge>
              <span className="font-mono text-ink">{money(o.total, s.currency)}</span>
            </div>
          ))}
        </Card>
      ))}

      {open && <NewOrder customers={customers} onClose={() => setOpen(false)} />}
    </div>
  );
}

function NewOrder({ customers, onClose }: { customers: any[]; onClose: () => void }) {
  const s = useSettings();
  const cart = useCart();
  const [f, setF] = useState({
    channel: 'delivery' as Order['channel'], customerId: '', name: '', phone: '', address: '',
    note: '', prep: '20', rider: '',
  });

  const lines = cart.lines;
  const total = useMemo(() => lines.reduce((t, l) => t + l.price * l.qty - l.discount, 0), [lines]);

  const save = async () => {
    if (!lines.length) return toast('Pehle POS cart me items add kijiye', 'err');
    const rec: Order = {
      id: uid('o_'), orderNo: 'ORD-' + Date.now().toString().slice(-6), ts: Date.now(),
      channel: f.channel, status: 'new', lines, total: +total.toFixed(2),
      customerId: f.customerId || undefined, customerName: f.name || undefined, phone: f.phone || undefined,
      address: f.address || undefined, note: f.note || undefined, rider: f.rider || undefined,
      prepMinutes: +f.prep || 20, promisedAt: Date.now() + (+f.prep || 20) * 60000,
    };
    await db.orders.add(rec);
    await logActivity('order', `Order ${rec.orderNo} (${rec.channel}) ${money(rec.total, s.currency)}`);
    cart.clear();
    toast(`Order ${rec.orderNo} created`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} wide title="New order"
      footer={<button className="btn-primary w-full" onClick={save}>Create order · {money(total, s.currency)}</button>}>
      <p className="mb-3 rounded-xl border border-line bg-surface2/40 p-3 text-[11px] text-ink2">
        Order items aapke POS cart se aate hain ({lines.length} items · {money(total, s.currency)}). Cart khali ho to pehle POS me items add kijiye.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Channel">
          <Select value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value as any })}>
            <option value="delivery">Delivery</option><option value="takeaway">Takeaway</option>
            <option value="dine-in">Dine-in</option><option value="online">Online / aggregator</option><option value="pickup">Pickup</option>
          </Select>
        </Field>
        <Field label="Customer">
          <Select value={f.customerId} onChange={(e) => {
            const c = customers.find((x: any) => x.id === e.target.value);
            setF({ ...f, customerId: e.target.value, name: c?.name || '', phone: c?.phone || '', address: c?.address || '' });
          }}>
            <option value="">Walk-in / new</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
          </Select>
        </Field>
        <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" /></Field>
        <Field label="Prep / promise (minutes)"><Input inputMode="numeric" value={f.prep} onChange={(e) => setF({ ...f, prep: e.target.value })} /></Field>
        <Field label="Rider / staff"><Input value={f.rider} onChange={(e) => setF({ ...f, rider: e.target.value })} placeholder="Optional" /></Field>
      </div>
      <Field label="Address" className="mt-3"><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      <Field label="Kitchen note" className="mt-3"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Less spicy, no onion…" /></Field>
    </Modal>
  );
}
