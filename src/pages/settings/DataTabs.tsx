import { useEffect, useRef, useState } from 'react';
import {
  Download, Upload, Trash2, FileJson, Copy, Check, Cloud, RefreshCw, Loader2, Sparkles,
} from 'lucide-react';
import { Card, Field, Input, Select, Textarea, Toggle, Tabs, Badge, ConfirmBtn, Modal, SectionTitle, Empty } from '@/components/ui';
import { useSettings, useShop } from '@/store/settings';
import { SHOP_PROFILES } from '@/lib/shopProfiles';
import { exportBackup, wipeAll } from '@/lib/backup';
import { seedIfEmpty } from '@/db/seed';
import { db } from '@/db/db';
import { toast } from '@/store/ui';
import { download } from '@/lib/csv';
import { num, dt, cx } from '@/lib/format';
import {
  importText, importFromURL, defaultImportOptions, SAMPLE_FORMATS, detectKind, unwrap,
  type ImportOptions,
} from '@/lib/importer';

/* ─────────────────────────── SHOP TYPE ─────────────────────────── */

export function ShopTypeTab() {
  const s = useSettings();
  const { profile, modules } = useShop();
  const [confirm, setConfirm] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle title="What kind of business is this?" sub="Pick a profile — wording, modules, tax defaults and layout adapt instantly." />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {SHOP_PROFILES.map((p) => (
            <button key={p.id} onClick={() => setConfirm(p.id)}
              className={cx('rounded-2xl border p-3 text-left transition', s.shopType === p.id ? 'border-brand bg-brand/10 shadow-glow' : 'border-line hover:border-brand/50')}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{p.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{p.label}</span>
                {s.shopType === p.id && <Badge tone="brand">active</Badge>}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-ink3">{p.blurb}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(p.modules).filter(([, v]) => v).slice(0, 4).map(([k]) => (
                  <span key={k} className="rounded-md border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-ink3">{k}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title={`Modules · ${profile.emoji} ${profile.label}`} sub="Override anything the profile turned on or off." />
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.keys(profile.modules).map((k) => {
            const key = k as keyof typeof profile.modules;
            return (
              <Toggle key={k} checked={!!modules[key]} label={MODULE_LABELS[k] ?? k} hint={MODULE_HINTS[k]}
                onChange={(v) => s.set({ moduleOverrides: { ...s.moduleOverrides, [key]: v } })} />
            );
          })}
        </div>
        <button className="btn-ghost mt-3" onClick={() => { s.set({ moduleOverrides: {} }); toast('Modules reset to profile defaults'); }}>
          <RefreshCw size={14} /> Reset to profile defaults
        </button>
      </Card>

      <Card>
        <SectionTitle title="Vocabulary preview" sub="How this profile renames things across the app" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(profile.terms).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-line bg-surface2/50 px-2.5 py-1.5">
              <p className="text-[10px] uppercase tracking-wider text-ink3">{k}</p>
              <p className="truncate text-sm font-bold text-ink">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Switch shop type?"
        footer={<div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => { s.applyShopType(confirm as any, false); setConfirm(null); toast('Shop type changed (settings kept)'); }}>Keep my settings</button>
          <button className="btn-primary flex-1" onClick={() => { s.applyShopType(confirm as any, true); setConfirm(null); toast('Profile applied'); }}>Apply profile defaults</button>
        </div>}>
        <p className="text-sm text-ink2">
          Applying defaults updates GST rate, quick-cash buttons, POS layout, accent colour and module switches for
          <b className="text-ink"> {SHOP_PROFILES.find((p) => p.id === confirm)?.label}</b>. Your products, customers and sales are never touched.
        </p>
      </Modal>
    </div>
  );
}

const MODULE_LABELS: Record<string, string> = {
  tables: 'Table service / floor plan', batchExpiry: 'Batch & expiry tracking',
  prescription: 'Prescription (Rx) capture', serialNumbers: 'Serial / IMEI capture',
  variants: 'Size & variant options', kitchenNote: 'Kitchen / item notes',
  appointments: 'Appointments & bookings', weighScale: 'Loose / weighed items',
  warranty: 'Warranty tracking', loyalty: 'Loyalty points',
};
const MODULE_HINTS: Record<string, string> = {
  tables: 'Adds the Tables page and dine-in order flow',
  batchExpiry: 'Batch no. + expiry fields, expiry alerts and reports',
  prescription: 'Doctor / Rx note field on the bill',
  serialNumbers: 'Capture serial numbers per unit sold',
  variants: 'Multiple prices per item (S/M/L, half/full)',
  kitchenNote: 'Free-text note per cart line for the kitchen',
  appointments: 'Booking slots for services',
  weighScale: 'Decimal quantities in kg / g / litre',
  warranty: 'Warranty months printed on the invoice',
  loyalty: 'Earn and redeem points on bills',
};

/* ─────────────────────────── JSON DATA ─────────────────────────── */

const BUNDLED = [
  { id: 'lite', label: 'Demo catalogue — Lite', desc: '1,500 mixed retail products. Fast, great for testing.', url: 'data/catalog-lite.json' },
  { id: 'pharmacy', label: 'Demo catalogue — Wellness / Pharmacy', desc: '~800 ayurveda, supplements & hygiene SKUs.', url: 'data/catalog-pharmacy.json' },
  { id: 'full', label: 'Demo catalogue — Full', desc: '27,555 real products with barcodes, brands & stock (7 MB).', url: 'data/catalog-full.json' },
];

export function JsonTab() {
  const s = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [opts, setOpts] = useState<ImportOptions>(defaultImportOptions());
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<string>('');
  const [preview, setPreview] = useState<{ kind: string; rows: number; sample: any } | null>(null);
  const [copied, setCopied] = useState('');
  const [counts, setCounts] = useState({ products: 0, customers: 0, sales: 0, vendors: 0 });

  const refreshCounts = async () => setCounts({
    products: await db.products.count(), customers: await db.customers.count(),
    sales: await db.sales.count(), vendors: await db.vendors.count(),
  });
  useEffect(() => { refreshCounts(); }, [busy]);

  const withProgress = (): ImportOptions => ({ ...opts, onProgress: (done, total) => setProgress({ done, total }) });

  const analyse = (raw: string) => {
    try {
      const data = JSON.parse(raw);
      const rows = unwrap(data);
      setPreview({ kind: detectKind(data), rows: rows.length || (data.app ? -1 : 0), sample: rows[0] ?? data });
    } catch { setPreview(null); }
  };

  const runImport = async (fn: () => Promise<any>, label: string) => {
    setBusy(label); setResult(''); setProgress(null);
    try {
      const r = await fn();
      setResult(r.message);
      toast(r.message);
    } catch (e: any) {
      setResult('Error: ' + (e?.message ?? e));
      toast('Import failed: ' + (e?.message ?? e), 'err');
    } finally { setBusy(''); setProgress(null); refreshCounts(); }
  };

  const onFile = async (file: File) => {
    const raw = await file.text();
    if (raw.length < 4_000_000) { setText(raw); analyse(raw); }
    else { setText(''); setPreview(null); toast('Large file — importing directly without preview', 'info'); }
    runImport(() => importText(raw, withProgress()), 'file');
  };

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle title="Import data" sub="JSON or CSV — products, customers, vendors or a full SwiftPOS backup. Fields are auto-detected." />
        <div className="grid gap-2 sm:grid-cols-4">
          {[['Products', counts.products], ['Customers', counts.customers], [
            'Sales', counts.sales], ['Vendors', counts.vendors]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border border-line bg-surface2/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-ink3">{l}</p>
              <p className="text-lg font-extrabold text-ink">{num(v as number)}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Import mode" hint="Merge upserts by barcode/name. Replace clears the table first.">
            <Select value={opts.mode} onChange={(e) => setOpts({ ...opts, mode: e.target.value as any })}>
              <option value="merge">Merge / update existing</option>
              <option value="replace">Replace everything</option>
            </Select>
          </Field>
          <Field label="Category source" hint="Your file has both category and unit_type — pick which becomes the app category.">
            <Select value={opts.categoryFrom} onChange={(e) => setOpts({ ...opts, categoryFrom: e.target.value as any })}>
              <option value="category">category field</option>
              <option value="unit_type">unit_type / sub-category field</option>
            </Select>
          </Field>
          <Field label="Assumed margin % (when cost is missing)">
            <Input inputMode="decimal" value={opts.defaultMarginPct} onChange={(e) => setOpts({ ...opts, defaultMarginPct: +e.target.value || 0 })} />
          </Field>
          <Field label="Default GST % / low-stock level">
            <div className="flex gap-2">
              <Input inputMode="decimal" value={opts.defaultGst} onChange={(e) => setOpts({ ...opts, defaultGst: +e.target.value || 0 })} />
              <Input inputMode="numeric" value={opts.defaultLowStock} onChange={(e) => setOpts({ ...opts, defaultLowStock: +e.target.value || 0 })} />
            </div>
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" hidden
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            {busy === 'file' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Choose file
          </button>
          <button className="btn-soft" disabled={!text.trim() || !!busy} onClick={() => runImport(() => importText(text, withProgress()), 'paste')}>
            <FileJson size={15} /> Import pasted JSON
          </button>
          <button className="btn-ghost" onClick={() => { setText(''); setPreview(null); setResult(''); }}>Clear</button>
        </div>

        <p className="label mt-3">Or paste JSON / CSV here</p>
        <Textarea className="min-h-[130px] font-mono text-[11px]" value={text} placeholder='[{"product_name":"Paracetamol 650","price_per_unit":32,"stock_quantity":50}]'
          onChange={(e) => { setText(e.target.value); analyse(e.target.value); }} />

        {preview && (
          <div className="mt-2 rounded-xl border border-brand/30 bg-brand/5 p-3 text-xs">
            <p className="font-bold text-brand">Detected: {preview.kind} {preview.rows > 0 && `· ${num(preview.rows)} rows`}</p>
            <pre className="mt-1 max-h-32 overflow-auto text-[10px] text-ink3">{JSON.stringify(preview.sample, null, 1).slice(0, 700)}</pre>
          </div>
        )}

        {progress && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-surface2">
              <div className="h-full bg-brand transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-ink3">{num(progress.done)} / {num(progress.total)} rows written…</p>
          </div>
        )}
        {result && <p className={cx('mt-2 rounded-xl border p-3 text-xs', result.startsWith('Error') ? 'border-bad/40 bg-bad/10 text-bad' : 'border-ok/40 bg-ok/10 text-ok')}>{result}</p>}
      </Card>

      <Card>
        <SectionTitle title="One-tap sample catalogues" sub="Bundled with the app — perfect for demos or a quick start." />
        <div className="space-y-2">
          {BUNDLED.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{b.label}</p>
                <p className="text-[11px] text-ink3">{b.desc}</p>
              </div>
              <a className="btn-ghost px-2 py-1.5 text-xs" href={b.url} download><Download size={13} /> File</a>
              <button className="btn-primary px-3 py-1.5 text-xs" disabled={!!busy}
                onClick={() => runImport(() => importFromURL(b.url, withProgress()), b.id)}>
                {busy === b.id ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />} Import
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Import from a URL" sub="Any public JSON endpoint (must allow CORS)." />
        <UrlImport onRun={(url) => runImport(() => importFromURL(url, withProgress()), 'url')} busy={!!busy} />
      </Card>

      <Card>
        <SectionTitle title="Accepted JSON formats" sub="Copy a template, fill it with your data, import. Unknown fields are ignored; missing ones are auto-filled." />
        <div className="space-y-3">
          {SAMPLE_FORMATS.map((f) => (
            <div key={f.id} className="rounded-xl border border-line">
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
                <p className="flex-1 text-sm font-bold text-ink">{f.title}</p>
                <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { navigator.clipboard.writeText(JSON.stringify(f.sample, null, 2)); setCopied(f.id); setTimeout(() => setCopied(''), 1500); }}>
                  {copied === f.id ? <Check size={13} /> : <Copy size={13} />} Copy
                </button>
                <button className="btn-ghost px-2 py-1 text-xs" onClick={() => download(`swiftpos-${f.id}-template.json`, JSON.stringify(f.sample, null, 2), 'application/json')}>
                  <Download size={13} /> Template
                </button>
                <button className="btn-soft px-2 py-1 text-xs" onClick={() => { const t = JSON.stringify(f.sample, null, 2); setText(t); analyse(t); }}>Load into editor</button>
              </div>
              <p className="px-3 pt-2 text-[11px] text-ink3">{f.note}</p>
              <pre className="max-h-56 overflow-auto p-3 font-mono text-[10.5px] leading-relaxed text-ink2">{JSON.stringify(f.sample, null, 2)}</pre>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-line bg-surface2/50 p-3 text-[11px] leading-relaxed text-ink3">
          <p className="mb-1 font-bold text-ink2">Field aliases understood automatically</p>
          <p><b>Name:</b> product_name · item_name · name · title · medicine_name · dish</p>
          <p><b>Price:</b> price_per_unit · selling_price · price · rate · mrp</p>
          <p><b>Cost:</b> cost · cost_price · purchase_price · wholesale_price</p>
          <p><b>Stock:</b> stock_quantity · stock · qty · quantity · on_hand</p>
          <p><b>Barcode:</b> barcode · ean · upc · gtin · product_id</p>
          <p><b>Category:</b> category · department · group · unit_type</p>
          <p><b>Brand:</b> brand_name · brand · manufacturer · company</p>
          <p><b>Others:</b> gst · hsn · batch · expiry · rack · low_stock · unit</p>
        </div>
      </Card>
    </div>
  );
}

function UrlImport({ onRun, busy }: { onRun: (url: string) => void; busy: boolean }) {
  const [url, setUrl] = useState('');
  return (
    <div className="flex gap-2">
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/inventory.json" />
      <button className="btn-primary" disabled={!url.trim() || busy} onClick={() => onRun(url.trim())}><Cloud size={15} /> Fetch</button>
    </div>
  );
}

/* ─────────────────────────── BACKUP ─────────────────────────── */

export function BackupTab() {
  const s = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle title="Backup & restore" sub={s.lastBackup ? `Last backup ${dt(s.lastBackup)}` : 'No backup taken yet'} />
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={async () => { await exportBackup(); toast('Backup downloaded'); }}><Download size={16} /> Export full backup</button>
          <input ref={fileRef} type="file" accept=".json" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            try { const { importBackup } = await import('@/lib/backup'); await importBackup(await f.text()); toast('Backup restored'); }
            catch (err: any) { toast(err.message ?? 'Restore failed', 'err'); }
          }} />
          <button className="btn-soft" onClick={() => fileRef.current?.click()}><Upload size={15} /> Restore backup</button>
        </div>
      </Card>
      <Card>
        <SectionTitle title="Demo data" sub="Load the built-in sample store, or wipe everything and start clean." />
        <div className="flex flex-wrap gap-2">
          <button className="btn-soft" onClick={async () => { await seedIfEmpty(true); toast('Demo data regenerated'); }}><Sparkles size={15} /> Reload demo store</button>
          <ConfirmBtn onConfirm={async () => { await wipeAll(); toast('All data erased'); }}><Trash2 size={15} /> Erase all data</ConfirmBtn>
          <ConfirmBtn onConfirm={() => { useSettings.getState().reset(); toast('Settings reset'); }}><RefreshCw size={15} /> Reset settings</ConfirmBtn>
        </div>
      </Card>
      <Card>
        <SectionTitle title="Storage" sub="Everything lives in your browser (IndexedDB) — offline first, nothing leaves the device." />
        <StorageInfo />
      </Card>
    </div>
  );
}

function StorageInfo() {
  const [info, setInfo] = useState<string>('checking…');
  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => {
      const used = ((e.usage ?? 0) / 1048576).toFixed(1);
      const quota = ((e.quota ?? 0) / 1048576 / 1024).toFixed(2);
      setInfo(`${used} MB used of ~${quota} GB available`);
    }).catch(() => setInfo('unavailable'));
  }, []);
  return <p className="text-sm text-ink2">{info}</p>;
}
