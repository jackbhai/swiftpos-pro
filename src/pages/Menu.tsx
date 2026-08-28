import { useEffect, useMemo, useState } from 'react';
import { BookOpen, QrCode, Printer, Download, MessageCircle, Star } from 'lucide-react';
import { useCatalog, useDebounced, searchProducts } from '@/hooks/useCatalog';
import { useSettings } from '@/store/settings';
import { money, num, cx } from '@/lib/format';
import { download } from '@/lib/csv';
import { qrDataUrl } from '@/lib/upi';
import { printHTML, waLink } from '@/lib/receipt';
import { Card, Stat, Empty, Badge, Input, Select, SearchBar, SectionTitle, Toggle, Tabs } from '@/components/ui';
import { toast } from '@/store/ui';

/** Digital menu / catalogue — build a shareable QR menu or printable price card from your stock. */
export default function Menu() {
  const { products } = useCatalog();
  const s = useSettings();
  const [tab, setTab] = useState<'build' | 'qr'>('build');
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 150);
  const [cat, setCat] = useState('');
  const [cols, setCols] = useState(2);
  const [showImages, setShowImages] = useState(false);
  const [hideOut, setHideOut] = useState(true);
  const [onlyFav, setOnlyFav] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState(location.origin + location.pathname);
  const [qr, setQr] = useState('');

  const cats = useMemo(() => [...new Set<string>((products as any[]).map((p) => p.category).filter(Boolean))].sort(), [products]);

  const items = useMemo(() => {
    let list: any[] = products as any[];
    if (dq.trim()) list = searchProducts(list as any, dq, 500) as any[];
    if (cat) list = list.filter((p) => p.category === cat);
    if (hideOut) list = list.filter((p) => !p.trackStock || p.stock > 0);
    if (onlyFav) list = list.filter((p) => p.favorite);
    return list.slice(0, 400);
  }, [products, dq, cat, hideOut, onlyFav]);

  const grouped = useMemo(() => {
    const m = new Map<string, any[]>();
    items.forEach((p) => m.set(p.category || 'Other', [...(m.get(p.category || 'Other') || []), p]));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  useEffect(() => { qrDataUrl(url, 320).then(setQr).catch(() => setQr('')); }, [url]);

  const menuHTML = () => {
    const head = title || s.shopName;
    const body = grouped.map(([c, list]) => `
      <section><h2>${esc(c)}</h2><div class="grid" style="--c:${cols}">
        ${list.map((p) => `<div class="it">
          <div class="n">${esc(p.name)}${p.brand ? `<span class="b"> · ${esc(p.brand)}</span>` : ''}</div>
          <div class="p">${money(p.price, s.currency)}<span class="u"> /${esc(p.unit)}</span></div>
        </div>`).join('')}
      </div></section>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(head)} — Menu</title><style>
*{box-sizing:border-box}body{margin:0;background:#000;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:18px}
header{text-align:center;border-bottom:1px solid #222;padding-bottom:12px;margin-bottom:14px}
h1{margin:0;font-size:24px;letter-spacing:-.5px}.sub{color:#888;font-size:12px;margin-top:4px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:1.4px;color:#22d3a5;margin:18px 0 8px}
.grid{display:grid;grid-template-columns:repeat(var(--c),minmax(0,1fr));gap:8px}
.it{display:flex;justify-content:space-between;gap:10px;border:1px solid #1c1c1c;border-radius:12px;padding:9px 11px;background:#0a0a0a}
.n{font-size:13px;min-width:0}.b{color:#666;font-size:11px}.p{font-weight:800;white-space:nowrap;font-size:13px}
.u{color:#666;font-weight:400;font-size:10px}
footer{margin-top:22px;text-align:center;color:#666;font-size:11px;border-top:1px solid #222;padding-top:12px}
@media print{body{background:#fff;color:#000}.it{background:#fff;border-color:#ddd}h2{color:#000}footer,header{border-color:#ccc}}
@media(max-width:600px){.grid{grid-template-columns:1fr}}
</style></head><body>
<header><h1>${esc(head)}</h1><div class="sub">${esc(s.address || '')} ${s.phone ? '· ' + esc(s.phone) : ''}</div></header>
${body}
<footer>${num(items.length)} items · prices inclusive of taxes where applicable · powered by SwiftPOS Pro</footer>
</body></html>`;
  };

  const textMenu = () => [`*${title || s.shopName}*`, '', ...grouped.map(([c, list]) =>
    [`*${c}*`, ...list.slice(0, 40).map((p) => `• ${p.name} — ${money(p.price, s.currency)}`)].join('\n')).slice(0, 12), '',
    s.phone ? `Order: ${s.phone}` : ''].join('\n');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Items on menu" value={num(items.length)} tone="brand" icon={<BookOpen size={16} />} />
        <Stat label="Sections" value={num(grouped.length)} tone="ok" />
        <Stat label="Catalogue size" value={num(products.length)} tone="ok" />
        <Stat label="Favourites" value={num((products as any[]).filter((p) => p.favorite).length)} tone="warn" icon={<Star size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Digital menu & QR catalogue" sub="Apne stock se hi menu/price-list banaiye — print, WhatsApp ya QR se share"
          right={<div className="flex flex-wrap gap-2">
            <button className="btn-soft" onClick={() => window.open(waLink('', textMenu()), '_blank')}><MessageCircle size={15} /> WhatsApp</button>
            <button className="btn-soft" onClick={() => download(`menu-${Date.now()}.html`, menuHTML(), 'text/html')}><Download size={15} /> Download HTML</button>
            <button className="btn-primary" onClick={() => { printHTML(menuHTML()); toast('Print dialog khul raha hai'); }}><Printer size={15} /> Print menu</button>
          </div>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[{ id: 'build', label: 'Build menu' }, { id: 'qr', label: 'QR code' }]} />
      </Card>

      {tab === 'build' && (
        <>
          <Card>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs text-ink3">Menu title<Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={s.shopName} /></label>
              <label className="text-xs text-ink3">Section / category
                <Select className="mt-1" value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="">All categories</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select></label>
              <label className="text-xs text-ink3">Columns
                <Select className="mt-1" value={cols} onChange={(e) => setCols(+e.target.value)}>
                  <option value={1}>1 column</option><option value={2}>2 columns</option><option value={3}>3 columns</option>
                </Select></label>
              <div className="flex flex-col justify-end gap-1.5">
                <Toggle checked={hideOut} onChange={setHideOut} label="Hide out-of-stock" />
                <Toggle checked={onlyFav} onChange={setOnlyFav} label="Only favourites" />
                <Toggle checked={showImages} onChange={setShowImages} label="Show item codes" />
              </div>
            </div>
            <div className="mt-3"><SearchBar value={q} onChange={setQ} placeholder="Filter items for the menu…" /></div>
          </Card>

          {grouped.length === 0 ? <Empty title="No items match" icon={<BookOpen size={22} />} /> : (
            <Card>
              <p className="mb-2 text-[11px] uppercase tracking-widest text-ink3">Live preview</p>
              <div className="rounded-xl border border-line bg-black p-4">
                <div className="border-b border-line pb-2 text-center">
                  <p className="text-lg font-extrabold text-ink">{title || s.shopName}</p>
                  <p className="text-[11px] text-ink3">{s.address} {s.phone ? '· ' + s.phone : ''}</p>
                </div>
                {grouped.map(([c, list]) => (
                  <div key={c} className="mt-3">
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-brand">{c}</p>
                    <div className={cx('grid gap-1.5', cols === 1 ? 'grid-cols-1' : cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
                      {list.slice(0, 60).map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-1.5">
                          <span className="min-w-0 truncate text-xs text-ink">{p.name}{showImages && p.barcode ? <span className="text-ink3"> · {p.barcode}</span> : ''}</span>
                          <span className="whitespace-nowrap font-mono text-xs font-bold text-ink">{money(p.price, s.currency)}</span>
                        </div>
                      ))}
                    </div>
                    {list.length > 60 && <p className="mt-1 text-[10px] text-ink3">+{list.length - 60} more items in the exported menu</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'qr' && (
        <Card>
          <SectionTitle title="Menu QR code" sub="Table par chipka dijiye — customer scan karke menu dekh lega" />
          <label className="text-xs text-ink3">Link the QR should open
            <Input className="mt-1" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {qr && <div className="rounded-xl bg-white p-3 text-center"><img src={qr} alt="Menu QR" className="h-52 w-52" /><p className="mt-1 text-[11px] font-bold text-black">{title || s.shopName}</p></div>}
            <div className="space-y-2 text-xs text-ink3">
              <Badge tone="brand"><QrCode size={10} /> 320px PNG</Badge>
              <p>1. Menu HTML download karke apni website / Google Drive par daaliye.</p>
              <p>2. Us link ko upar paste kijiye — QR turant update ho jaega.</p>
              <p>3. Print karke table tent ya counter par lagaiye.</p>
              <div className="flex gap-2 pt-1">
                <button className="btn-soft" onClick={() => qr && download('menu-qr.png', dataUrlToBlob(qr), 'image/png')}><Download size={15} /> Save QR</button>
                <button className="btn-soft" onClick={() => printHTML(`<div style="text-align:center;font-family:system-ui;padding:40px">
                  <h1 style="margin:0">${esc(title || s.shopName)}</h1><p style="color:#666">Scan for menu</p>
                  <img src="${qr}" style="width:320px;height:320px"/><p style="color:#666;font-size:12px">${esc(s.phone || '')}</p></div>`)}><Printer size={15} /> Print table tent</button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

const esc = (x: string) => String(x || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
function dataUrlToBlob(u: string) {
  const [meta, b64] = u.split(',');
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: meta.split(':')[1].split(';')[0] });
}
