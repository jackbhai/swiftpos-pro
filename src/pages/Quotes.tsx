import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Printer, Share2, ShoppingCart, Search } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, uid, logActivity } from '@/db/db';
import { useCustomers } from '@/hooks/useData';
import { useCatalog, useDebounced, searchProducts } from '@/hooks/useCatalog';
import { money, dt, cx } from '@/lib/format';
import { Card, Stat, Modal, Field, Input, Select, Empty, SearchBar, Badge, Textarea, Tabs, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { useCart } from '@/store/cart';
import { toast, toastUndo } from '@/store/ui';
import { printHTML, waLink } from '@/lib/receipt';
import { amountInWords } from '@/lib/words';
import type { Quote, CartLine, Product } from '@/db/types';

/** Quotations / estimates / proforma — build, share, and convert to a bill in one tap. */
export default function Quotes() {
  const quotes = useLiveQuery(() => db.quotes.orderBy('ts').reverse().toArray(), [], [] as Quote[]) || [];
  const customers = useCustomers() || [];
  const s = useSettings();
  const nav = useNavigate();
  const [tab, setTab] = useState('open');
  const [q, setQ] = useState('');
  const [editor, setEditor] = useState<Quote | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return quotes.filter((x) => (tab === 'all' ? true : x.status === tab))
      .filter((x) => !term || x.quoteNo.toLowerCase().includes(term) || (x.customerName || '').toLowerCase().includes(term));
  }, [quotes, tab, q]);

  const openValue = quotes.filter((x) => x.status === 'open').reduce((t, x) => t + x.total, 0);
  const wonValue = quotes.filter((x) => x.status === 'converted').reduce((t, x) => t + x.total, 0);
  const winRate = quotes.length ? (quotes.filter((x) => x.status === 'converted').length / quotes.length) * 100 : 0;

  const convert = (x: Quote) => {
    useCart.getState().load(x.lines, x.customerId, x.customerName);
    db.quotes.update(x.id, { status: 'converted' });
    toast('Loaded into billing cart');
    nav('/pos');
  };

  const print = (x: Quote) => printHTML(quoteHTML(x, s));

  const share = (x: Quote) => {
    const c = customers.find((y: any) => y.id === x.customerId);
    const text = `*${s.shopName}* — Estimate ${x.quoteNo}\n` +
      x.lines.map((l) => `${l.name} x${l.qty} = ${money(l.price * l.qty - l.discount, s.currency)}`).join('\n') +
      `\n\nTotal: ${money(x.total, s.currency)}` + (x.validTill ? `\nValid till: ${x.validTill}` : '');
    window.open(waLink(c?.phone || '', text), '_blank');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open quotes" value={quotes.filter((x) => x.status === 'open').length} tone="brand" icon={<FileText size={16} />} />
        <Stat label="Open value" value={money(openValue, s.currency)} tone="warn" />
        <Stat label="Converted" value={money(wonValue, s.currency)} tone="ok" />
        <Stat label="Win rate" value={winRate.toFixed(0) + '%'} tone="ok" />
      </div>

      <Card>
        <SectionTitle title="Quotations & estimates" sub="Share a price before billing; convert to invoice in one tap"
          right={<button className="btn-primary" onClick={() => setEditor(blankQuote())}><Plus size={15} /> New quote</button>} />
        <Tabs tabs={[{ id: 'open', label: 'Open' }, { id: 'converted', label: 'Converted' }, { id: 'expired', label: 'Expired' }, { id: 'all', label: 'All' }]} active={tab} onChange={setTab} />
        <div className="mt-2"><SearchBar value={q} onChange={setQ} placeholder="Quote no or customer…" right={<Search size={15} className="text-ink3" />} /></div>
      </Card>

      {list.length === 0 ? <Empty title="No quotes yet" sub="Create an estimate and share it on WhatsApp." icon={<FileText size={22} />}
        action={<button className="btn-primary mt-2" onClick={() => setEditor(blankQuote())}><Plus size={15} /> New quote</button>} /> : (
        <Card pad={false}>
          {list.map((x) => (
            <div key={x.id} className="flex items-center gap-2 border-b border-line px-3 py-2.5 last:border-0">
              <button className="min-w-0 flex-1 text-left" onClick={() => setEditor(x)}>
                <p className="truncate text-sm font-semibold text-ink">{x.quoteNo} · {x.customerName || 'Walk-in'}</p>
                <p className="truncate text-[11px] text-ink3">{dt(x.ts)} · {x.lines.length} items{x.validTill ? ' · valid till ' + x.validTill : ''}</p>
              </button>
              <Badge tone={x.status === 'converted' ? 'ok' : x.status === 'expired' ? 'bad' : 'warn'}>{x.status}</Badge>
              <span className="font-mono text-sm font-bold text-ink">{money(x.total, s.currency)}</span>
              <button className="rounded-lg p-1.5 text-ink3 hover:text-brand" onClick={() => print(x)}><Printer size={15} /></button>
              <button className="rounded-lg p-1.5 text-ink3 hover:text-ok" onClick={() => share(x)}><Share2 size={15} /></button>
              {x.status === 'open' && <button className="btn-soft px-2 py-1 text-xs" onClick={() => convert(x)}><ShoppingCart size={13} /> Bill</button>}
              <button className="rounded-lg p-1.5 text-ink3 hover:text-bad" onClick={async () => { await db.quotes.delete(x.id); toastUndo(`${x.quoteNo} deleted`, async () => { await db.quotes.put(x); toast('Restored'); }); }}><Trash2 size={15} /></button>
            </div>
          ))}
        </Card>
      )}

      {editor && <QuoteEditor quote={editor} onClose={() => setEditor(null)} />}
    </div>
  );
}

const blankQuote = (): Quote => ({
  id: '', quoteNo: 'EST-' + Date.now().toString().slice(-6), ts: Date.now(),
  lines: [], total: 0, status: 'open',
  validTill: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
});

function QuoteEditor({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const s = useSettings();
  const customers = useCustomers() || [];
  const { products } = useCatalog();
  const [f, setF] = useState<Quote>(quote);
  const [pick, setPick] = useState('');
  const dp = useDebounced(pick, 150);
  const results = useMemo(() => (dp.trim() ? searchProducts(products as any, dp, 8) : []), [products, dp]);

  const setLines = (lines: CartLine[]) =>
    setF({ ...f, lines, total: +lines.reduce((t, l) => t + l.price * l.qty - l.discount, 0).toFixed(2) });

  const addProduct = (p: Product) => {
    const found = f.lines.find((l) => l.productId === p.id);
    if (found) return setLines(f.lines.map((l) => (l === found ? { ...l, qty: l.qty + 1 } : l)));
    setLines([...f.lines, { id: uid('l_'), productId: p.id, name: p.name, qty: 1, price: p.price, basePrice: p.price, cost: p.cost, gst: p.gst, unit: p.unit, discount: 0 }]);
    setPick('');
  };

  const save = async () => {
    if (!f.lines.length) return toast('Add at least one item', 'err');
    if (f.id) { await db.quotes.put(f); toast('Quote updated'); }
    else { const rec = { ...f, id: uid('q_'), ts: Date.now() }; await db.quotes.add(rec); await logActivity('quote', `Created ${rec.quoteNo}`); toast('Quote created'); }
    onClose();
  };

  return (
    <Modal open onClose={onClose} wide title={f.id ? `Edit ${f.quoteNo}` : 'New quote'}
      footer={<div className="flex items-center gap-2">
        <div className="flex-1"><p className="text-[10px] uppercase tracking-wide text-ink3">Total</p><p className="font-mono text-lg font-bold text-brand">{money(f.total, s.currency)}</p></div>
        <button className="btn-soft" onClick={() => printHTML(quoteHTML(f, s))}><Printer size={15} /> Print</button>
        <button className="btn-primary" onClick={save}>Save quote</button>
      </div>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Quote no"><Input value={f.quoteNo} onChange={(e) => setF({ ...f, quoteNo: e.target.value })} /></Field>
        <Field label="Customer">
          <Select value={f.customerId || ''} onChange={(e) => { const c = customers.find((x: any) => x.id === e.target.value); setF({ ...f, customerId: c?.id, customerName: c?.name }); }}>
            <option value="">Walk-in</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
          </Select>
        </Field>
        <Field label="Valid till"><Input type="date" value={f.validTill || ''} onChange={(e) => setF({ ...f, validTill: e.target.value })} /></Field>
      </div>

      <Field label="Add item" className="mt-3"><Input value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Search product…" /></Field>
      {results.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-xl border border-line">
          {results.map((p: any) => (
            <button key={p.id} className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left last:border-0 hover:bg-surface2" onClick={() => addProduct(p)}>
              <span className="min-w-0 flex-1 truncate text-xs text-ink">{p.name}</span>
              <span className="font-mono text-xs text-brand">{money(p.price, s.currency)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        {f.lines.map((l) => (
          <div key={l.id} className="flex items-center gap-2 rounded-xl border border-line p-2">
            <span className="min-w-0 flex-1 truncate text-xs text-ink">{l.name}</span>
            <input className="input h-7 w-16 text-center font-mono text-xs" value={l.qty}
              onChange={(e) => setLines(f.lines.map((x) => (x.id === l.id ? { ...x, qty: +e.target.value || 0 } : x)))} />
            <input className="input h-7 w-20 text-center font-mono text-xs" value={l.price}
              onChange={(e) => setLines(f.lines.map((x) => (x.id === l.id ? { ...x, price: +e.target.value || 0 } : x)))} />
            <span className="w-20 text-right font-mono text-xs text-ink2">{money(l.price * l.qty - l.discount, s.currency)}</span>
            <button className="rounded-lg p-1 text-ink3 hover:text-bad" onClick={() => setLines(f.lines.filter((x) => x.id !== l.id))}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Status">
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as any })}>
            <option value="open">Open</option><option value="converted">Converted</option><option value="expired">Expired</option>
          </Select>
        </Field>
        <Field label="Note"><Textarea rows={2} value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Terms, delivery time, warranty…" /></Field>
      </div>
      <p className={cx('mt-2 text-[11px] text-ink3')}>In words: {amountInWords(f.total)}</p>
    </Modal>
  );
}

function quoteHTML(q: Quote, s: any) {
  const rows = q.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${l.name}</td><td class=r>${l.qty}</td><td class=r>${l.price.toFixed(2)}</td><td class=r>${(l.price * l.qty - l.discount).toFixed(2)}</td></tr>`).join('');
  return `<html><head><meta charset="utf-8"><title>${q.quoteNo}</title><style>
  body{font-family:system-ui,Arial;padding:24px;color:#111}h1{margin:0;font-size:20px}
  table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}
  th,td{border:1px solid #ccc;padding:6px}.r{text-align:right}
  .muted{color:#666;font-size:12px}.tot{font-size:16px;font-weight:700;text-align:right;margin-top:10px}
  </style></head><body>
  <h1>${s.shopName || 'Shop'}</h1>
  <p class=muted>${s.address || ''} ${s.phone ? '· ' + s.phone : ''}${s.gstin ? ' · GSTIN ' + s.gstin : ''}</p>
  <h2 style="font-size:16px">ESTIMATE / QUOTATION</h2>
  <p class=muted>No: <b>${q.quoteNo}</b> · Date: ${new Date(q.ts).toLocaleDateString('en-IN')}${q.validTill ? ' · Valid till: ' + q.validTill : ''}</p>
  <p class=muted>To: <b>${q.customerName || 'Walk-in customer'}</b></p>
  <table><thead><tr><th>#</th><th>Item</th><th class=r>Qty</th><th class=r>Rate</th><th class=r>Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <p class=tot>Total: ${(s.currency || '₹')}${q.total.toFixed(2)}</p>
  <p class=muted>In words: ${amountInWords(q.total)}</p>
  ${q.note ? `<p class=muted>Note: ${q.note}</p>` : ''}
  <p class=muted>This is an estimate, not a tax invoice. Prices subject to change without notice.</p>
  </body></html>`;
}
