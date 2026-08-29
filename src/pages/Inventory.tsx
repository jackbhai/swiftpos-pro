import { useMemo, useState } from 'react';
import {
  Plus, Filter, Download, Upload, Star, Pencil, Trash2, PackagePlus, ArrowUpDown,
  AlertTriangle, CalendarClock, Boxes, Search, Grid3x3, List, ChevronDown, Camera, Image as ImageIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVendors, useStockLogs } from '@/hooks/useData';
import { useCatalog, useDebounced, searchProducts } from '@/hooks/useCatalog';
import { VirtualList } from '@/components/ui/Virtual';
import { db, uid, addStockLog, logActivity } from '@/db/db';
import { money, moneyShort, num, cx, dt } from '@/lib/format';
import { stockState, expiryState, fuzzyScore } from '@/lib/calc';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Field, Input, Select, Empty, SearchBar, Badge, Tabs, Toggle, ConfirmBtn } from '@/components/ui';
import { useSettings, useShop } from '@/store/settings';
import { toast, toastUndo } from '@/store/ui';
import ProductImage from '@/components/ui/ProductImage';
import ImagePickerModal from '@/components/ui/ImagePickerModal';
import type { Product } from '@/db/types';

type SortKey = 'name' | 'stock' | 'price' | 'value' | 'updated';

const blank = (gst: number): Product => ({
  id: '', name: '', sku: '', barcode: '', category: 'General', unit: 'pc', cost: 0, price: 0, mrp: 0,
  stock: 0, lowStock: 10, gst, active: true, trackStock: true, createdAt: Date.now(), updatedAt: Date.now(),
});

export default function Inventory() {
  const { products, loading } = useCatalog();
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const dq = useDebounced(q, 160);

  const categories = useMemo(() => ['All', ...new Set(products.map((p: Product) => p.category))].slice(0, 60), [products]);

  const filtered = useMemo(() => {
    let list = [...products] as Product[];
    if (tab === 'low') list = list.filter((p) => stockState(p) === 'low');
    if (tab === 'out') list = list.filter((p) => stockState(p) === 'out');
    if (tab === 'expiry') list = list.filter((p) => ['soon', 'expired'].includes(expiryState(p, s.expiryAlertDays) as string));
    if (tab === 'fav') list = list.filter((p) => p.favorite);
    if (tab === 'inactive') list = list.filter((p) => !p.active);
    if (cat !== 'All') list = list.filter((p) => p.category === cat);
    if (dq.trim()) return searchProducts(list as any, dq, 600) as any[];
    const dir = asc ? 1 : -1;
    {
      list.sort((a, b) => {
        switch (sort) {
          case 'stock': return (a.stock - b.stock) * dir;
          case 'price': return (a.price - b.price) * dir;
          case 'value': return (a.stock * a.cost - b.stock * b.cost) * dir;
          case 'updated': return (a.updatedAt - b.updatedAt) * dir;
          default: return a.name.localeCompare(b.name) * dir;
        }
      });
    }
    return list;
  }, [products, dq, tab, cat, sort, asc, s.expiryAlertDays]);

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

      {loading ? <div className="grid h-64 place-items-center text-ink3">Indexing catalogue…</div>
      : filtered.length === 0 ? (
        <Empty title={`No ${terms.products.toLowerCase()} match`} sub="Adjust filters or import a catalogue." action={<Link className="btn-primary mt-2" to="/settings?tab=json"><Upload size={15} /> Import JSON</Link>} />
      ) : (
        <Card pad={false}>
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-2.5">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-ink2">
              <input type="checkbox" className="h-4 w-4 accent-cyan-400"
                checked={selected.size > 0 && selected.size >= Math.min(filtered.length, 500)}
                onChange={(e) => setSelected(e.target.checked ? new Set(filtered.slice(0, 500).map((p) => p.id)) : new Set())} />
              Select {filtered.length > 500 ? 'first 500' : 'all'}
            </label>
            <span className="text-[11px] text-ink3">{num(filtered.length)} shown · {selected.size} selected</span>
            {selected.size > 0 && <>
              <button className="btn-soft ml-auto px-2 py-1 text-xs" onClick={() => setBulkOpen(true)}><Pencil size={13} /> Bulk edit</button>
              <button className="btn-ghost px-2 py-1 text-xs" onClick={async () => {
                const ids = [...selected];
                const backup = (await db.products.bulkGet(ids)).filter(Boolean) as any[];
                await db.products.bulkDelete(ids);
                setSelected(new Set());
                toastUndo(`${ids.length} deleted`, async () => { await db.products.bulkPut(backup); toast('Restored'); });
              }}><Trash2 size={13} /> Delete</button>
            </>}
          </div>
          <VirtualList
            items={filtered}
            rowHeight={view === 'list' ? 62 : 180}
            columns={view === 'list' ? 1 : (typeof window !== 'undefined' && window.innerWidth > 1024 ? 5 : 2)}
            gap={view === 'list' ? 0 : 10}
            height="calc(100dvh - 330px)"
            className={view === 'grid' ? 'p-3' : ''}
            render={(p: any) => view === 'list' ? (
              <InvRow p={p} currency={s.currency} expiryDays={s.expiryAlertDays} hideCost={s.hideCostPrices}
                checked={selected.has(p.id)}
                onCheck={(v: boolean) => setSelected((prev) => { const n = new Set(prev); v ? n.add(p.id) : n.delete(p.id); return n; })}
                onEdit={() => setEdit(p)} onAdjust={() => setAdjust(p)}
                onFav={() => db.products.update(p.id, { favorite: !p.favorite })}
                onDelete={async () => {
                  const backup = await db.products.get(p.id);
                  await db.products.delete(p.id);
                  toastUndo(`${p.name} deleted`, async () => { if (backup) { await db.products.put(backup); toast('Restored'); } });
                }} />
            ) : (
              <button onClick={() => setEdit(p)} className="card card-hover h-full w-full p-2.5 text-left flex flex-col justify-between overflow-hidden">
                <div className="w-full">
                  <div className="h-16 w-full overflow-hidden rounded-xl bg-surface2/60 border border-line/50 mb-1.5 flex items-center justify-center">
                    <ProductImage src={p.image} alt={p.name} emojiClassName="text-3xl" />
                  </div>
                  <p className="line-clamp-2 text-xs font-bold text-ink leading-tight">{p.name}</p>
                  <p className="text-[10px] text-ink3 truncate mt-0.5">{p.category}{p.brand ? ' · ' + p.brand : ''}</p>
                </div>
                <div className="mt-1 pt-1 border-t border-line/40 flex items-end justify-between w-full">
                  <span className="font-mono text-xs sm:text-sm font-extrabold text-brand">{money(p.price, s.currency)}</span>
                  <span className={cx('text-[10px] font-bold', stockState(p) === 'out' ? 'text-bad' : stockState(p) === 'low' ? 'text-warn' : 'text-ink2')}>{p.stock} {p.unit}</span>
                </div>
              </button>
            )}
          />
        </Card>
      )}

      <BulkEdit open={bulkOpen} onClose={() => setBulkOpen(false)} ids={[...selected]} onDone={() => { setSelected(new Set()); setBulkOpen(false); }} />

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
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const s = useSettings();
  const { profile } = useShop();

  useMemo(() => setF(product), [product]);
  if (!f) return null;

  const up = (k: keyof Product, v: any) => setF({ ...f, [k]: v } as Product);
  const margin = f.price > 0 ? ((f.price - f.cost) / f.price) * 100 : 0;

  return (
    <>
      <Modal
        open={!!product}
        onClose={onClose}
        wide
        title={f.id ? `Edit ${terms.product}` : `New ${terms.product}`}
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={() => onSave(f)}>
              Save {terms.product}
            </button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Product Image Selector Card */}
          <div className="sm:col-span-2 rounded-2xl border border-line bg-surface2/40 p-3.5 flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-brand/40 bg-surface shadow-sm flex items-center justify-center">
              <ProductImage src={f.image} alt={f.name} emojiClassName="text-3xl" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink">Product Image / Photo</p>
              <p className="text-[11px] text-ink3 truncate mt-0.5">
                {f.image
                  ? f.image.startsWith('data:')
                    ? 'Local uploaded photo'
                    : f.image.startsWith('http')
                    ? f.image
                    : `Emoji: ${f.image}`
                  : 'No photo selected (displays 📦 by default)'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setImageModalOpen(true)}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-none"
                >
                  <Camera size={13} /> Choose / Upload Photo
                </button>
                {f.image && (
                  <button
                    type="button"
                    onClick={() => up('image', '')}
                    className="btn-ghost text-xs py-1.5 px-2.5 flex items-center gap-1 text-bad hover:border-bad/40"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <Field label="Name" className="sm:col-span-2">
            <Input value={f.name} onChange={(e) => up('name', e.target.value)} autoFocus />
          </Field>
          <Field label="Category">
            <Input list="cats" value={f.category} onChange={(e) => up('category', e.target.value)} />
            <datalist id="cats">{profile.categories.map((c: string) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Brand"><Input value={f.brand ?? ''} onChange={(e) => up('brand', e.target.value)} /></Field>
          <Field label="SKU"><Input value={f.sku} onChange={(e) => up('sku', e.target.value)} /></Field>
          <Field label="Barcode / EAN"><Input value={f.barcode ?? ''} onChange={(e) => up('barcode', e.target.value)} /></Field>
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
          <div className="space-y-2 sm:col-span-2 pt-2 border-t border-line">
            <Toggle checked={f.active} onChange={(v) => up('active', v)} label="Active in POS" hint="Visible on terminal billing screen" />
            <Toggle checked={f.trackStock} onChange={(v) => up('trackStock', v)} label="Track stock" hint="Deduct quantity automatically on each sale" />
            <Toggle checked={!!f.favorite} onChange={(v) => up('favorite', v)} label="Favourite" hint="Pin to top favourites row" />
          </div>
        </div>
      </Modal>

      <ImagePickerModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        value={f.image}
        productName={f.name || 'Product'}
        onSelect={(img) => up('image', img || '')}
      />
    </>
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

function InvRow({ p, currency, expiryDays, hideCost, checked, onCheck, onEdit, onAdjust, onFav, onDelete }: any) {
  const st = stockState(p); const ex = expiryState(p, expiryDays);
  const margin = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0;
  return (
    <div className="flex h-full items-center gap-2.5 border-b border-line px-3 hover:bg-surface2/50 overflow-hidden">
      <input type="checkbox" className="h-4 w-4 shrink-0 accent-cyan-400" checked={checked} onChange={(e) => onCheck(e.target.checked)} />
      <button onClick={onFav} className="shrink-0"><Star size={13} className={p.favorite ? 'fill-warn text-warn' : 'text-ink3'} /></button>
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-surface2 border border-line/60 flex items-center justify-center">
        <ProductImage src={p.image} alt={p.name} emojiClassName="text-base" />
      </div>
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
        <p className="truncate text-[11px] text-ink3">{p.sku}{p.brand ? ' · ' + p.brand : ''} · {p.category}{p.batch ? ' · B:' + p.batch : ''}</p>
      </button>
      {ex === 'expired' && <Badge tone="bad">expired</Badge>}
      {ex === 'soon' && <Badge tone="warn">expiring</Badge>}
      {!hideCost && <span className="hidden w-16 shrink-0 text-right font-mono text-xs text-ink3 lg:block">{money(p.cost, currency)}</span>}
      <span className="w-20 shrink-0 text-right font-mono text-sm text-ink">{money(p.price, currency)}</span>
      {!hideCost && <span className={cx('hidden w-12 shrink-0 text-right font-mono text-xs lg:block', margin < 10 ? 'text-bad' : margin < 25 ? 'text-warn' : 'text-ok')}>{margin.toFixed(0)}%</span>}
      <button onClick={onAdjust} className={cx('w-20 shrink-0 text-right font-mono text-sm font-bold', st === 'out' ? 'text-bad' : st === 'low' ? 'text-warn' : 'text-ink')}>{p.stock} {p.unit}</button>
      <button className="shrink-0 rounded-lg p-1.5 text-ink3 hover:text-brand" onClick={onEdit}><Pencil size={14} /></button>
      <button className="shrink-0 rounded-lg p-1.5 text-ink3 hover:text-bad" onClick={onDelete}><Trash2 size={14} /></button>
    </div>
  );
}

function BulkEdit({ open, onClose, ids, onDone }: { open: boolean; onClose: () => void; ids: string[]; onDone: () => void }) {
  const [op, setOp] = useState('price-pct');
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    const n = parseFloat(val);
    if (op !== 'category' && op !== 'active-on' && op !== 'active-off' && op !== 'fav-on' && !Number.isFinite(n)) return toast('Enter a value', 'err');
    setBusy(true);
    const items = await db.products.bulkGet(ids);
    const updates = items.filter(Boolean).map((p: any) => {
      const u: any = { ...p, updatedAt: Date.now() };
      switch (op) {
        case 'price-pct': u.price = +(p.price * (1 + n / 100)).toFixed(2); break;
        case 'price-set': u.price = n; break;
        case 'margin': u.price = +(p.cost * (1 + n / 100)).toFixed(2); break;
        case 'cost-pct': u.cost = +(p.cost * (1 + n / 100)).toFixed(2); break;
        case 'gst': u.gst = n; break;
        case 'low': u.lowStock = n; break;
        case 'stock-add': u.stock = +(p.stock + n).toFixed(3); break;
        case 'stock-set': u.stock = n; break;
        case 'category': u.category = val || p.category; break;
        case 'active-on': u.active = true; break;
        case 'active-off': u.active = false; break;
        case 'fav-on': u.favorite = true; break;
      }
      return u;
    });
    await db.products.bulkPut(updates);
    await logActivity('bulk', `Bulk update (${op}) on ${updates.length} products`);
    setBusy(false); toast(`${updates.length} products updated`); onDone();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Bulk edit · ${ids.length} items`}
      footer={<button className="btn-primary w-full" disabled={busy} onClick={apply}>{busy ? 'Applying…' : 'Apply to ' + ids.length + ' items'}</button>}>
      <Field label="Operation">
        <Select value={op} onChange={(e) => setOp(e.target.value)}>
          <option value="price-pct">Change price by %</option>
          <option value="price-set">Set price to</option>
          <option value="margin">Set price from cost + margin %</option>
          <option value="cost-pct">Change cost by %</option>
          <option value="gst">Set GST %</option>
          <option value="low">Set low-stock level</option>
          <option value="stock-add">Add to stock</option>
          <option value="stock-set">Set stock to</option>
          <option value="category">Change category</option>
          <option value="active-on">Mark active</option>
          <option value="active-off">Mark inactive</option>
          <option value="fav-on">Mark favourite</option>
        </Select>
      </Field>
      {!['active-on', 'active-off', 'fav-on'].includes(op) && (
        <Field label="Value" className="mt-3"><Input value={val} onChange={(e) => setVal(e.target.value)} placeholder={op === 'category' ? 'New category' : 'e.g. 10'} autoFocus /></Field>
      )}
      <p className="mt-3 rounded-xl border border-warn/30 bg-warn/10 p-3 text-[11px] text-warn">
        Bulk changes are written straight to your local database. Take a backup first if you're unsure.
      </p>
    </Modal>
  );
}
