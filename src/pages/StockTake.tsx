import { useMemo, useState } from 'react';
import { ClipboardList, Save, Download, ScanLine, Trash2, AlertTriangle } from 'lucide-react';
import { db, uid, logActivity, addStockLog } from '@/db/db';
import { useCatalog, useDebounced, searchProducts } from '@/hooks/useCatalog';
import { money, num, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Field, Input, Select, SearchBar, SectionTitle, Empty, Badge } from '@/components/ui';
import { VirtualList } from '@/components/ui/Virtual';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';

interface CountRow { id: string; name: string; unit: string; system: number; counted: number; cost: number }

/** Physical stock take / audit — count, compare, and post adjustments in bulk. */
export default function StockTake() {
  const { products, loading } = useCatalog();
  const s = useSettings();
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 150);
  const [cat, setCat] = useState('All');
  const [counts, setCounts] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('swiftpos-stocktake') || '{}'); } catch { return {}; }
  });
  const [onlyCounted, setOnlyCounted] = useState(false);
  const [busy, setBusy] = useState(false);

  const cats = useMemo<string[]>(() => ['All', ...Array.from(new Set<string>(products.map((p: any) => String(p.category))))].slice(0, 60), [products]);

  const persist = (next: Record<string, string>) => {
    setCounts(next);
    try { localStorage.setItem('swiftpos-stocktake', JSON.stringify(next)); } catch { /* quota */ }
  };

  const list = useMemo(() => {
    let base: any[] = products;
    if (cat !== 'All') base = base.filter((p: any) => p.category === cat);
    if (dq.trim()) base = searchProducts(base as any, dq, 400) as any[];
    if (onlyCounted) base = base.filter((p: any) => counts[p.id] !== undefined && counts[p.id] !== '');
    return base;
  }, [products, cat, dq, onlyCounted, counts]);

  const rows: CountRow[] = useMemo(() => products
    .filter((p: any) => counts[p.id] !== undefined && counts[p.id] !== '')
    .map((p: any) => ({ id: p.id, name: p.name, unit: p.unit, system: p.stock, counted: +counts[p.id] || 0, cost: p.cost })),
  [products, counts]);

  const diffRows = rows.filter((r) => Math.abs(r.counted - r.system) > 0.001);
  const shrinkValue = diffRows.reduce((t, r) => t + (r.counted - r.system) * r.cost, 0);

  const post = async () => {
    if (!diffRows.length) return toast('No differences to post', 'info');
    setBusy(true);
    const ref = 'STK-' + Date.now().toString().slice(-6);
    for (const r of diffRows) {
      const p = await db.products.get(r.id);
      if (!p) continue;
      await db.products.update(r.id, { stock: r.counted, updatedAt: Date.now() });
      await addStockLog(r.id, r.name, 'adjust', +(r.counted - r.system).toFixed(3), r.system, r.counted, ref);
    }
    await logActivity('stocktake', `Stock take ${ref}: ${diffRows.length} adjustments, value ${money(shrinkValue, s.currency)}`);
    persist({});
    setBusy(false);
    toast(`${diffRows.length} adjustments posted (${ref})`);
  };

  const exportSheet = () => downloadCSV(`stock-take-${Date.now()}.csv`, list.slice(0, 5000).map((p: any) => ({
    name: p.name, sku: p.sku, barcode: p.barcode ?? '', category: p.category,
    system_stock: p.stock, counted: counts[p.id] ?? '', unit: p.unit, cost: p.cost,
  })));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Counted" value={num(rows.length)} tone="brand" icon={<ClipboardList size={16} />} sub={`of ${num(products.length)} items`} />
        <Stat label="Differences" value={num(diffRows.length)} tone="warn" icon={<AlertTriangle size={16} />} />
        <Stat label="Shrink / gain" value={money(shrinkValue, s.currency)} tone={shrinkValue < 0 ? 'bad' : 'ok'} />
        <Stat label="Progress" value={products.length ? ((rows.length / products.length) * 100).toFixed(1) + '%' : '0%'} tone="ok" />
      </div>

      <Card>
        <SectionTitle title="Physical stock take" sub="Count the shelf, type what you see. Nothing changes until you post."
          right={<div className="flex gap-2">
            <button className="btn-soft" onClick={exportSheet}><Download size={15} /> Count sheet</button>
            <button className="btn-primary" disabled={busy || !diffRows.length} onClick={post}><Save size={15} /> Post {diffRows.length || ''}</button>
          </div>} />
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <SearchBar value={q} onChange={setQ} placeholder="Search or scan barcode…" right={<ScanLine size={15} className="text-ink3" />} />
          <Select value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}</Select>
          <button className={cx('btn-soft text-xs', onlyCounted && 'ring-1 ring-brand')} onClick={() => setOnlyCounted(!onlyCounted)}>
            {onlyCounted ? 'Showing counted' : 'Show counted only'}
          </button>
        </div>
        {rows.length > 0 && (
          <button className="btn-ghost mt-2 text-xs" onClick={() => { persist({}); toast('Count sheet cleared'); }}>
            <Trash2 size={13} /> Reset count sheet
          </button>
        )}
      </Card>

      {loading ? <div className="grid h-64 place-items-center text-ink3">Loading catalogue…</div>
      : list.length === 0 ? <Empty title="Nothing to count" sub="Adjust your filters." icon={<ClipboardList size={22} />} /> : (
        <Card pad={false}>
          <VirtualList
            items={list}
            rowHeight={58}
            columns={1}
            height="calc(100dvh - 400px)"
            render={(p: any) => {
              const raw = counts[p.id];
              const has = raw !== undefined && raw !== '';
              const diff = has ? (+raw || 0) - p.stock : 0;
              return (
                <div className={cx('flex h-full items-center gap-2 border-b border-line px-3',
                  has && Math.abs(diff) > 0.001 ? 'bg-warn/5' : has ? 'bg-ok/5' : '')}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                    <p className="truncate text-[11px] text-ink3">{p.sku} · {p.category} · system {p.stock} {p.unit}</p>
                  </div>
                  {has && Math.abs(diff) > 0.001 && <Badge tone={diff < 0 ? 'bad' : 'ok'}>{diff > 0 ? '+' : ''}{diff.toFixed(2)}</Badge>}
                  <input className="input h-9 w-24 text-center font-mono text-sm" inputMode="decimal" placeholder="count"
                    value={raw ?? ''} onChange={(e) => persist({ ...counts, [p.id]: e.target.value })} />
                  <button className="btn-ghost h-9 px-2 text-[11px]" onClick={() => persist({ ...counts, [p.id]: String(p.stock) })}>OK</button>
                </div>
              );
            }}
          />
        </Card>
      )}

      {diffRows.length > 0 && (
        <Card>
          <SectionTitle title={`Adjustment preview · ${diffRows.length} items`} sub="This is exactly what will be written when you post" />
          <div className="max-h-64 overflow-auto">
            {diffRows.map((r) => (
              <div key={r.id} className="flex items-center gap-2 border-b border-line py-1.5 text-xs last:border-0">
                <span className="min-w-0 flex-1 truncate text-ink2">{r.name}</span>
                <span className="font-mono text-ink3">{r.system} → {r.counted}</span>
                <span className={cx('w-24 text-right font-mono', r.counted < r.system ? 'text-bad' : 'text-ok')}>
                  {money((r.counted - r.system) * r.cost, s.currency)}
                </span>
              </div>
            ))}
          </div>
          <Field label="Total value impact" className="mt-3">
            <Input readOnly value={money(shrinkValue, s.currency)} />
          </Field>
        </Card>
      )}
    </div>
  );
}
