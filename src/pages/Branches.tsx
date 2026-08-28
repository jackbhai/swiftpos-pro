import { useMemo, useState } from 'react';
import { Store, ArrowLeftRight, Plus, Trash2, CheckCircle2, Truck, Printer, MapPin } from 'lucide-react';
import { useBranches, useTransfers } from '@/hooks/useData';
import { useCatalog, useDebounced, searchProducts } from '@/hooks/useCatalog';
import { db, uid, logActivity, addStockLog } from '@/db/db';
import { money, num, dt, cx } from '@/lib/format';
import { Card, Stat, Modal, Field, Input, Select, Textarea, Empty, Badge, Tabs, Toggle, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast, toastUndo } from '@/store/ui';
import { printHTML } from '@/lib/receipt';
import type { Branch, Transfer } from '@/db/types';

/** Branches & stock transfer — run more than one outlet from the same app. */
export default function Branches() {
  const branches = useBranches() || [];
  const transfers = useTransfers() || [];
  const s = useSettings();
  const [tab, setTab] = useState<'branches' | 'transfers'>('branches');
  const [editor, setEditor] = useState<Branch | null>(null);
  const [tEditor, setTEditor] = useState<Transfer | null>(null);

  const inTransit = transfers.filter((t: Transfer) => t.status === 'sent');
  const transitValue = inTransit.reduce((t: number, x: Transfer) => t + x.value, 0);

  const receive = async (t: Transfer) => {
    for (const it of t.items) {
      const p = await db.products.get(it.productId);
      if (!p) continue;
      const before = p.stock; const after = +(before + it.qty).toFixed(3);
      await db.products.update(p.id, { stock: after, updatedAt: Date.now() });
      await addStockLog(p.id, p.name, 'transfer', it.qty, before, after, t.transferNo);
    }
    await db.transfers.update(t.id, { status: 'received', receivedAt: Date.now() });
    await logActivity('transfer', `Received ${t.transferNo} at ${t.toName}`);
    toast(`${t.transferNo} received into ${t.toName}`);
  };

  const challan = (t: Transfer) => printHTML(`<html><head><meta charset="utf-8"><title>${t.transferNo}</title><style>
    body{font-family:system-ui,Arial;padding:22px;color:#111}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
    td,th{border:1px solid #ccc;padding:6px}.r{text-align:right}.muted{color:#666;font-size:11px}</style></head><body>
    <h2 style="margin:0">${s.shopName || 'Shop'} — Stock transfer challan</h2>
    <p class=muted>${t.transferNo} · ${dt(t.ts)}<br/>From: <b>${t.fromName}</b> → To: <b>${t.toName}</b></p>
    <table><thead><tr><th>#</th><th>Item</th><th class=r>Qty</th><th class=r>Value</th></tr></thead><tbody>
    ${t.items.map((i, n) => `<tr><td>${n + 1}</td><td>${i.name}</td><td class=r>${i.qty} ${i.unit}</td><td class=r>${(i.qty * i.cost).toFixed(2)}</td></tr>`).join('')}
    </tbody></table>
    <p class=r><b>Total value: ${t.value.toFixed(2)}</b></p>
    <p class=muted>Sent by ____________  ·  Received by ____________</p></body></html>`);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Branches" value={num(branches.length)} tone="brand" icon={<Store size={16} />} />
        <Stat label="Transfers" value={num(transfers.length)} tone="ok" icon={<ArrowLeftRight size={16} />} />
        <Stat label="In transit" value={num(inTransit.length)} tone="warn" icon={<Truck size={16} />} />
        <Stat label="Value in transit" value={money(transitValue, s.currency)} tone="bad" />
      </div>

      <Card>
        <SectionTitle title="Branches & stock transfer" sub="Ek se zyada outlet? Stock idhar-udhar bhejiye challan ke saath"
          right={tab === 'branches'
            ? <button className="btn-primary" onClick={() => setEditor({ id: '', name: '', code: '', active: true, createdAt: Date.now() })}><Plus size={15} /> Add branch</button>
            : <button className="btn-primary" disabled={branches.length < 2} onClick={() => setTEditor(blankTransfer())}><Plus size={15} /> New transfer</button>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'branches', label: 'Branches', count: branches.length },
          { id: 'transfers', label: 'Transfers', count: transfers.length },
        ]} />
      </Card>

      {tab === 'branches' && (branches.length === 0 ? (
        <Empty title="No branches yet" sub="Apni dukaan ke outlets add kijiye — phir stock transfer kar payenge." icon={<Store size={22} />}
          action={<button className="btn-primary mt-2" onClick={() => setEditor({ id: '', name: '', code: '', active: true, createdAt: Date.now() })}><Plus size={15} /> Add branch</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {branches.map((b: Branch) => (
            <Card key={b.id}>
              <div className="flex items-start gap-2">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-xs font-extrabold text-brand">{b.code || b.name.slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{b.name}</p>
                  <p className="truncate text-[11px] text-ink3">{b.phone || '—'}{b.gstin ? ' · ' + b.gstin : ''}</p>
                </div>
                {b.isDefault && <Badge tone="ok">main</Badge>}
                {!b.active && <Badge tone="bad">inactive</Badge>}
              </div>
              {b.address && <p className="mt-2 flex gap-1 text-[11px] text-ink3"><MapPin size={12} className="mt-0.5 shrink-0" />{b.address}</p>}
              <div className="mt-2 flex gap-1.5">
                <button className="btn-soft flex-1 px-2 py-1.5 text-xs" onClick={() => setEditor(b)}>Edit</button>
                <button className="btn-ghost px-2 py-1.5 text-xs" onClick={async () => {
                  await db.branches.delete(b.id);
                  toastUndo(`${b.name} deleted`, async () => { await db.branches.put(b); toast('Restored'); });
                }}><Trash2 size={13} /></button>
              </div>
            </Card>
          ))}
        </div>
      ))}

      {tab === 'transfers' && (transfers.length === 0 ? <Empty title="No transfers yet" icon={<ArrowLeftRight size={22} />} /> : (
        <Card pad={false}>
          {transfers.map((t: Transfer) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5 text-xs last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{t.transferNo} · {t.fromName} → {t.toName}</p>
                <p className="text-[11px] text-ink3">{dt(t.ts)} · {t.items.length} items</p>
              </div>
              <Badge tone={t.status === 'received' ? 'ok' : t.status === 'sent' ? 'warn' : t.status === 'cancelled' ? 'bad' : 'muted'}>{t.status}</Badge>
              <span className="font-mono font-bold text-ink">{money(t.value, s.currency)}</span>
              <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => challan(t)}><Printer size={13} /></button>
              {t.status === 'sent' && <button className="btn-primary px-2 py-1 text-[11px]" onClick={() => receive(t)}><CheckCircle2 size={13} /> Receive</button>}
            </div>
          ))}
        </Card>
      ))}

      {editor && <BranchEditor branch={editor} onClose={() => setEditor(null)} />}
      {tEditor && <TransferEditor transfer={tEditor} branches={branches} onClose={() => setTEditor(null)} />}
    </div>
  );
}

const blankTransfer = (): Transfer => ({
  id: '', transferNo: 'TRF-' + Date.now().toString().slice(-6), ts: Date.now(),
  fromBranch: '', fromName: '', toBranch: '', toName: '', items: [], status: 'draft', value: 0,
});

function BranchEditor({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const [f, setF] = useState<Branch>(branch);
  const save = async () => {
    if (!f.name.trim()) return toast('Branch name required', 'err');
    const rec = { ...f, id: f.id || uid('br_'), code: (f.code || f.name.slice(0, 3)).toUpperCase() };
    if (rec.isDefault) {
      const all = await db.branches.toArray();
      await db.branches.bulkPut(all.map((b) => ({ ...b, isDefault: false })));
    }
    await db.branches.put(rec);
    toast('Branch saved'); onClose();
  };
  return (
    <Modal open onClose={onClose} title={f.id ? 'Edit branch' : 'New branch'} footer={<button className="btn-primary w-full" onClick={save}>Save branch</button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Branch name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="Short code" hint="Shows on challans"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="MAIN" /></Field>
        <Field label="Phone"><Input value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="GSTIN"><Input value={f.gstin || ''} onChange={(e) => setF({ ...f, gstin: e.target.value })} /></Field>
      </div>
      <Field label="Address" className="mt-3"><Textarea rows={2} value={f.address || ''} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      <div className="mt-3 space-y-2">
        <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Active" />
        <Toggle checked={!!f.isDefault} onChange={(v) => setF({ ...f, isDefault: v })} label="Main branch" hint="Billing default" />
      </div>
    </Modal>
  );
}

function TransferEditor({ transfer, branches, onClose }: { transfer: Transfer; branches: Branch[]; onClose: () => void }) {
  const s = useSettings();
  const { products } = useCatalog();
  const [f, setF] = useState<Transfer>(transfer);
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 150);
  const hits = useMemo(() => (dq.trim() ? searchProducts(products as any, dq, 6) : []), [products, dq]);

  const setItems = (items: Transfer['items']) =>
    setF({ ...f, items, value: +items.reduce((t, i) => t + i.qty * i.cost, 0).toFixed(2) });

  const send = async () => {
    if (!f.fromBranch || !f.toBranch || f.fromBranch === f.toBranch) return toast('Pick two different branches', 'err');
    if (!f.items.length) return toast('Add items to transfer', 'err');
    const rec: Transfer = { ...f, id: f.id || uid('tr_'), ts: Date.now(), status: 'sent' };
    for (const it of rec.items) {
      const p = await db.products.get(it.productId);
      if (!p) continue;
      const before = p.stock; const after = +(before - it.qty).toFixed(3);
      await db.products.update(p.id, { stock: after, updatedAt: Date.now() });
      await addStockLog(p.id, p.name, 'transfer', -it.qty, before, after, rec.transferNo);
    }
    await db.transfers.put(rec);
    await logActivity('transfer', `Sent ${rec.transferNo} ${rec.fromName} → ${rec.toName}`);
    toast(`${rec.transferNo} dispatched`); onClose();
  };

  return (
    <Modal open onClose={onClose} wide title="New stock transfer"
      footer={<div className="flex items-center gap-2">
        <div className="flex-1"><p className="text-[10px] uppercase text-ink3">Transfer value</p><p className="font-mono text-lg font-bold text-brand">{money(f.value, s.currency)}</p></div>
        <button className="btn-primary" onClick={send}><Truck size={15} /> Dispatch</button>
      </div>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="From branch">
          <Select value={f.fromBranch} onChange={(e) => { const b = branches.find((x) => x.id === e.target.value); setF({ ...f, fromBranch: e.target.value, fromName: b?.name || '' }); }}>
            <option value="">Select…</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
        <Field label="To branch">
          <Select value={f.toBranch} onChange={(e) => { const b = branches.find((x) => x.id === e.target.value); setF({ ...f, toBranch: e.target.value, toName: b?.name || '' }); }}>
            <option value="">Select…</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Add item" className="mt-3"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product…" /></Field>
      {hits.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-xl border border-line">
          {hits.map((p: any) => (
            <button key={p.id} className="flex w-full justify-between border-b border-line px-3 py-2 text-left text-xs last:border-0 hover:bg-surface2"
              onClick={() => { setItems([...f.items, { productId: p.id, name: p.name, qty: 1, unit: p.unit, cost: p.cost }]); setQ(''); }}>
              <span className="truncate text-ink">{p.name}</span><span className="font-mono text-ink3">stock {p.stock}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        {f.items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl border border-line p-2">
            <span className="min-w-0 flex-1 truncate text-xs text-ink">{it.name}</span>
            <input className="input h-7 w-20 text-center font-mono text-xs" value={it.qty}
              onChange={(e) => setItems(f.items.map((x, j) => (j === i ? { ...x, qty: +e.target.value || 0 } : x)))} />
            <span className="w-10 text-[11px] text-ink3">{it.unit}</span>
            <span className="w-20 text-right font-mono text-xs text-ink2">{money(it.qty * it.cost, s.currency)}</span>
            <button className="rounded-lg p-1 text-ink3 hover:text-bad" onClick={() => setItems(f.items.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <Field label="Note" className="mt-3"><Textarea rows={2} value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Vehicle no, person carrying…" /></Field>
      <p className={cx('mt-2 text-[11px] text-ink3')}>Dispatch karte hi stock source branch se minus ho jayega; receive karne par destination me add hoga.</p>
    </Modal>
  );
}
