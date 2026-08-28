import { useMemo, useState } from 'react';
import { Printer, Tag, Search, Plus, Minus, Trash2 } from 'lucide-react';
import { Card, SectionTitle, Field, Input, Select, Empty, SearchBar, Toggle } from '@/components/ui';
import { useProducts } from '@/hooks/useData';
import { useSettings, useShop } from '@/store/settings';
import { code128SVG } from '@/lib/barcode';
import { printHTML } from '@/lib/receipt';
import { money } from '@/lib/format';
import { toast } from '@/store/ui';
import type { Product } from '@/db/types';

export default function Labels() {
  const products = useProducts() || [];
  const s = useSettings();
  const { terms } = useShop();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<{ p: Product; count: number }[]>([]);
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');

  const matches = useMemo(() => (q.trim()
    ? products.filter((p: Product) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.barcode ?? '').includes(q) || p.sku.toLowerCase().includes(q.toLowerCase())).slice(0, 10)
    : []), [q, products]);

  const add = (p: Product) => {
    setRows((r) => r.some((x) => x.p.id === p.id) ? r.map((x) => x.p.id === p.id ? { ...x, count: x.count + 1 } : x) : [...r, { p, count: 1 }]);
    setQ('');
  };

  const dims = { small: [38, 22, 9], medium: [50, 30, 11], large: [70, 40, 13] }[size] as number[];

  const buildHTML = () => {
    const cells = rows.flatMap(({ p, count }) => Array.from({ length: count }, () => `
      <div class="lbl">
        ${s.labelShowName ? `<div class="nm">${p.name}</div>` : ''}
        <div class="pr">${money(p.price, s.currency)}${s.labelShowMrp && p.mrp && p.mrp > p.price ? ` <span class="mrp">MRP ${money(p.mrp, s.currency)}</span>` : ''}</div>
        <div class="bc">${code128SVG(p.barcode || p.sku, { height: 26, scale: 1.05, showText: true })}</div>
        <div class="sh">${s.shopName}</div>
      </div>`));
    return `<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>
      @page{size:A4;margin:8mm}
      body{margin:0;font-family:system-ui,sans-serif;color:#000}
      .sheet{display:grid;grid-template-columns:repeat(${s.labelColumns}, 1fr);gap:3mm}
      .lbl{border:1px dashed #999;border-radius:3px;padding:2mm;height:${dims[1]}mm;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
      .nm{font-size:${dims[2] - 2}px;font-weight:600;line-height:1.15;max-height:2.4em;overflow:hidden}
      .pr{font-size:${dims[2] + 4}px;font-weight:800}
      .mrp{font-size:${dims[2] - 3}px;font-weight:500;text-decoration:line-through;color:#555}
      .bc svg{width:100%;height:auto}
      .sh{font-size:7px;color:#555;text-align:center}
    </style></head><body><div class="sheet">${cells.join('')}</div></body></html>`;
  };

  const total = rows.reduce((t, r) => t + r.count, 0);

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle title="Barcode & price labels" sub={`Print shelf tags or product stickers for any ${terms.product.toLowerCase()} — Code128, offline.`}
          right={<Tag size={16} className="text-ink3" />} />
        <div className="flex flex-wrap gap-2">
          <SearchBar value={q} onChange={setQ} placeholder={`Search ${terms.products.toLowerCase()} to add…`} />
          <Select className="w-auto" value={size} onChange={(e) => setSize(e.target.value as any)}>
            <option value="small">Small 38×22mm</option><option value="medium">Medium 50×30mm</option><option value="large">Large 70×40mm</option>
          </Select>
          <Field label=""><Input inputMode="numeric" className="w-24" value={s.labelColumns} onChange={(e) => s.set({ labelColumns: Math.min(6, Math.max(1, +e.target.value || 3)) })} /></Field>
          <button className="btn-primary" disabled={!rows.length} onClick={() => { printHTML(buildHTML(), 1); toast(`${total} labels sent to printer`); }}><Printer size={16} /> Print {total || ''}</button>
        </div>
        {matches.length > 0 && (
          <div className="mt-2 space-y-1">
            {matches.map((p: Product) => (
              <button key={p.id} className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-xs hover:border-brand/50" onClick={() => add(p)}>
                <span className="flex-1 truncate text-ink">{p.name}</span>
                <span className="font-mono text-ink3">{money(p.price, s.currency)}</span>
                <Plus size={13} className="text-brand" />
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="chip" onClick={() => setRows(products.slice(0, 30).map((p: Product) => ({ p, count: 1 })))}>Add first 30</button>
          <button className="chip" onClick={() => setRows(products.filter((p: Product) => p.favorite).map((p: Product) => ({ p, count: 1 })))}>All favourites</button>
          <button className="chip border-bad/40 text-bad" onClick={() => setRows([])}>Clear list</button>
        </div>
        <div className="mt-3 space-y-2">
          <Toggle checked={s.labelShowName} onChange={(v) => s.set({ labelShowName: v })} label="Show product name" />
          <Toggle checked={s.labelShowMrp} onChange={(v) => s.set({ labelShowMrp: v })} label="Show struck-through MRP" />
        </div>
      </Card>

      {rows.length === 0 ? <Empty title="No labels queued" sub="Search for products above and add them to the print sheet." icon={<Tag size={26} />} /> : (
        <Card pad={false}>
          <div className="divide-y divide-line">
            {rows.map(({ p, count }) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.name}</span>
                <span className="hidden font-mono text-xs text-ink3 sm:block">{p.barcode || p.sku}</span>
                <div className="flex items-center gap-1">
                  <button className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink2" onClick={() => setRows((r) => r.map((x) => x.p.id === p.id ? { ...x, count: Math.max(1, x.count - 1) } : x))}><Minus size={12} /></button>
                  <span className="w-8 text-center font-mono text-xs text-ink">{count}</span>
                  <button className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink2" onClick={() => setRows((r) => r.map((x) => x.p.id === p.id ? { ...x, count: x.count + 1 } : x))}><Plus size={12} /></button>
                </div>
                <button className="text-ink3 hover:text-bad" onClick={() => setRows((r) => r.filter((x) => x.p.id !== p.id))}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="border-t border-line p-3">
            <p className="label">Preview</p>
            <div className="grid gap-2 rounded-xl bg-white p-3" style={{ gridTemplateColumns: `repeat(${Math.min(s.labelColumns, 4)}, minmax(0,1fr))` }}>
              {rows.slice(0, 8).map(({ p }) => (
                <div key={p.id} className="rounded border border-dashed border-black/30 p-1.5 text-black">
                  {s.labelShowName && <p className="line-clamp-2 text-[9px] font-semibold leading-tight">{p.name}</p>}
                  <p className="text-[13px] font-extrabold">{money(p.price, s.currency)}</p>
                  <img src={'data:image/svg+xml;utf8,' + encodeURIComponent(code128SVG(p.barcode || p.sku, { height: 22, scale: 1, showText: true }))} className="w-full" alt="" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
