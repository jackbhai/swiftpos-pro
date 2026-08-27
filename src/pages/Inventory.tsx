import { useMemo, useState } from 'react';
import {
  Plus, Filter, Download, Upload, Star, Pencil, Trash2, PackagePlus, ArrowUpDown,
  AlertTriangle, CalendarClock, Boxes, Search, Grid3x3, List, ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProducts, useVendors, useStockLogs } from '@/hooks/useData';
import { db, uid, addStockLog, logActivity } from '@/db/db';
import { money, moneyShort, num, cx, dt } from '@/lib/format';
import { stockState, expiryState, fuzzyScore } from '@/lib/calc';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Field, Input, Select, Empty, SearchBar, Badge, Tabs, Toggle, ConfirmBtn } from '@/components/ui';
import { useSettings, useShop } from '@/store/settings';
import { toast } from '@/store/ui';
import type { Product } from '@/db/types';

type SortKey = 'name' | 'stock' | 'price' | 'value' | 'updated';

const blank = (gst: number): Product => ({
  id: '', name: '', sku: '', barcode: '', category: 'General', unit: 'pc', cost: 0, price: 0, mrp: 0,
  stock: 0, lowStock: 10, gst, active: true, trackStock: true, createdAt: Date.now(), updatedAt: Date.now(),
});

export default function Inventory() {
  const products = useProducts() || [];
  const vendors = useVendors() || [];
  const logs = useStockLogs() || [];
  const s = useSettings();
  const { terms, modules } = useShop();

  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState<SortKey>('name');
  const [asc, setAsc] = useState(true);
  const [edit, setEdit] = useState<Product | null>(null);
  const [adjust, setAdjust] = useState<Product | null>(null);
  const [limit, setLimit] = useState(50);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [logsOpen, setLogsOpen] = useState(false);

  const categories = useMemo(() => ['All', ...new Set(products.map((p: Product) => p.category))].slice(0, 60), [products]);

  const filtered = useMemo(() => {
    let list = [...products] as Product[];
    if (tab === 'low') list = list.filter((p) => stockState(p) === 'low');
    if (tab === 'out') list = list.filter((p) => stockState(p) === 'out');
    if (tab === 'expiry') list = list.filter((p) => ['soon', 'expired'].includes(expiryState(p, s.expiryAlertDays) as string));
    if (tab === 'fav') list = list.filter((p) => p.favorite);
    if (tab === 'inactive') list = list.filter((p) => !p.active);
    if (cat !== 'All') list = list.filter((p) => p.category === cat);
    if (q.trim()) list = list.map((p) => ({ p, s: Math.max(fuzzyScore(q, p.name), fuzzyScore(q, p.sku), p.barcode ? fuzzyScore(q, p.barcode) : 0, p.brand ? fuzzyScore(q, p.brand) : 0) }))
      .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.p);
    const dir = asc ? 1 : -1;
    if (!q.trim()) list.sort((a, b) => {
      switch (sort) {
        case 'stock': return (a.stock - b.stock) * dir;
        case 'price': return (a.price - b.price) * dir;
        case 'value': return (a.stock * a.cost - b.stock * b.cost) * dir;
        case 'updated': return (a.updatedAt - b.updatedAt) * dir;
        default: return a.name.localeCompare(b.name) * dir;
      }
    });
    return list;
  }, [products, q, tab, cat, sort, asc, s.expiryAlertDays]);

  const stockValue = products.reduce((t: number, p: Product) => t + p.cost * p.stock, 0);
  const retailValue = products.reduce((t: number, p: Product) => t + p.price * p.stock, 0);
  const lowCount = products.filter((p: Product) => stockState(p) === 'low').length;
  const outCount = products.filter((p: Product) => stockState(p) === 'out').length;

  const save = async (p: Product) => {
    if (!p.name.trim()) return toast('Name is required', 'err');
    const rec = { ...p, updatedAt: Date.now(), sku: p.sku || 'SKU' + Date.now().toString().slice(-6) };
    if (p.id) { await db.products.put(rec); toast(`${terms.product} updated`); }
    else { rec.id = uid('p_'); await db.products.add(rec); await logActivity('product', `Added ${rec.name}`); toast(`${terms.product} added`); }
    setEdit(null);
  };

  const exportAll = () => downloadCSV(`inventory-${Date.now()}.csv`, filtered.map((p) => ({
    name: p.name, sku: p.sku, barcode: p.barcode ?? '', brand: p.brand ?? '', category: p.category,
    unit: p.unit, cost: p.cost, price: p.price, mrp: p.mrp ?? '', stock: p.stock, low_stock: p.lowStock,
    gst: p.gst, hsn: p.hsn ?? '', batch: p.batch ?? '', expiry: p.expiry ?? '', rack: p.rack ?? '',
    stock_value: +(p.cost * p.stock).toFixed(2),
  })));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={terms.products} value={num(products.length)} icon={<Boxes size={16} />} sub={`${products.filter((p: Product) => p.active).length} active`} />
        <Stat label="Stock value" value={moneyShort(stockValue, s.currency)} icon={<PackagePlus size={16} />} sub={`Retail ${moneyShort(retailValue, s.currency)}`} tone="ok" />
        <Stat label="Low stock" value={lowCount} tone="warn" icon={<AlertTriangle size={16} />} />
        <Stat label="Out of stock" value={outCount} tone="bad" icon={<CalendarClock size={16} />} />
      </div>

      <Card pad={false} className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar value={q} onChange={setQ} placeholder={`Search ${terms.products.toLowerCase()}…`} />
          <button className="btn-primary" onClick={() => setEdit(blank(s.defaultGst))}><Plus size={16} /> Add</button>
          <Link className="btn-ghost" to="/settings?tab=json"><Upload size={15} /> Import</Link>
          <button className="btn-ghost" onClick={exportAll}><Download size={15} /> CSV</button>
          <button className="btn-ghost" onClick={() => setLogsOpen(true)}><ArrowUpDown size={15} /> Stock log</button>
          <button className="btn-ghost px-3" onClick={() => setView(view === 'list' ? 'grid' : 'list')}>{view === 'list' ? <Grid3x3 size={15} /> : <List size={15} />}</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Tabs active={tab} onChange={setTab} tabs={[
            { id: 'all', label: 'All', count: products.length },
            { id: 'low', label: 'Low', count: lowCount },
            { id: 'out', label: 'Out', count: outCount },
            { id: 'expiry', label: 'Expiring' },
            { id: 'fav', label: 'Favourites' },
            { id: 'inactive', label: 'Inactive' },
          ]} />
          <select className="input w-auto py-1.5 text-xs" value={cat} onChange={(e) => setCat(e.target.value)}>
            {categories.map((c: string) => <option key={c}>{c}</option>)}
          </select>
          <select className="input w-auto py-1.5 text-xs" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="name">Name</option><option value="stock">Stock</option><option value="price">Price</option>
            <option value="value">Stock value</option><option value="updated">Updated</option>
          </select>
          <button className="btn-ghost px-2 py-1.5" onClick={() => setAsc(!asc)}><ArrowUpDown size={14} /> {asc ? 'Asc' : 'Desc'}</button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Empty title={`No ${terms.products.toLowerCase()} match`} sub="Adjust filters or import a catalogue." action={<Link className="btn-primary mt-2" to="/settings?tab=json"><Upload size={15} /> Import JSON</Link>} />
      ) : view === 'list' ? (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-line"><tr>
                <th className="th">{terms.product}</th><th className="th">Category</th><th className="th text-right">Cost</th>
                <th className="th text-right">Price</th><th className="th text-right">Margin</th><th className="th text-right">{terms.stock}</th>
                <th className="th text-right">Value</th><th className="th"></th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {filtered.slice(0, limit).map((p) => {
                  const st = stockState(p); const ex = expiryState(p, s.expiryAlertDays);
                  const margin = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0;
                  return (
                    <tr key={p.id} className="hover:bg-surface2/50">
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <button onClick={() => db.products.update(p.id, { favorite: !p.favorite })}>
                            <Star size={13} className={p.favorite ? 'fill-warn text-warn' : 'text-ink3'} />
                          </button>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                            <p className="text-[11px] text-ink3">{p.sku}{p.brand ? ' · ' + p.brand : ''}{p.batch ? ' · B:' + p.batch : ''}</p>
                          </div>
                          {ex === 'expired' && <Badge tone="bad">expired</Badge>}
                          {ex === 'soon' && <Badge tone="warn">expiring</Badge>}
                        </div>
                      </td>
                      <td className="td text-xs">{p.category}</td>
                      <td className="td text-right font-mono">{money(p.cost, s.currency)}</td>
                      <td className="td text-right font-mono text-ink">{money(p.price, s.currency)}</td>
                      <td className={cx('td text-right font-mono', margin < 10 ? 'text-bad' : margin < 25 ? 'text-warn' : 'text-ok')}>{margin.toFixed(0)}%</td>
                      <td className="td text-right">
                        <button onClick={() => setAdjust(p)} className={cx('font-mono font-bold', st === 'out' ? 'text-bad' : st === 'low' ? 'text-warn' : 'text-ink')}>{p.stock} {p.unit}</button>
                      </td>
                      <td className="td text-right font-mono">{moneyShort(p.stock * p.cost, s.currency)}</td>
                      <td className="td">
                        <div className="flex justify-end gap-1">
                          <button className="rounded-lg p-1.5 text-ink3 hover:text-brand" onClick={() => setEdit(p)}><Pencil size={14} /></button>
                          <button className="rounded-lg p-1.5 text-ink3 hover:text-bad" onClick={async () => { await db.products.delete(p.id); toast('Deleted'); }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.slice(0, limit).map((p) => (
            <button key={p.id} onClick={() => setEdit(p)} className="card card-hover p-3 text-left">
              <p className="line-clamp-2 min-h-[34px] text-xs font-semibold text-ink">{p.name}</p>
              <p className="mt-1 font-mono text-sm font-bold text-brand">{money(p.price, s.currency)}</p>
              <p className={cx('text-[11px] font-bold', stockState(p) === 'out' ? 'text-bad' : stockState(p) === 'low' ? 'text-warn' : 'text-ink3')}>{p.stock} {p.unit} in stock</p>
            </button>
          ))}
        </div>
      )}

      {filtered.length > limit && (
        <button className="btn-ghost w-full" onClick={() => setLimit((l) => l + 100)}><ChevronDown size={15} /> Load more ({num(filtered.length - limit)} left)</button>
      )}

      <ProductEditor product={edit} onClose={() => setEdit(null)} onSave={save} vendors={vendors} modules={modules} terms={terms} />
      <AdjustModal product={adjust} onClose={() => setAdjust(null)} />
      <Modal open={logsOpen} onClose={() => setLogsOpen(false)} title="Stock movement log" wide>
        <div className="space-y-1.5">
          {logs.length === 0 && <Empty title="No movements yet" />}
          {logs.slice(0, 120).map((l: any) => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-xs">
              <Badge tone={l.qty > 0 ? 'ok' : 'bad'}>{l.type}</Badge>
              <span className="min-w-0 flex-1 truncate text-ink">{l.productName}</span>
              <span className="font-mono text-ink2">{l.before} → {l.after}</span>
              <span className="shrink-0 text-ink3">{dt(l.ts)}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function ProductEditor({ product, onClose, onSave, vendors, modules, terms }: any) {
  const [f, setF] = useState<Product | null>(product);
  const s = useSettings();
  const { profile } = useShop();
  useMemo(() => setF(product), [product]);
  if (!f) return null;
  const up = (k: keyof Product, v: any) => setF({ ...f, [k]: v } as Product);
  const margin = f.price > 0 ? ((f.price - f.cost) / f.price) * 100 : 0;

  return (
    <Modal open={!!product} onClose={onClose} wide title={f.id ? `Edit ${terms.product.toLowerCase()}` : `New ${terms.product.toLowerCase()}`}
      footer={<div className="flex gap-2"><button className="btn-ghost flex-1" onClick={onClose}>Cancel</button><button className="btn-primary flex-1" onClick={() => onSave(f)}>Save</button></div>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => up('name', e.target.value)} autoFocus /></Field>
        <Field label="Category">
          <Input list="cats" value={f.category} onChange={(e) => up('category', e.target.value)} />
          <datalist id="cats">{profile.categories.map((c: string) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Brand"><Input value={f.brand ?? ''} onChange={(e) => up('brand', e.target.value)} /></Field>
        <Field label="SKU"><Input value={f.sku} onChange={(e) => up('sku', e.target.value)} /></Field>
        <Field label="Barcode"><Input value={f.barcode ?? ''} onChange={(e) => up('barcode', e.target.value)} /></Field>
        <Field label="Cost price"><Input inputMode="decimal" value={f.cost} onChange={(e) => up('cost', +e.target.value || 0)} /></Field>
        <Field label={`Selling price · margin ${margin.toFixed(0)}%`}><Input inputMode="decimal" value={f.price} onChange={(e) => up('price', +e.target.value || 0)} /></Field>
        <Field label="MRP"><Input inputMode="decimal" value={f.mrp ?? 0} onChange={(e) => up('mrp', +e.target.value || 0)} /></Field>
        <Field label="GST %"><Input inputMode="decimal" value={f.gst} onChange={(e) => up('gst', +e.target.value || 0)} /></Field>
        <Field label={terms.stock}><Input inputMode="decimal" value={f.stock} onChange={(e) => up('stock', +e.target.value || 0)} /></Field>
        <Field label="Low stock alert at"><Input inputMode="decimal" value={f.lowStock} onChange={(e) => up('lowStock', +e.target.value || 0)} /></Field>
        <Field label="Unit">
          <Select value={f.unit} onChange={(e) => up('unit', e.target.value)}>
            {[...new Set([...profile.units, 'pc', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'dozen'])].map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
        </Field>
        <Field label="HSN / SAC"><Input value={f.hsn ?? ''} onChange={(e) => up('hsn', e.target.value)} /></Field>
        <Field label={terms.vendor}>
          <Select value={f.vendorId ?? ''} onChange={(e) => up('vendorId', e.target.value)}>
            <option value="">—</option>{vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        </Field>
        {modules.batchExpiry && <>
          <Field label="Batch no."><Input value={f.batch ?? ''} onChange={(e) => up('batch', e.target.value)} /></Field>
          <Field label="Expiry date"><Input type="date" value={f.expiry ?? ''} onChange={(e) => up('expiry', e.target.value)} /></Field>
        </>}
        <Field label="Rack / shelf"><Input value={f.rack ?? ''} onChange={(e) => up('rack', e.target.value)} /></Field>
        <Field label="Emoji / icon"><Input value={f.image ?? ''} onChange={(e) => up('image', e.target.value)} placeholder="📦" /></Field>
        <div className="space-y-2 sm:col-span-2">
          <Toggle checked={f.active} onChange={(v) => up('active', v)} label="Active" hint="Show in billing screen" />
          <Toggle checked={f.trackStock} onChange={(v) => up('trackStock', v)} label="Track stock" hint="Deduct quantity on every sale" />
          <Toggle checked={!!f.favorite} onChange={(v) => up('favorite', v)} label="Favourite" hint="Pin to quick-access row" />
        </div>
      </div>
    </Modal>
  );
}

function AdjustModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [qty, setQty] = useState('');
  const [type, setType] = useState<'purchase' | 'adjust' | 'damage' | 'return'>('purchase');
  if (!product) return null;
  const apply = async (sign: number) => {
    const n = parseFloat(qty) || 0;
    if (!n) return toast('Enter a quantity', 'err');
    const after = +(product.stock + sign * n).toFixed(3);
    await db.products.update(product.id, { stock: after, updatedAt: Date.now() });
    await addStockLog(product.id, product.name, type, sign * n, product.stock, after, 'manual');
    toast(`Stock updated → ${after}`); setQty(''); onClose();
  };
  return (
    <Modal open={!!product} onClose={onClose} title={`Adjust stock · ${product.name}`}>
      <p className="mb-3 text-center font-mono text-3xl font-extrabold text-brand">{product.stock} <span className="text-sm text-ink3">{product.unit}</span></p>
      <Field label="Quantity"><Input inputMode="decimal" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
      <div className="mt-2 flex flex-wrap gap-1.5">{[1, 5, 10, 25, 50, 100].map((n) => <button key={n} className="chip" onClick={() => setQty(String(n))}>+{n}</button>)}</div>
      <Field label="Reason" className="mt-3">
        <Select value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="purchase">Purchase / restock</option><option value="adjust">Manual correction</option>
          <option value="damage">Damage / expiry</option><option value="return">Customer return</option>
        </Select>
      </Field>
      <div className="mt-4 flex gap-2">
        <button className="btn-danger flex-1" onClick={() => apply(-1)}>− Remove</button>
        <button className="btn-primary flex-1" onClick={() => apply(1)}>+ Add</button>
      </div>
    </Modal>
  );
}
