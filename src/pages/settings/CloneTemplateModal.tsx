import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera, RotateCw, RotateCcw, ArrowLeft, ArrowRight, Check, RefreshCw, ImagePlus,
} from 'lucide-react';
import { Field, Input, Select, Modal, Toggle, Badge } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { db, uid } from '@/db/db';
import { renderTemplate, buildContext, sampleSale } from '@/lib/templates';
import { printHTML } from '@/lib/receipt';
import { qrDataUrl, upiLink } from '@/lib/upi';
import { toast } from '@/store/ui';
import { cx } from '@/lib/format';
import {
  buildClonedTemplate, cropBillPhoto, dataUrlKB, fileToDataUrl,
} from '@/lib/cloneTemplate';

const PAPER_W = { '58mm': 384, '80mm': 576, A4: 820 } as const;

export default function CloneTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState('');
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [headerPct, setHeaderPct] = useState(26);
  const [footerPct, setFooterPct] = useState(16);
  const [bw, setBw] = useState(true);
  const [crops, setCrops] = useState({ header: '', footer: '' });
  const [working, setWorking] = useState(false);
  const [paper, setPaper] = useState<'58mm' | '80mm' | 'A4'>('80mm');
  const [name, setName] = useState('My bill clone');
  const [itemsStyle, setItemsStyle] = useState<'compact' | 'detailed'>('compact');
  const [font, setFont] = useState<'mono' | 'sans'>('mono');
  const [showMeta, setShowMeta] = useState(true);
  const [showTaxRows, setShowTaxRows] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [setDefault, setSetDefault] = useState(true);
  const [qr, setQr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const sample = useMemo(() => sampleSale(), []);

  useEffect(() => {
    if (!open) return;
    const u = s.upiAccounts.find((x) => x.isDefault && x.active) ?? s.upiAccounts.find((x) => x.active);
    if (u) qrDataUrl(upiLink(u, 549), 240).then(setQr).catch(() => setQr(''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // re-crop header/footer whenever the photo or zone settings change
  useEffect(() => {
    if (!photo) return;
    setWorking(true);
    const t = setTimeout(() => {
      cropBillPhoto(photo, {
        rotation, headerPct, footerPct, bw,
        maxWidth: PAPER_W[paper], quality: 0.72,
      })
        .then((r) => setCrops({ header: r.header, footer: r.footer }))
        .catch(() => toast('Photo process nahi ho payi', 'err'))
        .finally(() => setWorking(false));
    }, 220);
    return () => clearTimeout(t);
  }, [photo, rotation, headerPct, footerPct, bw, paper]);

  const finalHtml = useMemo(() => buildClonedTemplate({
    paper, headerImg: crops.header, footerImg: crops.footer,
    showMeta, itemsStyle, showTaxRows, showQr, showBarcode, showWords, font,
  }), [paper, crops, showMeta, itemsStyle, showTaxRows, showQr, showBarcode, showWords, font]);

  const preview = useMemo(() => renderTemplate(finalHtml, {
    ...buildContext(sample, s as any, {
      upiQr: qr, upiId: s.upiAccounts.find((u) => u.isDefault)?.vpa ?? 'shop@upi', logo: s.logoDataUrl,
    }),
    margin: s.printMargin,
  }), [finalHtml, sample, s, qr]);

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Sirf image file chunein', 'err');
    try {
      const url = await fileToDataUrl(f);
      setPhoto(url);
      setName(f.name.replace(/\.(jpe?g|png|webp|heic)$/i, '').replace(/[_-]+/g, ' ').trim() || 'My bill clone');
      setStep(1);
    } catch { toast('Image read nahi ho payi', 'err'); }
  };

  const reset = () => {
    setStep(0); setPhoto(''); setRotation(0); setCrops({ header: '', footer: '' });
  };

  const save = async () => {
    if (!photo) return toast('Pehle bill ki photo add karein', 'err');
    if (!name.trim()) return toast('Template ka naam likhein', 'err');
    if (!crops.header && !crops.footer) return toast('Header ya footer me se kam se kam ek rakhein', 'err');
    const now = Date.now();
    const id = uid('tpl_');
    await db.templates.add({
      id, name: name.trim(), paper,
      desc: `Bill photo se clone · ${dataUrlKB(crops.header) + dataUrlKB(crops.footer)} KB images`,
      html: finalHtml, createdAt: now, updatedAt: now,
    });
    if (setDefault) s.set(paper === 'A4' ? { a4Template: id } : { defaultTemplate: id });
    toast('Template taiyaar! Bilkul aapke bill jaisa');
    onClose();
    reset();
  };

  const kb = dataUrlKB(crops.header) + dataUrlKB(crops.footer);
  const canNext = step === 0 ? !!photo : true;

  return (
    <Modal open={open} onClose={() => { onClose(); }} wide
      title="📷 Bill photo se template"
      footer={
        <div className="flex items-center gap-2">
          {step > 0 && <button className="btn-soft" onClick={() => setStep(step - 1)}><ArrowLeft size={15} /> Peeche</button>}
          <div className="mx-auto flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className={cx('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-brand' : 'w-1.5 bg-line')} />
            ))}
          </div>
          {step < 2
            ? <button className="btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Aage <ArrowRight size={15} /></button>
            : <>
              <button className="btn-soft" onClick={() => printHTML(preview, 1)}>Test print</button>
              <button className="btn-primary" onClick={save}><Check size={15} /> Save template</button>
            </>}
        </div>
      }>
      {step === 0 && (
        <div className="space-y-3">
          <button
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface2/40 px-4 py-10 text-center transition hover:border-brand/60">
            <span className="rounded-2xl bg-brand/15 p-4 text-brand"><Camera size={28} /></span>
            <span className="text-sm font-bold text-ink">Bill ki photo chunein ya yahan drop karein</span>
            <span className="max-w-sm text-[11px] text-ink3">Purana printed bill, dusri dukaan ka bill, ya WhatsApp par aaya bill — kisi bhi bill ki seedhi, saaf photo chalegi. JPG / PNG / WebP.</span>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
          </button>
          <div className="grid gap-2 rounded-xl border border-line bg-surface2/40 p-3 text-[11px] text-ink3 sm:grid-cols-3">
            <span>✅ <b className="text-ink2">Seedhi photo</b> — tedha bill ho to aage rotate kar sakte ho</span>
            <span>✅ <b className="text-ink2">Saaf roshni</b> — flash ki chamak se bachein</span>
            <span>✅ <b className="text-ink2">Poora bill</b> — upar-neeche kuch kata na ho</span>
          </div>
          <p className="text-[11px] text-ink3">🔒 Photo sirf aapke device par rehti hai — kahin upload nahi hoti. Header (dukaan ka naam/logo) aur footer (dhanyavaad/terms) photo se same-to-same aayenge, beech me items/total har bill par badlenge.</p>
        </div>
      )}

      {step === 1 && photo && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="relative mx-auto max-h-[46vh] w-fit overflow-hidden rounded-xl border border-line bg-black">
              <img src={photo} alt="bill"
                style={{ transform: `rotate(${rotation}deg)`, maxHeight: '46vh' }}
                className="block w-auto transition-transform" />
              <div className="pointer-events-none absolute inset-x-0 top-0 border-b-2 border-emerald-400 bg-emerald-400/25" style={{ height: `${headerPct}%` }}>
                <span className="absolute left-1 top-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-black">HEADER — photo jaisa</span>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t-2 border-sky-400 bg-sky-400/25" style={{ height: `${footerPct}%` }}>
                <span className="absolute bottom-1 left-1 rounded bg-sky-400 px-1.5 py-0.5 text-[10px] font-bold text-black">FOOTER — photo jaisa</span>
              </div>
              <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center border-y border-dashed border-amber-300/70 bg-amber-300/10"
                style={{ top: `${headerPct}%`, bottom: `${footerPct}%` }}>
                <span className="rounded bg-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-black">ITEMS + TOTAL — har bill par badlega</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="chip" onClick={() => setRotation(((rotation + 270) % 360) as any)}><RotateCcw size={12} className="mr-1 inline" />Left</button>
              <button className="chip" onClick={() => setRotation(((rotation + 90) % 360) as any)}><RotateCw size={12} className="mr-1 inline" />Right</button>
              <button className="chip" onClick={() => fileRef.current?.click()}><ImagePlus size={12} className="mr-1 inline" />Dusri photo</button>
              <button className="chip" onClick={reset}><RefreshCw size={12} className="mr-1 inline" />Reset</button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
            </div>
          </div>
          <div className="space-y-3">
            <Field label={`Header — upar se ${headerPct}%`} hint="Dukaan ka naam, logo, address, GST no. — jitna photo jaisa chahiye">
              <input type="range" min={0} max={60} value={headerPct} onChange={(e) => setHeaderPct(+e.target.value)} className="w-full accent-emerald-400" />
            </Field>
            <Field label={`Footer — neeche se ${footerPct}%`} hint="Dhanyavaad, terms, sign — photo wala hissa">
              <input type="range" min={0} max={60} value={footerPct} onChange={(e) => setFooterPct(+e.target.value)} className="w-full accent-sky-400" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Paper size">
                <Select value={paper} onChange={(e) => setPaper(e.target.value as any)}>
                  <option value="58mm">58mm roll</option>
                  <option value="80mm">80mm roll</option>
                  <option value="A4">A4 sheet</option>
                </Select>
              </Field>
              <Field label="Photo ka wazan">
                <div className="input flex items-center justify-between">
                  <span className="font-mono text-xs">{working ? '...' : `${kb} KB`}</span>
                  <Badge tone={kb > 900 ? 'warn' : 'ok'}>{kb > 900 ? 'bhaari' : 'halka'}</Badge>
                </div>
              </Field>
            </div>
            <Toggle checked={bw} onChange={setBw} label="Black & white (thermal friendly)"
              hint="Thermal printer par saaf print ke liye — photo ka rang hatakar contrast badhata hai" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="label">Header preview</p>
                <div className="overflow-hidden rounded-lg border border-line bg-white">
                  {crops.header ? <img src={crops.header} alt="header" className="w-full" /> : <p className="p-3 text-[11px] text-ink3">Header 0% — kuch nahi</p>}
                </div>
              </div>
              <div>
                <p className="label">Footer preview</p>
                <div className="overflow-hidden rounded-lg border border-line bg-white">
                  {crops.footer ? <img src={crops.footer} alt="footer" className="w-full" /> : <p className="p-3 text-[11px] text-ink3">Footer 0% — kuch nahi</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="space-y-3">
            <Field label="Template ka naam"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Items style">
                <Select value={itemsStyle} onChange={(e) => setItemsStyle(e.target.value as any)}>
                  <option value="compact">Compact</option>
                  <option value="detailed">Detailed + GST</option>
                </Select>
              </Field>
              <Field label="Beach ka font">
                <Select value={font} onChange={(e) => setFont(e.target.value as any)}>
                  <option value="mono">Bill style</option>
                  <option value="sans">Modern</option>
                </Select>
              </Field>
            </div>
            <div className="space-y-2">
              <Toggle checked={showMeta} onChange={setShowMeta} label="Bill no / date / customer" hint="Har bill par badalne wali line" />
              <Toggle checked={showTaxRows} onChange={setShowTaxRows} label="CGST + SGST alag-alag" hint="Band karne par sirf ek GST line" />
              <Toggle checked={showQr} onChange={setShowQr} label="UPI QR code" hint="Scan-to-pay" />
              <Toggle checked={showWords} onChange={setShowWords} label="Rakam shabdon me" hint="Amount in words" />
              <Toggle checked={showBarcode} onChange={setShowBarcode} label="Bill barcode" hint="Invoice number barcode" />
              <Toggle checked={setDefault} onChange={setSetDefault} label="Default template banao" hint="Naye bill isi design me chhapenge" />
            </div>
          </div>
          <div>
            <p className="label">Live preview — sample bill ke saath</p>
            <div className="h-[52vh] overflow-hidden rounded-xl border border-line bg-white">
              <iframe title="clone-preview" srcDoc={preview} className="h-full w-full" />
            </div>
            <p className="mt-1 text-[11px] text-ink3">Upar-neeche aapki photo, beech me live bill data. Pasand aaye to Save dabayein.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
