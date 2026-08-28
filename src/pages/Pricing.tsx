import { useMemo, useState } from 'react';
import { Tags, Plus, Trash2, Printer, Download, Percent, Layers, Calculator } from 'lucide-react';
import { usePriceLists } from '@/hooks/useData';
import { useCatalog, useDebounced, searchProducts } from '@/hooks/useCatalog';
import { db, uid, logActivity } from '@/db/db';
import { money, num, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Field, Input, Select, Textarea, Empty, SearchBar, Badge, Tabs, Toggle, SectionTitle } from '@/components/ui';
import { VirtualList } from '@/components/ui/Virtual';
import { useSettings } from '@/store/settings';
import { toast, toastUndo } from '@/store/ui';
import { printHTML } from '@/lib/receipt';
import type { PriceList } from '@/db/types';

/** Price lists — wholesale / retail / distributor tiers, bulk slabs and printable rate cards. */
export default function Pricing() {
  const lists = usePriceLists() || [];
  const { products, loading } = useCatalog();
  const s = useSettings();
  const [tab, setTab] = useState<'lists' | 'card' | 'margins'>('lists');
  const [editor, setEditor] = useState<PriceList | null>(null);
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 150);
  const [cat, setCat] = useState('All');

  const cats = useMemo<string[]>(() => ['All', ...Array.from(new Set<string>(products.map((p: any) => String(p.category))))].slice(0, 60), [products]);

  const filtered = useMemo(() => {
    let base: any[] = products;
    if (cat !== 'All') base = base.filter((p: any) => p.category === cat);
    if (dq.trim()) base = searchProducts(base as any, dq, 500) as any[];
    return base;
  }, [products, cat, dq]);

  const priceFor = (p: any, l: PriceList) => {
    const manual = l.items?.find((i) => i.productId === p.id);
    if (manual) return manual.price;
    if (l.kind === 'percent') return +(p.price * (1 - l.value / 100)).toFixed(2);
    if (l.kind === 'fixed-margin') return +(p.cost * (1 + l.value / 100)).toFixed(2);
    return p.price;
  };

  const marginBands = useMemo(() => {
    const bands = [
      { label: 'Loss (<0%)', test: (m: number) => m < 0, tone: 'bad' },
      { label: '0–10%', test: (m: number) => m >= 0 && m < 10, tone: 'bad' },
      { label: '10–20%', test: (m: number) => m >= 10 && m < 20, tone: 'warn' },
      { label: '20–35%', test: (m: number) => m >= 20 && m < 35, tone: 'ok' },
      { label: '35–50%', test: (m: number) => m >= 35 && m < 50, tone: 'ok' },
      { label: '50%+', test: (m: number) => m >= 50, tone: 'brand' },
    ];
    return bands.map((b) => ({
      ...b,
      items: products.filter((p: any) => p.price > 0 && b.test(((p.price - p.cost) / p.price) * 100)),
    }));
  }, [products]);

  const printCard = (l?: PriceList) => {
    const rows = filtered.slice(0, 400).map((p: any) => {
      const price = l ? priceFor(p, l) : p.price;
      return `<tr><td>${p.name}</td><td>${p.unit}</td><td class=r>${(p.mrp || p.price).toFixed(2)}</td><td class=r><b>${price.toFixed(2)}</b></td></tr>`;
    }).join('');
    printHTML(`<html><head><meta charset="utf-8"><title>Rate card</title><style>
      body{font-family:system-ui,Arial;padding:18px;color:#111}
      table{width:100%;border-collapse:collapse;font-size:11px}td,th{border:1px solid #ccc;padding:4px 6px}.r{text-align:right}
      h2{margin:0}.muted{color:#666;font-size:11px}</style></head><body>
      <h2>${s.shopName || 'Shop'} — Rate card${l ? ' · ' + l.name : ''}</h2>
      <p class=muted>${cat} · ${filtered.length} items · ${new Date().toLocaleDateString('en-IN')}</p>
      <table><thead><tr><th>Item</th><th>Unit</th><th class=r>MRP</th><th class=r>Rate</th></tr></thead><tbody>${rows}</tbody></table>
      <p class=muted>Prices subject to change. E&OE.</p></body></html>`);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Price lists" value={num(lists.length)} tone="brand" icon={<Tags size={16} />} />
        <Stat label="Products priced" value={num(products.length)} tone="ok" />
        <Stat label="Below 10% margin" value={num(marginBands[0].items.length + marginBands[1].items.length)} tone="bad" icon={<Percent size={16} />} />
        <Stat label="Healthy (20%+)" value={num(marginBands[3].items.length + marginBands[4].items.length + marginBands[5].items.length)} tone="ok" />
      </div>

      <Card>
        <SectionTitle title="Pricing & rate cards" sub="Wholesale, retail, distributor — alag-alag rate list, ek hi catalogue par"
          right={<div className="flex gap-2">
            <button className="btn-soft" onClick={() => printCard()}><Printer size={15} /> Print rate card</button>
            <button className="btn-primary" onClick={() => setEditor({ id: '', name: '', kind: 'percent', value: 5, active: true })}><Plus size={15} /> New price list</button>
          </div>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'lists', label: 'Price lists', count: lists.length },
          { id: 'card', label: 'Rate card' },
          { id: 'margins', label: 'Margin bands' },
        ]} />
      </Card>

      {tab === 'lists' && (lists.length === 0 ? (
        <Empty title="No price lists yet" icon={<Tags size={22} />}
          sub="Thok grahak ke liye 10% kam, distributor ke liye cost+12% — aise rules banaiye."
          action={<button className="btn-primary mt-2" onClick={() => setEditor({ id: '', name: '', kind: 'percent', value: 5, active: true })}><Plus size={15} /> New price list</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map((l: PriceList) => {
            const sample = products.slice(0, 3);
            return (
              <Card key={l.id} className={cx(!l.active && 'opacity-60')}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{l.name}</p>
                    <p className="text-[11px] text-ink3">
                      {l.kind === 'percent' ? `${l.value}% off selling price` : l.kind === 'fixed-margin' ? `cost + ${l.value}% margin` : 'manual per-item rates'}
                      {l.customerTag ? ` · tag: ${l.customerTag}` : ''}
                    </p>
                  </div>
                  <Badge tone={l.active ? 'ok' : 'muted'}>{l.active ? 'active' : 'off'}</Badge>
                </div>
                <div className="mt-2 space-y-0.5 rounded-xl border border-line p-2">
                  {sample.map((p: any) => (
                    <div key={p.id} className="flex justify-between text-[11px]">
                      <span className="truncate text-ink3">{p.name}</span>
                      <span className="font-mono text-ink">{money(p.price, s.currency)} → <b className="text-brand">{money(priceFor(p, l), s.currency)}</b></span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button className="btn-soft flex-1 px-2 py-1.5 text-xs" onClick={() => printCard(l)}><Printer size={13} /> Rate card</button>
                  <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => downloadCSV(`${l.name}-rates.csv`, products.slice(0, 5000).map((p: any) => ({
                    name: p.name, sku: p.sku, unit: p.unit, mrp: p.mrp ?? '', normal: p.price, list_price: priceFor(p, l),
                  })))}><Download size={13} /></button>
                  <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => setEditor(l)}>Edit</button>
                  <button className="btn-ghost px-2 py-1.5 text-xs" onClick={async () => {
                    await db.priceLists.delete(l.id);
                    toastUndo(`${l.name} deleted`, async () => { await db.priceLists.put(l); toast('Restored'); });
                  }}><Trash2 size={13} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      ))}

      {tab === 'card' && (
        <>
          <Card>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <SearchBar value={q} onChange={setQ} placeholder="Filter items for the rate card…" />
              <Select value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}</Select>
            </div>
          </Card>
          {loading ? <div className="grid h-52 place-items-center text-ink3">Loading…</div> : (
            <Card pad={false}>
              <VirtualList items={filtered} rowHeight={50} columns={1} height="calc(100dvh - 400px)"
                render={(p: any) => {
                  const margin = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0;
                  return (
                    <div className="flex h-full items-center gap-2 border-b border-line px-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{p.name}</p>
                        <p className="truncate text-[11px] text-ink3">{p.category} · {p.unit}</p>
                      </div>
                      <span className="w-20 text-right font-mono text-xs text-ink3">MRP {p.mrp || '—'}</span>
                      <span className="w-20 text-right font-mono text-sm text-ink">{money(p.price, s.currency)}</span>
                      <span className={cx('w-14 text-right font-mono text-xs', margin < 10 ? 'text-bad' : margin < 25 ? 'text-warn' : 'text-ok')}>{margin.toFixed(0)}%</span>
                      {lists.filter((l: PriceList) => l.active).slice(0, 2).map((l: PriceList) => (
                        <span key={l.id} className="hidden w-20 text-right font-mono text-xs text-brand lg:block">{money(priceFor(p, l), s.currency)}</span>
                      ))}
                    </div>
                  );
                }} />
            </Card>
          )}
        </>
      )}

      {tab === 'margins' && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {marginBands.map((b) => (
            <Card key={b.label}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink">{b.label}</p>
                <Badge tone={b.tone as any}>{num(b.items.length)}</Badge>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface2">
                <div className={cx('h-full rounded-full', b.tone === 'bad' ? 'bg-bad' : b.tone === 'warn' ? 'bg-warn' : 'bg-ok')}
                  style={{ width: `${products.length ? (b.items.length / products.length) * 100 : 0}%` }} />
              </div>
              <div className="mt-2 space-y-0.5">
                {b.items.slice(0, 5).map((p: any) => (
                  <p key={p.id} className="truncate text-[11px] text-ink3">{p.name} · {money(p.price, s.currency)}</p>
                ))}
              </div>
              {b.items.length > 0 && (
                <button className="btn-soft mt-2 w-full px-2 py-1.5 text-xs" onClick={() => downloadCSV(`margin-${b.label}.csv`, b.items.map((p: any) => ({
                  name: p.name, cost: p.cost, price: p.price, margin_pct: +(((p.price - p.cost) / p.price) * 100).toFixed(1), stock: p.stock,
                })))}><Download size={13} /> Export {b.items.length}</button>
              )}
            </Card>
          ))}
        </div>
      )}

      {editor && <ListEditor list={editor} onClose={() => setEditor(null)} />}
    </div>
  );
}

function ListEditor({ list, onClose }: { list: PriceList; onClose: () => void }) {
  const [f, setF] = useState<PriceList>(list);
  const save = async () => {
    if (!f.name.trim()) return toast('Name required', 'err');
    const rec = { ...f, id: f.id || uid('pl_') };
    await db.priceLists.put(rec);
    await logActivity('pricing', `Price list ${rec.name} saved`);
    toast('Price list saved'); onClose();
  };
  return (
    <Modal open onClose={onClose} title={f.id ? 'Edit price list' : 'New price list'}
      footer={<button className="btn-primary w-full" onClick={save}>Save</button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Wholesale / Distributor" autoFocus /></Field>
        <Field label="Rule">
          <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as any })}>
            <option value="percent">Discount % off selling price</option>
            <option value="fixed-margin">Cost + margin %</option>
            <option value="manual">Manual per-item rates</option>
          </Select>
        </Field>
        <Field label="Value %"><Input inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: +e.target.value || 0 })} /></Field>
        <Field label="Customer tag" hint="Auto-apply to customers with this tag"><Input value={f.customerTag || ''} onChange={(e) => setF({ ...f, customerTag: e.target.value })} placeholder="wholesale" /></Field>
      </div>
      <div className="mt-3"><Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Active" /></div>
      <Field label="Note" className="mt-3"><Textarea rows={2} value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink3"><Calculator size={13} /> Rate cards print aur CSV export dono me yeh rule apply hota hai.</p>
    </Modal>
  );
}
