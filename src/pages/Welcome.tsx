import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket, Store, Boxes, Database, Wallet, ShieldCheck, Check, ArrowRight, ArrowLeft, Sparkles, Upload,
} from 'lucide-react';
import { SYSTEMS } from '@/lib/systems';
import { useSettings } from '@/store/settings';
import { db } from '@/db/db';
import { importText, defaultImportOptions } from '@/lib/importer';
import { seedIfEmpty } from '@/db/seed';
import { Card, Input, Field, Badge, Select, Toggle, Spinner } from '@/components/ui';
import { toast } from '@/store/ui';
import { cx } from '@/lib/format';

const STEPS = ['Shop', 'System', 'Data', 'Payments', 'Security'] as const;

/** First-run setup wizard — 5 steps from install to first bill. */
export default function Welcome() {
  const s = useSettings();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState('');

  const [shop, setShop] = useState({ shopName: s.shopName === 'SwiftPOS Store' ? '' : s.shopName, phone: s.phone, address: s.address, gstin: s.gstin === '07AAACS1234A1Z5' ? '' : s.gstin, currency: s.currency });
  const [systemId, setSystemId] = useState(s.systemId);
  const [upi, setUpi] = useState({ vpa: '', payeeName: '' });
  const [invoicePrefix, setInvoicePrefix] = useState(s.invoicePrefix);
  const [pin, setPin] = useState('');
  const [lock, setLock] = useState(false);

  const loadDemo = async (url: string, label: string) => {
    setBusy(label);
    try {
      const r = await fetch(new URL(url, document.baseURI).href);
      const txt = await r.text();
      const res = await importText(txt, { ...defaultImportOptions(), mode: 'merge' } as any);
      toast(`${res.inserted} items imported`);
    } catch { toast('Import fail — internet check kijiye', 'err'); }
    setBusy('');
  };

  const importFile = async (f: File) => {
    setBusy('file');
    try {
      const res = await importText(await f.text(), { ...defaultImportOptions(), mode: 'merge' } as any);
      toast(res.message || `${res.inserted} rows imported`);
    } catch (e: any) { toast(e?.message || 'Import failed', 'err'); }
    setBusy('');
  };

  const finish = async () => {
    s.set({
      shopName: shop.shopName || 'My Shop', phone: shop.phone, address: shop.address,
      gstin: shop.gstin, currency: shop.currency, invoicePrefix,
      requirePin: lock && pin.length >= 4, appLockPin: lock ? pin : '',
      onboarded: true, onboardedAt: Date.now(),
    } as any);
    if (upi.vpa) s.addUpi({ label: 'Primary UPI', vpa: upi.vpa, payeeName: upi.payeeName || shop.shopName, active: true, isDefault: true } as any);
    const n = await db.products.count();
    if (!n) await seedIfEmpty(true);
    toast('Setup complete — happy billing! 🎉');
    nav('/pos');
  };

  const next = () => setStep((x) => Math.min(STEPS.length - 1, x + 1));
  const back = () => setStep((x) => Math.max(0, x - 1));

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-1">
      <Card>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/15 text-brand"><Rocket size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold text-ink">Welcome to SwiftPOS Pro</p>
            <p className="text-[11px] text-ink3">5 chhote steps — 2 minute me aapki dukaan billing ke liye ready.</p>
          </div>
          <Badge tone="brand">Step {step + 1}/{STEPS.length}</Badge>
        </div>
        <div className="mt-3 flex gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={cx('h-1.5 rounded-full', i <= step ? 'bg-brand' : 'bg-surface2')} />
              <p className={cx('mt-1 text-[10px]', i === step ? 'text-brand' : 'text-ink3')}>{label}</p>
            </div>
          ))}
        </div>
      </Card>

      {step === 0 && (
        <Card>
          <StepHead icon={<Store size={16} />} title="Dukaan ki jaankari" sub="Ye bill par chhapega" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Shop name *"><Input value={shop.shopName} onChange={(e) => setShop({ ...shop, shopName: e.target.value })} placeholder="Sharma General Store" autoFocus /></Field>
            <Field label="Phone"><Input value={shop.phone} onChange={(e) => setShop({ ...shop, phone: e.target.value })} placeholder="+91 98xxx xxxxx" /></Field>
            <Field label="Address"><Input value={shop.address} onChange={(e) => setShop({ ...shop, address: e.target.value })} /></Field>
            <Field label="GSTIN (optional)"><Input value={shop.gstin} onChange={(e) => setShop({ ...shop, gstin: e.target.value.toUpperCase() })} /></Field>
            <Field label="Currency">
              <Select value={shop.currency} onChange={(e) => setShop({ ...shop, currency: e.target.value })}>
                <option value="₹">₹ Indian Rupee</option><option value="$">$ Dollar</option><option value="€">€ Euro</option><option value="£">£ Pound</option><option value="৳">৳ Taka</option><option value="Rs">Rs</option>
              </Select>
            </Field>
            <Field label="Invoice prefix"><Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} /></Field>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <StepHead icon={<Boxes size={16} />} title="Business system chuniye" sub="Poora app isi ke hisaab se set ho jaega" />
          <div className="grid gap-2 sm:grid-cols-2">
            {SYSTEMS.map((sys) => (
              <button key={sys.id} onClick={() => setSystemId(sys.id)}
                className={cx('rounded-2xl border p-3 text-left transition', systemId === sys.id ? 'border-brand bg-brand/10' : 'border-line hover:border-brand/40')}>
                <p className="text-sm font-bold text-ink">{sys.emoji} {sys.short}</p>
                <p className="text-[11px] text-ink3">{sys.blurb}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <StepHead icon={<Database size={16} />} title="Data laaiye" sub="Apni file import kijiye ya demo catalogue se shuru kijiye" />
          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-line p-4 hover:border-brand/50">
            <span className="text-xs text-ink2"><Upload size={14} className="mr-1 inline" /> JSON / CSV file chuniye (products, customers ya poora backup)</span>
            <input type="file" accept=".json,.csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
            <span className="btn-soft">{busy === 'file' ? <Spinner /> : 'Browse'}</span>
          </label>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              { id: 'lite', label: 'Demo — Lite', desc: '1,500 items', url: 'data/catalog-lite.json' },
              { id: 'pharmacy', label: 'Demo — Pharmacy', desc: '~800 items', url: 'data/catalog-pharmacy.json' },
              { id: 'full', label: 'Demo — Full', desc: '27,555 items', url: 'data/catalog-full.json' },
            ].map((d) => (
              <button key={d.id} className="rounded-2xl border border-line p-3 text-left hover:border-brand/40" disabled={!!busy} onClick={() => loadDemo(d.url, d.id)}>
                <p className="text-xs font-bold text-ink">{busy === d.id ? 'Importing…' : d.label}</p>
                <p className="text-[11px] text-ink3">{d.desc}</p>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink3">Baad me bhi kar sakte hain: Settings → JSON tab.</p>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <StepHead icon={<Wallet size={16} />} title="Payment setup" sub="UPI QR har bill par apne aap aa jaega" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="UPI ID (VPA)" hint="jaise shop@okhdfcbank"><Input value={upi.vpa} onChange={(e) => setUpi({ ...upi, vpa: e.target.value })} /></Field>
            <Field label="Payee name"><Input value={upi.payeeName} onChange={(e) => setUpi({ ...upi, payeeName: e.target.value })} placeholder={shop.shopName} /></Field>
          </div>
          <p className="mt-2 text-[11px] text-ink3">Skip kar sakte hain — cash/card modes waise hi chalte rahenge.</p>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <StepHead icon={<ShieldCheck size={16} />} title="Security" sub="Dukaan par app lock rakhna behtar hota hai" />
          <Toggle checked={lock} onChange={setLock} label="App lock PIN chalu kijiye" />
          {lock && (
            <Field label="4-6 digit PIN" className="mt-3">
              <Input inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
            </Field>
          )}
          <div className="mt-3 rounded-xl border border-line bg-surface2 p-3 text-[11px] text-ink3">
            <b className="text-ink">Aapka data kahan rehta hai?</b> Sab kuch is device ke andar (IndexedDB). Cloud sync tab tak band hai jab tak aap khud Cloud screen par apna Firebase/Supabase nahi jodte.
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2">
        <button className="btn-ghost" onClick={back} disabled={step === 0}><ArrowLeft size={15} /> Back</button>
        <div className="flex gap-2">
          <button className="btn-soft" onClick={() => { s.set({ onboarded: true } as any); nav('/'); }}>Skip setup</button>
          {step < STEPS.length - 1
            ? <button className="btn-primary" onClick={() => { if (step === 0 && !shop.shopName.trim()) return toast('Shop ka naam likhiye', 'err'); if (step === 1) s.applySystem(systemId as any, true); next(); }}>Next <ArrowRight size={15} /></button>
            : <button className="btn-primary" onClick={finish}><Check size={15} /> Finish setup</button>}
        </div>
      </div>

      <p className="pb-6 text-center text-[11px] text-ink3"><Sparkles size={11} className="mr-1 inline" /> 798+ features · offline-first · aapka data aapke paas</p>
    </div>
  );
}

const StepHead = ({ icon, title, sub }: { icon: any; title: string; sub: string }) => (
  <div className="mb-3 flex items-center gap-2">
    <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-brand">{icon}</span>
    <div><p className="text-sm font-bold text-ink">{title}</p><p className="text-[11px] text-ink3">{sub}</p></div>
  </div>
);
