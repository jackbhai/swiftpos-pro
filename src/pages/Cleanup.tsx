import { useMemo, useState } from 'react';
import { Stethoscope, Wand2, Trash2, Download, AlertTriangle, CheckCircle2, Merge } from 'lucide-react';
import { useCatalog } from '@/hooks/useCatalog';
import { db, logActivity } from '@/db/db';
import { money, num, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Empty, Badge, Tabs, SectionTitle, Field, Input } from '@/components/ui';
import { VirtualList } from '@/components/ui/Virtual';
import { useSettings } from '@/store/settings';
import { toast, toastUndo } from '@/store/ui';

type CheckId = 'dupName' | 'dupBarcode' | 'noBarcode' | 'zeroPrice' | 'belowCost' | 'noCost' | 'hugeMargin' | 'noHsn' | 'noCategory' | 'negStock' | 'noExpiry' | 'longName';

interface Check { id: CheckId; label: string; hint: string; severity: 'bad' | 'warn' | 'info'; rows: any[]; fix?: string }

/** Catalogue doctor — find and fix data problems across thousands of products in seconds. */
export default function Cleanup() {
  const { products, loading } = useCatalog();
  const s = useSettings();
  const [tab, setTab] = useState<CheckId | 'all'>('all');
  const [busy, setBusy] = useState(false);
  const [gstDefault, setGstDefault] = useState(String(s.defaultGst ?? 5));

  const checks = useMemo<Check[]>(() => {
    if (!products.length) return [];
    const nameMap = new Map<string, any[]>();
    const barMap = new Map<string, any[]>();
    products.forEach((p: any) => {
      const nk = (p.name || '').trim().toLowerCase();
      if (nk) { const a = nameMap.get(nk) || []; a.push(p); nameMap.set(nk, a); }
      const bk = (p.barcode || '').trim();
      if (bk) { const a = barMap.get(bk) || []; a.push(p); barMap.set(bk, a); }
    });
    const dupName = [...nameMap.values()].filter((a) => a.length > 1).flat();
    const dupBarcode = [...barMap.values()].filter((a) => a.length > 1).flat();

    return [
      { id: 'dupName', label: 'Duplicate names', hint: 'Same product entered more than once — merge or delete extras', severity: 'bad', rows: dupName, fix: 'merge' },
      { id: 'dupBarcode', label: 'Duplicate barcodes', hint: 'Scanner will pick the wrong item', severity: 'bad', rows: dupBarcode },
      { id: 'belowCost', label: 'Selling below cost', hint: 'Every sale is a loss', severity: 'bad', rows: products.filter((p: any) => p.price > 0 && p.cost > 0 && p.price < p.cost), fix: 'markup' },
      { id: 'zeroPrice', label: 'Zero / missing price', hint: 'Cannot be billed properly', severity: 'bad', rows: products.filter((p: any) => !p.price || p.price <= 0) },
      { id: 'negStock', label: 'Negative stock', hint: 'Usually a billing or import mistake', severity: 'bad', rows: products.filter((p: any) => p.stock < 0), fix: 'zero' },
      { id: 'noCost', label: 'No cost price', hint: 'Profit reports will be wrong', severity: 'warn', rows: products.filter((p: any) => !p.cost || p.cost <= 0), fix: 'costFromPrice' },
      { id: 'hugeMargin', label: 'Suspicious margin (>90%)', hint: 'Often a decimal/typo error', severity: 'warn', rows: products.filter((p: any) => p.cost > 0 && p.price > 0 && (p.price - p.cost) / p.price > 0.9) },
      { id: 'noBarcode', label: 'No barcode', hint: 'Slower billing, no scanner support', severity: 'warn', rows: products.filter((p: any) => !p.barcode), fix: 'genBarcode' },
      { id: 'noHsn', label: 'No HSN code', hint: 'Needed for GST filing', severity: 'warn', rows: products.filter((p: any) => !p.hsn) },
      { id: 'noCategory', label: 'No / generic category', hint: 'Reports and filters get messy', severity: 'info', rows: products.filter((p: any) => !p.category || /^(misc|other|general|na)$/i.test(p.category)), fix: 'category' },
      { id: 'noExpiry', label: 'Batch without expiry', hint: 'Expiry alerts will not fire', severity: 'info', rows: products.filter((p: any) => p.batch && !p.expiry) },
      { id: 'longName', label: 'Very long names (>60 chars)', hint: 'Breaks thermal receipts', severity: 'info', rows: products.filter((p: any) => (p.name || '').length > 60), fix: 'trim' },
    ];
  }, [products]);

  const issues = checks.reduce((t, c) => t + c.rows.length, 0);
  const score = products.length ? Math.max(0, Math.round(100 - (issues / products.length) * 40)) : 100;
  const active = checks.find((c) => c.id === tab);
  const shown = active ? active.rows : checks.flatMap((c) => c.rows).slice(0, 3000);

  const applyFix = async (c: Check) => {
    if (!c.fix || !c.rows.length) return;
    setBusy(true);
    const backup = c.rows.map((p) => ({ ...p }));
    let updated: any[] = [];

    if (c.fix === 'markup') updated = c.rows.map((p) => ({ ...p, price: +(p.cost * 1.2).toFixed(2), updatedAt: Date.now() }));
    if (c.fix === 'zero') updated = c.rows.map((p) => ({ ...p, stock: 0, updatedAt: Date.now() }));
    if (c.fix === 'costFromPrice') updated = c.rows.map((p) => ({ ...p, cost: +(p.price * 0.8).toFixed(2), updatedAt: Date.now() }));
    if (c.fix === 'genBarcode') updated = c.rows.map((p, i) => ({ ...p, barcode: '200' + String(Date.now()).slice(-7) + String(i % 1000).padStart(3, '0'), updatedAt: Date.now() }));
    if (c.fix === 'category') updated = c.rows.map((p) => ({ ...p, category: p.category && p.category.trim() ? p.category : 'General', updatedAt: Date.now() }));
    if (c.fix === 'trim') updated = c.rows.map((p) => ({ ...p, name: String(p.name).slice(0, 58).trim(), updatedAt: Date.now() }));
    if (c.fix === 'merge') {
      // keep the row with the most stock, delete the rest, summing stock into the keeper
      const groups = new Map<string, any[]>();
      c.rows.forEach((p) => { const k = p.name.trim().toLowerCase(); const a = groups.get(k) || []; a.push(p); groups.set(k, a); });
      const del: string[] = [];
      const keep: any[] = [];
      groups.forEach((arr) => {
        const sorted = [...arr].sort((a, b) => b.stock - a.stock);
        const winner = { ...sorted[0], stock: +sorted.reduce((t, p) => t + p.stock, 0).toFixed(3), updatedAt: Date.now() };
        keep.push(winner);
        sorted.slice(1).forEach((p) => del.push(p.id));
      });
      await db.products.bulkPut(keep);
      await db.products.bulkDelete(del);
      await logActivity('cleanup', `Merged ${del.length} duplicate products`);
      setBusy(false);
      toastUndo(`${del.length} duplicates merged`, async () => { await db.products.bulkPut(backup); toast('Restored'); });
      return;
    }

    const clean = updated.map(({ _key, _tokens, ...rest }: any) => rest);
    await db.products.bulkPut(clean);
    await logActivity('cleanup', `${c.label}: fixed ${clean.length} products`);
    setBusy(false);
    toastUndo(`${clean.length} products fixed`, async () => {
      await db.products.bulkPut(backup.map(({ _key, _tokens, ...rest }: any) => rest));
      toast('Restored');
    });
  };

  const applyGst = async () => {
    const rows = products.filter((p: any) => !p.gst && p.gst !== 0);
    if (!rows.length) return toast('Every product already has a GST rate', 'info');
    await db.products.bulkPut(rows.map(({ _key, _tokens, ...p }: any) => ({ ...p, gst: +gstDefault || 0, updatedAt: Date.now() })));
    toast(`GST set on ${rows.length} products`);
  };

  if (loading) return <div className="grid h-64 place-items-center text-ink3">Scanning catalogue…</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Data health" value={score + '/100'} tone={score > 85 ? 'ok' : score > 60 ? 'warn' : 'bad'} icon={<Stethoscope size={16} />} />
        <Stat label="Issues found" value={num(issues)} tone={issues ? 'warn' : 'ok'} icon={<AlertTriangle size={16} />} />
        <Stat label="Products scanned" value={num(products.length)} tone="brand" />
        <Stat label="Auto-fixable" value={num(checks.filter((c) => c.fix).reduce((t, c) => t + c.rows.length, 0))} tone="ok" icon={<Wand2 size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Catalogue doctor" sub="12 automatic checks — har fix undo ho sakta hai, tension mat lijiye"
          right={<button className="btn-soft" onClick={() => downloadCSV('data-issues.csv', checks.flatMap((c) => c.rows.map((p: any) => ({
            issue: c.label, name: p.name, sku: p.sku, barcode: p.barcode ?? '', category: p.category, cost: p.cost, price: p.price, stock: p.stock, gst: p.gst, hsn: p.hsn ?? '',
          }))))}><Download size={15} /> Export issues</button>} />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {checks.map((c) => (
            <button key={c.id} onClick={() => setTab(c.id)}
              className={cx('rounded-xl border p-2.5 text-left transition',
                tab === c.id ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/40',
                c.rows.length === 0 && 'opacity-60')}>
              <div className="flex items-center gap-2">
                {c.rows.length === 0
                  ? <CheckCircle2 size={14} className="shrink-0 text-ok" />
                  : <AlertTriangle size={14} className={cx('shrink-0', c.severity === 'bad' ? 'text-bad' : c.severity === 'warn' ? 'text-warn' : 'text-ink3')} />}
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{c.label}</span>
                <Badge tone={c.rows.length === 0 ? 'ok' : c.severity === 'bad' ? 'bad' : c.severity === 'warn' ? 'warn' : 'muted'}>{c.rows.length}</Badge>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-ink3">{c.hint}</p>
              {c.fix && c.rows.length > 0 && (
                <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); applyFix(c); }}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-brand hover:bg-surface2">
                  {c.fix === 'merge' ? <Merge size={11} /> : <Wand2 size={11} />} {busy ? 'Working…' : 'Auto-fix'}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <Field label="Set GST % on products that have none" className="flex-1">
            <Input inputMode="decimal" value={gstDefault} onChange={(e) => setGstDefault(e.target.value)} />
          </Field>
          <button className="btn-soft" onClick={applyGst}><Wand2 size={15} /> Apply GST</button>
          <button className="btn-ghost" onClick={() => setTab('all')}>Show everything</button>
        </div>
      </Card>

      {shown.length === 0 ? <Empty title="Catalogue looks clean 🎉" sub="Koi issue nahi mila." icon={<CheckCircle2 size={22} />} /> : (
        <Card pad={false}>
          <div className="flex items-center justify-between p-3">
            <SectionTitle title={active ? active.label : 'All flagged products'} sub={`${num(shown.length)} rows`} />
            {active?.rows.length ? (
              <button className="btn-ghost px-2 py-1 text-xs" onClick={async () => {
                const backup = active.rows.map((p: any) => ({ ...p }));
                await db.products.bulkDelete(active.rows.map((p: any) => p.id));
                toastUndo(`${backup.length} deleted`, async () => {
                  await db.products.bulkPut(backup.map(({ _key, _tokens, ...rest }: any) => rest)); toast('Restored');
                });
              }}><Trash2 size={13} /> Delete these</button>
            ) : null}
          </div>
          <VirtualList
            items={shown}
            rowHeight={54}
            columns={1}
            height="calc(100dvh - 430px)"
            render={(p: any) => (
              <div className="flex h-full items-center gap-2 border-b border-line px-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{p.name}</p>
                  <p className="truncate text-[11px] text-ink3">{p.sku} · {p.category} · barcode {p.barcode || '—'} · HSN {p.hsn || '—'}</p>
                </div>
                <span className="w-20 text-right font-mono text-xs text-ink3">{money(p.cost, s.currency)}</span>
                <span className="w-20 text-right font-mono text-xs text-ink">{money(p.price, s.currency)}</span>
                <span className={cx('w-16 text-right font-mono text-xs', p.stock < 0 ? 'text-bad' : 'text-ink3')}>{p.stock}</span>
              </div>
            )}
          />
        </Card>
      )}
    </div>
  );
}
