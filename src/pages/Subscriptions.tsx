import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Repeat, Plus, Trash2, ShoppingCart, MessageCircle, CalendarClock, Pause, Play } from 'lucide-react';
import { useSubscriptions, useCustomers } from '@/hooks/useData';
import { useCatalog, useDebounced, searchProducts } from '@/hooks/useCatalog';
import { db, uid, logActivity } from '@/db/db';
import { money, num, dOnly, cx } from '@/lib/format';
import { Card, Stat, Modal, Field, Input, Select, Textarea, Empty, Badge, Tabs, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { useCart } from '@/store/cart';
import { toast, toastUndo } from '@/store/ui';
import { waLink } from '@/lib/receipt';
import type { Subscription, CartLine } from '@/db/types';

const addPeriod = (iso: string, every: Subscription['every']) => {
  const d = new Date(iso);
  if (every === 'day') d.setDate(d.getDate() + 1);
  if (every === 'week') d.setDate(d.getDate() + 7);
  if (every === 'month') d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

/** Subscriptions / repeat orders — milk, tiffin, monthly kirana, AMC, refills. */
export default function Subscriptions() {
  const subs = useSubscriptions() || [];
  const customers = useCustomers() || [];
  const s = useSettings();
  const nav = useNavigate();
  const [tab, setTab] = useState<'due' | 'active' | 'paused'>('due');
  const [editor, setEditor] = useState<Subscription | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const due = subs.filter((x: Subscription) => x.active && x.nextDue <= today);
  const active = subs.filter((x: Subscription) => x.active);
  const paused = subs.filter((x: Subscription) => !x.active);

  const mrr = active.reduce((t: number, x: Subscription) =>
    t + x.amount * (x.every === 'day' ? 30 : x.every === 'week' ? 4.33 : 1), 0);

  const list = tab === 'due' ? due : tab === 'active' ? active : paused;

  const billNow = (x: Subscription) => {
    useCart.getState().load(x.lines, x.customerId, x.customerName);
    db.subscriptions.update(x.id, { lastBilled: Date.now(), nextDue: addPeriod(x.nextDue, x.every) });
    toast('Loaded into billing cart');
    nav('/pos');
  };

  const remind = (x: Subscription) => {
    const text = `Namaste ${x.customerName}, aapka ${x.title} (${money(x.amount, s.currency)}) ${x.nextDue} ko due hai — ${s.shopName}. Confirm kijiye to hum ready rakhein.`;
    window.open(waLink(x.phone || '', text), '_blank');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Due today" value={num(due.length)} tone={due.length ? 'warn' : 'ok'} icon={<CalendarClock size={16} />} />
        <Stat label="Active plans" value={num(active.length)} tone="brand" icon={<Repeat size={16} />} />
        <Stat label="Monthly recurring" value={money(mrr, s.currency)} tone="ok" />
        <Stat label="Paused" value={num(paused.length)} tone="bad" />
      </div>

      <Card>
        <SectionTitle title="Subscriptions & repeat orders" sub="Doodh, tiffin, monthly kirana, AMC, refill — sab auto-remind"
          right={<button className="btn-primary" onClick={() => setEditor(blank())}><Plus size={15} /> New plan</button>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'due', label: 'Due now', count: due.length },
          { id: 'active', label: 'Active', count: active.length },
          { id: 'paused', label: 'Paused', count: paused.length },
        ]} />
      </Card>

      {list.length === 0 ? <Empty title={tab === 'due' ? 'Nothing due today 🎉' : 'No plans here'} icon={<Repeat size={22} />}
        action={<button className="btn-primary mt-2" onClick={() => setEditor(blank())}><Plus size={15} /> New plan</button>} /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((x: Subscription) => {
            const overdue = x.active && x.nextDue < today;
            return (
              <Card key={x.id} className={cx(overdue && 'ring-1 ring-warn/50')}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{x.title}</p>
                    <p className="truncate text-[11px] text-ink3">{x.customerName}{x.phone ? ' · ' + x.phone : ''}</p>
                  </div>
                  <Badge tone={!x.active ? 'muted' : overdue ? 'bad' : 'ok'}>{!x.active ? 'paused' : overdue ? 'overdue' : 'active'}</Badge>
                </div>
                <div className="mt-2 space-y-0.5 rounded-xl border border-line p-2">
                  {x.lines.slice(0, 4).map((l) => (
                    <div key={l.id} className="flex justify-between text-[11px]"><span className="truncate text-ink2">{l.name}</span><span className="font-mono text-ink3">x{l.qty}</span></div>
                  ))}
                  {x.lines.length > 4 && <p className="text-[10px] text-ink3">+{x.lines.length - 4} more</p>}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-ink3">every {x.every} · next {dOnly(new Date(x.nextDue).getTime())}</span>
                  <span className="font-mono font-bold text-brand">{money(x.amount, s.currency)}</span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button className="btn-primary flex-1 px-2 py-1.5 text-xs" onClick={() => billNow(x)}><ShoppingCart size={13} /> Bill now</button>
                  <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => remind(x)}><MessageCircle size={13} /></button>
                  <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => db.subscriptions.update(x.id, { active: !x.active })}>
                    {x.active ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => setEditor(x)}>Edit</button>
                  <button className="btn-ghost px-2 py-1.5 text-xs" onClick={async () => { await db.subscriptions.delete(x.id); toastUndo(`${x.title} deleted`, async () => { await db.subscriptions.put(x); toast('Restored'); }); }}><Trash2 size={13} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editor && <PlanEditor plan={editor} customers={customers} onClose={() => setEditor(null)} />}
    </div>
  );
}

const blank = (): Subscription => ({
  id: '', customerId: '', customerName: '', title: 'Monthly order', lines: [], amount: 0,
  every: 'month', nextDue: new Date().toISOString().slice(0, 10), active: true, createdAt: Date.now(),
});

function PlanEditor({ plan, customers, onClose }: { plan: Subscription; customers: any[]; onClose: () => void }) {
  const s = useSettings();
  const { products } = useCatalog();
  const [f, setF] = useState<Subscription>(plan);
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 150);
  const hits = useMemo(() => (dq.trim() ? searchProducts(products as any, dq, 6) : []), [products, dq]);

  const setLines = (lines: CartLine[]) =>
    setF({ ...f, lines, amount: +lines.reduce((t, l) => t + l.price * l.qty - l.discount, 0).toFixed(2) });

  const save = async () => {
    if (!f.customerId) return toast('Select a customer', 'err');
    if (!f.lines.length) return toast('Add items', 'err');
    const rec = { ...f, id: f.id || uid('sb_') };
    await db.subscriptions.put(rec);
    await logActivity('subscription', `Plan ${rec.title} for ${rec.customerName}`);
    toast('Plan saved'); onClose();
  };

  return (
    <Modal open onClose={onClose} wide title={f.id ? 'Edit plan' : 'New subscription'}
      footer={<div className="flex items-center gap-2">
        <div className="flex-1"><p className="text-[10px] uppercase text-ink3">Per cycle</p><p className="font-mono text-lg font-bold text-brand">{money(f.amount, s.currency)}</p></div>
        <button className="btn-primary" onClick={save}>Save plan</button>
      </div>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Plan name"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Daily milk / Monthly tiffin" /></Field>
        <Field label="Customer">
          <Select value={f.customerId} onChange={(e) => {
            const c = customers.find((x: any) => x.id === e.target.value);
            setF({ ...f, customerId: e.target.value, customerName: c?.name || '', phone: c?.phone });
          }}>
            <option value="">Select…</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
          </Select>
        </Field>
        <Field label="Repeats">
          <Select value={f.every} onChange={(e) => setF({ ...f, every: e.target.value as any })}>
            <option value="day">Every day</option><option value="week">Every week</option><option value="month">Every month</option>
          </Select>
        </Field>
        <Field label="Next due date"><Input type="date" value={f.nextDue} onChange={(e) => setF({ ...f, nextDue: e.target.value })} /></Field>
      </div>

      <Field label="Add item" className="mt-3"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product…" /></Field>
      {hits.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-xl border border-line">
          {hits.map((p: any) => (
            <button key={p.id} className="flex w-full justify-between border-b border-line px-3 py-2 text-left text-xs last:border-0 hover:bg-surface2"
              onClick={() => { setLines([...f.lines, { id: uid('l_'), productId: p.id, name: p.name, qty: 1, price: p.price, basePrice: p.price, cost: p.cost, gst: p.gst, unit: p.unit, discount: 0 }]); setQ(''); }}>
              <span className="truncate text-ink">{p.name}</span><span className="font-mono text-brand">{money(p.price, s.currency)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        {f.lines.map((l) => (
          <div key={l.id} className="flex items-center gap-2 rounded-xl border border-line p-2">
            <span className="min-w-0 flex-1 truncate text-xs text-ink">{l.name}</span>
            <input className="input h-7 w-16 text-center font-mono text-xs" value={l.qty}
              onChange={(e) => setLines(f.lines.map((x) => (x.id === l.id ? { ...x, qty: +e.target.value || 0 } : x)))} />
            <span className="w-20 text-right font-mono text-xs text-ink2">{money(l.price * l.qty, s.currency)}</span>
            <button className="rounded-lg p-1 text-ink3 hover:text-bad" onClick={() => setLines(f.lines.filter((x) => x.id !== l.id))}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <Field label="Note" className="mt-3"><Textarea rows={2} value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Delivery time, instructions…" /></Field>
    </Modal>
  );
}
