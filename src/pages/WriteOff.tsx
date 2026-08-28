import { useMemo, useState } from 'react';
import { PackageX, Plus, Download, Trash2, AlertTriangle, Skull, Droplets, Gift } from 'lucide-react';
import { useWriteOffs } from '@/hooks/useData';
import { useCatalog, useDebounced, searchProducts } from '@/hooks/useCatalog';
import { db, uid, logActivity, addStockLog } from '@/db/db';
import { money, num, dt, dOnly, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Field, Input, Select, Textarea, Empty, Badge, Tabs, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast, toastUndo } from '@/store/ui';
import { expiryState } from '@/lib/calc';
import type { WriteOff as WO } from '@/db/types';

const REASONS: { id: WO['reason']; label: string; icon: any }[] = [
  { id: 'damage', label: 'Damaged', icon: <AlertTriangle size={13} /> },
  { id: 'expiry', label: 'Expired', icon: <Skull size={13} /> },
  { id: 'theft', label: 'Theft / missing', icon: <PackageX size={13} /> },
  { id: 'wastage', label: 'Wastage', icon: <Droplets size={13} /> },
  { id: 'sample', label: 'Sample / tasting', icon: <Gift size={13} /> },
  { id: 'personal', label: 'Own use', icon: <Gift size={13} /> },
  { id: 'other', label: 'Other', icon: <AlertTriangle size={13} /> },
];

/** Damage, expiry & wastage register — write stock off properly instead of "adjusting" silently. */
export default function WriteOff() {
  const rows = useWriteOffs() || [];
  const { products } = useCatalog();
  const s = useSettings();
  const [tab, setTab] = useState<'register' | 'expiring'>('register');
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const monthRows = rows.filter((r: WO) => new Date(r.ts).toISOString().slice(0, 7) === month);
  const total = monthRows.reduce((t: number, r: WO) => t + r.value, 0);
  const byReason = useMemo(() => {
    const m = new Map<string, number>();
    monthRows.forEach((r: WO) => m.set(r.reason, (m.get(r.reason) || 0) + r.value));
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [monthRows]);

  const expiring = useMemo(() => products
    .filter((p: any) => ['soon', 'expired'].includes(expiryState(p, s.expiryAlertDays)) && p.stock > 0)
    .sort((a: any, b: any) => String(a.expiry).localeCompare(String(b.expiry))), [products, s.expiryAlertDays]);
  const expiredValue = expiring.filter((p: any) => expiryState(p, s.expiryAlertDays) === 'expired').reduce((t: number, p: any) => t + p.cost * p.stock, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Written off this month" value={money(total, s.currency)} tone="bad" icon={<PackageX size={16} />} sub={`${monthRows.length} entries`} />
        <Stat label="Entries (all time)" value={num(rows.length)} tone="warn" />
        <Stat label="Expiring soon" value={num(expiring.length)} tone="warn" icon={<Skull size={16} />} />
        <Stat label="Expired stock value" value={money(expiredValue, s.currency)} tone="bad" />
      </div>

      <Card>
        <SectionTitle title="Damage, expiry & wastage register" sub="Stock kam karo, par record ke saath — audit aur tax dono ke liye zaroori"
          right={<div className="flex gap-2">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9" />
            <button className="btn-soft" onClick={() => downloadCSV(`writeoffs-${month}.csv`, monthRows.map((r: WO) => ({
              date: dt(r.ts), product: r.productName, qty: r.qty, unit: r.unit, reason: r.reason, cost: r.cost, value: r.value, batch: r.batch || '', note: r.note || '',
            })))}><Download size={15} /> CSV</button>
            <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> Write off</button>
          </div>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'register', label: 'Register', count: monthRows.length },
          { id: 'expiring', label: 'Expiring / expired', count: expiring.length },
        ]} />
        {byReason.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {byReason.map(([r, v]) => <Badge key={r} tone={r === 'theft' ? 'bad' : 'warn'}>{r}: {money(v, s.currency)}</Badge>)}
          </div>
        )}
      </Card>

      {tab === 'register' && (monthRows.length === 0 ? <Empty title="Nothing written off this month 🎉" icon={<PackageX size={22} />} /> : (
        <Card pad={false}>
          {monthRows.map((r: WO) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
              <span className="w-32 shrink-0 text-ink3">{dt(r.ts)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-ink">{r.productName}</p>
                {r.note && <p className="truncate text-[10px] text-ink3">{r.note}</p>}
              </div>
              <Badge tone={r.reason === 'theft' ? 'bad' : r.reason === 'expiry' ? 'warn' : 'muted'}>{r.reason}</Badge>
              <span className="font-mono text-ink3">{r.qty} {r.unit}</span>
              <span className="w-24 text-right font-mono font-bold text-bad">{money(r.value, s.currency)}</span>
              <button className="rounded-lg p-1 text-ink3 hover:text-bad" onClick={async () => {
                await db.writeOffs.delete(r.id);
                const p = await db.products.get(r.productId);
                if (p) await db.products.update(p.id, { stock: +(p.stock + r.qty).toFixed(3) });
                toastUndo('Write-off reversed & stock restored', async () => {
                  await db.writeOffs.put(r);
                  const p2 = await db.products.get(r.productId);
                  if (p2) await db.products.update(p2.id, { stock: +(p2.stock - r.qty).toFixed(3) });
                  toast('Re-applied');
                });
              }}><Trash2 size={13} /></button>
            </div>
          ))}
          <div className="flex justify-between border-t border-line p-3 text-sm font-bold text-ink">
            <span>Total loss this month</span><span className="font-mono text-bad">{money(total, s.currency)}</span>
          </div>
        </Card>
      ))}

      {tab === 'expiring' && (expiring.length === 0 ? <Empty title="Nothing expiring soon 🎉" /> : (
        <Card pad={false}>
          {expiring.slice(0, 300).map((p: any) => {
            const st = expiryState(p, s.expiryAlertDays);
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink">{p.name}</p>
                  <p className="truncate text-[10px] text-ink3">{p.batch ? 'Batch ' + p.batch + ' · ' : ''}exp {p.expiry ? dOnly(new Date(p.expiry).getTime()) : '—'}</p>
                </div>
                <Badge tone={st === 'expired' ? 'bad' : 'warn'}>{st}</Badge>
                <span className="font-mono text-ink3">{p.stock} {p.unit}</span>
                <span className="w-24 text-right font-mono text-bad">{money(p.cost * p.stock, s.currency)}</span>
                <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => setOpen(true)}>Write off</button>
              </div>
            );
          })}
        </Card>
      ))}

      {open && <WriteOffModal products={products} onClose={() => setOpen(false)} />}
    </div>
  );
}

function WriteOffModal({ products, onClose }: { products: any[]; onClose: () => void }) {
  const s = useSettings();
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 150);
  const [picked, setPicked] = useState<any>(null);
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState<WO['reason']>('damage');
  const [note, setNote] = useState('');
  const hits = useMemo(() => (dq.trim() ? searchProducts(products as any, dq, 6) : []), [products, dq]);
  const value = picked ? (+qty || 0) * picked.cost : 0;

  const save = async () => {
    if (!picked) return toast('Select a product', 'err');
    const n = +qty;
    if (!n || n <= 0) return toast('Enter quantity', 'err');
    if (n > picked.stock) return toast(`Only ${picked.stock} ${picked.unit} in stock`, 'err');
    const before = picked.stock; const after = +(before - n).toFixed(3);
    await db.products.update(picked.id, { stock: after, updatedAt: Date.now() });
    const rec: WO = {
      id: uid('wo_'), ts: Date.now(), productId: picked.id, productName: picked.name, qty: n,
      unit: picked.unit, reason, cost: picked.cost, value: +(n * picked.cost).toFixed(2), note, batch: picked.batch,
    };
    await db.writeOffs.add(rec);
    await addStockLog(picked.id, picked.name, 'damage', -n, before, after, reason.toUpperCase());
    await logActivity('writeoff', `${reason} ${n} ${picked.unit} ${picked.name} (${money(rec.value, s.currency)})`);
    toast(`Written off · ${money(rec.value, s.currency)} loss`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Write off stock"
      footer={<button className="btn-primary w-full" onClick={save}>Write off · loss {money(value, s.currency)}</button>}>
      <Field label="Product"><Input value={picked ? picked.name : q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} placeholder="Search product…" autoFocus /></Field>
      {!picked && hits.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-xl border border-line">
          {hits.map((p: any) => (
            <button key={p.id} className="flex w-full justify-between border-b border-line px-3 py-2 text-left text-xs last:border-0 hover:bg-surface2"
              onClick={() => { setPicked(p); setQ(p.name); }}>
              <span className="truncate text-ink">{p.name}</span><span className="font-mono text-ink3">stock {p.stock} {p.unit}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Quantity" hint={picked ? `Available: ${picked.stock} ${picked.unit}` : undefined}>
          <Input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="Reason">
          <Select value={reason} onChange={(e) => setReason(e.target.value as any)}>
            {REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </Select>
        </Field>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button key={r.id} className={cx('btn-soft px-2 py-1 text-[11px]', reason === r.id && 'ring-1 ring-brand')} onClick={() => setReason(r.id)}>
            {r.icon} {r.label}
          </button>
        ))}
      </div>
      <Field label="Note" className="mt-3"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kaise hua, kisne dekha…" /></Field>
      {picked && (
        <div className="mt-3 rounded-xl border border-bad/30 bg-bad/10 p-3 text-xs text-bad">
          Stock {picked.stock} → <b>{(picked.stock - (+qty || 0)).toFixed(2)}</b> {picked.unit} · loss <b>{money(value, s.currency)}</b> (cost price par)
        </div>
      )}
    </Modal>
  );
}
