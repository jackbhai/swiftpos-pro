import { useMemo, useState } from 'react';
import { UserPlus, Download, MessageCircle, Pencil, Trash2, Crown, Gift, Wallet } from 'lucide-react';
import { useCustomers, useSales } from '@/hooks/useData';
import { db, uid } from '@/db/db';
import { money, moneyShort, num, initials, ago, cx, dt } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Field, Input, Empty, SearchBar, Badge, Tabs, Textarea } from '@/components/ui';
import { useSettings, useShop } from '@/store/settings';
import { useCart } from '@/store/cart';
import { toast } from '@/store/ui';
import { waLink } from '@/lib/receipt';
import { useNavigate } from 'react-router-dom';
import type { Customer } from '@/db/types';

const tier = (spend: number) => spend >= 25000 ? { label: 'Platinum', tone: 'brand' as const }
  : spend >= 10000 ? { label: 'Gold', tone: 'warn' as const }
  : spend >= 3000 ? { label: 'Silver', tone: 'ok' as const } : { label: 'New', tone: 'muted' as const };

export default function Customers() {
  const customers = useCustomers() || [];
  const sales = useSales() || [];
  const s = useSettings();
  const { terms } = useShop();
  const cart = useCart();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [seg, setSeg] = useState('all');
  const [edit, setEdit] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [limit, setLimit] = useState(30);

  const list = useMemo(() => {
    let l = [...customers] as Customer[];
    if (seg === 'due') l = l.filter((c) => c.credit > 0);
    if (seg === 'vip') l = l.filter((c) => c.totalSpend >= 10000);
    if (seg === 'lapsed') l = l.filter((c) => c.lastVisit && Date.now() - c.lastVisit > 30 * 864e5);
    if (seg === 'points') l = l.filter((c) => c.points > 0);
    if (q.trim()) { const t = q.toLowerCase(); l = l.filter((c) => c.name.toLowerCase().includes(t) || c.phone.includes(t)); }
    return l.sort((a, b) => b.totalSpend - a.totalSpend);
  }, [customers, q, seg]);

  const totalDue = customers.reduce((t: number, c: Customer) => t + c.credit, 0);
  const totalPoints = customers.reduce((t: number, c: Customer) => t + c.points, 0);

  const save = async (c: Customer) => {
    if (!c.name.trim()) return toast('Name required', 'err');
    if (c.id) await db.customers.put(c); else await db.customers.add({ ...c, id: uid('c_'), createdAt: Date.now() });
    toast(`${terms.customer} saved`); setEdit(null);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={terms.customers} value={num(customers.length)} icon={<UserPlus size={16} />} />
        <Stat label="Credit due" value={moneyShort(totalDue, s.currency)} tone="bad" icon={<Wallet size={16} />} />
        <Stat label="Loyalty points" value={num(totalPoints)} tone="warn" icon={<Gift size={16} />} />
        <Stat label="VIP members" value={num(customers.filter((c: Customer) => c.totalSpend >= 10000).length)} icon={<Crown size={16} />} />
      </div>

      <Card className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <SearchBar value={q} onChange={setQ} placeholder="Name or phone…" />
          <button className="btn-primary" onClick={() => setEdit({ id: '', name: '', phone: '', points: 0, credit: 0, totalSpend: 0, visits: 0, createdAt: Date.now() } as Customer)}><UserPlus size={16} /> Add</button>
          <button className="btn-ghost" onClick={() => downloadCSV('customers.csv', list.map((c) => ({ name: c.name, phone: c.phone, email: c.email ?? '', points: c.points, credit: c.credit, total_spend: c.totalSpend, visits: c.visits, last_visit: c.lastVisit ? dt(c.lastVisit) : '' })))}><Download size={15} /> CSV</button>
        </div>
        <Tabs active={seg} onChange={setSeg} tabs={[
          { id: 'all', label: 'All', count: customers.length }, { id: 'vip', label: 'VIP' },
          { id: 'due', label: 'Credit due' }, { id: 'points', label: 'Has points' }, { id: 'lapsed', label: 'Lapsed 30d+' },
        ]} />
      </Card>

      {list.length === 0 ? <Empty title={`No ${terms.customers.toLowerCase()} yet`} /> : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {list.slice(0, limit).map((c) => {
            const t = tier(c.totalSpend);
            return (
              <Card key={c.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-bold text-brand">{initials(c.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{c.name}</p>
                    <p className="text-[11px] text-ink3">{c.phone}{c.lastVisit ? ' · ' + ago(c.lastVisit) : ''}</p>
                  </div>
                  <Badge tone={t.tone}>{t.label}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <Mini label="Spend" value={moneyShort(c.totalSpend, s.currency)} />
                  <Mini label="Visits" value={String(c.visits)} />
                  <Mini label="Points" value={String(c.points)} />
                </div>
                {c.credit > 0 && <div className="rounded-lg border border-bad/40 bg-bad/10 px-2 py-1 text-center text-[11px] font-bold text-bad">Outstanding {money(c.credit, s.currency)}</div>}
                <div className="flex flex-wrap gap-1.5">
                  <button className="chip" onClick={() => { cart.setCustomer(c.id, c.name); toast('Attached to bill'); nav('/pos'); }}>Bill</button>
                  <button className="chip" onClick={() => setDetail(c)}>History</button>
                  <button className="chip" onClick={() => window.open(waLink(c.phone, `Hi ${c.name}, thanks for shopping with ${s.shopName}! You have ${c.points} loyalty points.`), '_blank')}><MessageCircle size={11} className="mr-1 inline" />WA</button>
                  <button className="chip" onClick={() => setEdit(c)}><Pencil size={11} /></button>
                  <button className="chip border-bad/40 text-bad" onClick={async () => { await db.customers.delete(c.id); toast('Deleted'); }}><Trash2 size={11} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {list.length > limit && <button className="btn-ghost w-full" onClick={() => setLimit((l) => l + 60)}>Load more</button>}

      <CustomerEditor customer={edit} onClose={() => setEdit(null)} onSave={save} />
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name} wide>
        {detail && (() => {
          const hist = sales.filter((x: any) => x.customerId === detail.id);
          return (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Mini label="Lifetime" value={money(detail.totalSpend, s.currency)} />
                <Mini label="Orders" value={String(hist.length)} />
                <Mini label="Avg" value={money(hist.length ? detail.totalSpend / hist.length : 0, s.currency)} />
                <Mini label="Points" value={String(detail.points)} />
              </div>
              <div className="flex gap-2">
                <button className="btn-soft flex-1" onClick={async () => { await db.customers.update(detail.id, { points: detail.points + 50 }); toast('+50 points'); }}>+50 pts</button>
                <button className="btn-soft flex-1" onClick={async () => { await db.customers.update(detail.id, { credit: 0 }); toast('Credit cleared'); setDetail(null); }}>Settle credit</button>
              </div>
              <div className="space-y-1.5">
                {hist.length === 0 && <Empty title="No purchases yet" />}
                {hist.slice(0, 30).map((x: any) => (
                  <div key={x.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs">
                    <span className="font-semibold text-ink">{x.invoiceNo}</span>
                    <span className="text-ink3">{dt(x.ts)}</span>
                    <span className="ml-auto font-mono font-bold text-ink">{money(x.total, s.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

const Mini = ({ label, value }: any) => (
  <div className="rounded-lg border border-line bg-surface2/50 px-2 py-1.5"><p className="text-[10px] uppercase tracking-wider text-ink3">{label}</p><p className="truncate text-xs font-bold text-ink">{value}</p></div>
);

function CustomerEditor({ customer, onClose, onSave }: any) {
  const [f, setF] = useState<Customer | null>(customer);
  useMemo(() => setF(customer), [customer]);
  if (!f) return null;
  const up = (k: keyof Customer, v: any) => setF({ ...f, [k]: v } as Customer);
  return (
    <Modal open={!!customer} onClose={onClose} title={f.id ? 'Edit' : 'New customer'}
      footer={<div className="flex gap-2"><button className="btn-ghost flex-1" onClick={onClose}>Cancel</button><button className="btn-primary flex-1" onClick={() => onSave(f)}>Save</button></div>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><Input value={f.name} onChange={(e) => up('name', e.target.value)} autoFocus /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => up('phone', e.target.value)} inputMode="tel" /></Field>
        <Field label="Email"><Input value={f.email ?? ''} onChange={(e) => up('email', e.target.value)} /></Field>
        <Field label="Birthday"><Input type="date" value={f.birthday ?? ''} onChange={(e) => up('birthday', e.target.value)} /></Field>
        <Field label="GSTIN"><Input value={f.gstin ?? ''} onChange={(e) => up('gstin', e.target.value)} /></Field>
        <Field label="Credit limit"><Input inputMode="decimal" value={f.creditLimit ?? 0} onChange={(e) => up('creditLimit', +e.target.value || 0)} /></Field>
        <Field label="Points"><Input inputMode="numeric" value={f.points} onChange={(e) => up('points', +e.target.value || 0)} /></Field>
        <Field label="Outstanding credit"><Input inputMode="decimal" value={f.credit} onChange={(e) => up('credit', +e.target.value || 0)} /></Field>
        <Field label="Address" className="sm:col-span-2"><Input value={f.address ?? ''} onChange={(e) => up('address', e.target.value)} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={f.notes ?? ''} onChange={(e) => up('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
