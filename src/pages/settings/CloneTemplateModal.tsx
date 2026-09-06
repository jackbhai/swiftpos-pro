import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera, RotateCw, RotateCcw, ArrowLeft, ArrowRight, Check, RefreshCw, ImagePlus, ScanText, X,
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
import {
  prepareOcrImage, recognizeBillText, parseBillDetails, parsedToSettings, type ParsedBill,
} from '@/lib/billOcr';

const PAPER_W = { '58mm': 384, '80mm': 576, A4: 820 } as const;

export default function CloneTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState('');
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [headerPct, setHeaderPct] = useState(26);
  const [footerPct, setFooterPct] = useState(16);
  const [trimTop, setTrimTop] = useState(0);
  const [trimBottom, setTrimBottom] = useState(0);
  const [trimLeft, setTrimLeft] = useState(0);
  const [trimRight, setTrimRight] = useState(0);
  const [bw, setBw] = useState(true);
  const [ocr, setOcr] = useState<{ status: 'idle' | 'reading' | 'done' | 'error'; progress: number; note: string; parsed: ParsedBill | null; error: string }>(
    { status: 'idle', progress: 0, note: '', parsed: null, error: '' });
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
        rotation, headerPct, footerPct,
        trimTopPct: trimTop, trimBottomPct: trimBottom, trimLeftPct: trimLeft, trimRightPct: trimRight, bw,
        maxWidth: PAPER_W[paper], quality: 0.72,
      })
        .then((r) => setCrops({ header: r.header, footer: r.footer }))
        .catch(() => toast('Photo process nahi ho payi', 'err'))
        .finally(() => setWorking(false));
    }, 220);
    return () => clearTimeout(t);
  }, [photo, rotation, headerPct, footerPct, trimTop, trimBottom, trimLeft, trimRight, bw, paper]);

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
    setTrimTop(0); setTrimBottom(0); setTrimLeft(0); setTrimRight(0);
    setOcr({ status: 'idle', progress: 0, note: '', parsed: null, error: '' });
  };

  const runOcr = async () => {
    if (!photo || ocr.status === 'reading') return;
    setOcr({ status: 'reading', progress: 0, note: 'Photo taiyaar…', parsed: null, error: '' });
    try {
      const prepped = await prepareOcrImage(photo, rotation);
      const text = await recognizeBillText(prepped, (p, note) =>
        setOcr((o) => ({ ...o, progress: p, note })));
      const parsed = parseBillDetails(text);
      const found = parsed.shopName || parsed.address || parsed.gstin || parsed.phones.length;
      if (!found) {
        setOcr({ status: 'error', progress: 0, note: '', parsed: null, error: 'Text saaf padha nahi gaya — seedhi, ujli photo try karein' });
        return;
      }
      setOcr({ status: 'done', progress: 1, note: '', parsed, error: '' });
    } catch (e: any) {
      const offline = !navigator.onLine;
      setOcr({
        status: 'error', progress: 0, note: '', parsed: null,
        error: offline ? 'Internet chahiye — pehli baar 2MB model download hota hai, phir offline chalega'
          : ('OCR fail: ' + (e?.message || 'dobara try karein')),
      });
    }
  };

  const applyOcr = () => {
    if (!ocr.parsed) return;
    s.set(parsedToSettings(ocr.parsed) as any);
    toast('Dukaan ka naam-pata settings me bhar diya ✓');
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
              {(() => {
                const workH = Math.max(10, 100 - trimTop - trimBottom);
                const hh = (headerPct / 100) * workH;
                const fh = (footerPct / 100) * workH;
                return (<>
                  {trimTop > 0 && <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/70" style={{ height: `${trimTop}%` }}>
                    <span className="absolute left-1 top-1 rounded bg-zinc-500 px-1.5 py-0.5 text-[10px] font-bold text-white">✂ kata hua</span>
                  </div>}
                  {trimBottom > 0 && <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/70" style={{ height: `${trimBottom}%` }}>
                    <span className="absolute bottom-1 left-1 rounded bg-zinc-500 px-1.5 py-0.5 text-[10px] font-bold text-white">✂ kata hua</span>
                  </div>}
                  {trimLeft > 0 && <div className="pointer-events-none absolute inset-y-0 left-0 bg-black/70" style={{ width: `${trimLeft}%` }} />}
                  {trimRight > 0 && <div className="pointer-events-none absolute inset-y-0 right-0 bg-black/70" style={{ width: `${trimRight}%` }} />}
                  <div className="pointer-events-none absolute inset-x-0 border-b-2 border-emerald-400 bg-emerald-400/25" style={{ top: `${trimTop}%`, height: `${hh}%` }}>
                    <span className="absolute left-1 top-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-black">HEADER — photo jaisa</span>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 border-t-2 border-sky-400 bg-sky-400/25" style={{ bottom: `${trimBottom}%`, height: `${fh}%` }}>
                    <span className="absolute bottom-1 left-1 rounded bg-sky-400 px-1.5 py-0.5 text-[10px] font-bold text-black">FOOTER — photo jaisa</span>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center border-y border-dashed border-amber-300/70 bg-amber-300/10"
                    style={{ top: `${trimTop + hh}%`, bottom: `${trimBottom + fh}%` }}>
                    <span className="rounded bg-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-black">ITEMS + TOTAL — har bill par badlega</span>
                  </div>
                </>);
              })()}
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
              <Field label={`✂ Upar se kaato ${trimTop}%`} hint="Bill ke upar table/device dikhe to">
                <input type="range" min={0} max={40} value={trimTop} onChange={(e) => setTrimTop(+e.target.value)} className="w-full accent-zinc-400" />
              </Field>
              <Field label={`✂ Neeche se kaato ${trimBottom}%`} hint="Ungli/table aaya ho to">
                <input type="range" min={0} max={40} value={trimBottom} onChange={(e) => setTrimBottom(+e.target.value)} className="w-full accent-zinc-400" />
              </Field>
              <Field label={`✂ Baen kinari ${trimLeft}%`} hint="Side me table dikhe to">
                <input type="range" min={0} max={25} value={trimLeft} onChange={(e) => setTrimLeft(+e.target.value)} className="w-full accent-zinc-400" />
              </Field>
              <Field label={`✂ Dayen kinari ${trimRight}%`} hint="Side me table dikhe to">
                <input type="range" min={0} max={25} value={trimRight} onChange={(e) => setTrimRight(+e.target.value)} className="w-full accent-zinc-400" />
              </Field>
            </div>
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
          <div className="rounded-xl border border-line bg-surface2/40 p-3 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-ink">📝 Photo se naam-pata padho <span className="font-normal text-ink3">(OCR)</span></p>
              {ocr.status === 'idle' && <>
                <button className="btn-primary ml-auto !py-1.5 text-xs" onClick={runOcr}><ScanText size={14} /> Text padho</button>
              </>}
              {ocr.status === 'reading' && <Badge tone="brand" className="ml-auto">padh rahe hain…</Badge>}
              {(ocr.status === 'done' || ocr.status === 'error') && <>
                <button className="chip ml-auto" onClick={runOcr}><ScanText size={12} className="mr-1 inline" />Dobara padho</button>
                <button className="chip" onClick={() => setOcr({ status: 'idle', progress: 0, note: '', parsed: null, error: '' })}><X size={12} /></button>
              </>}
            </div>
            {ocr.status === 'idle' && <p className="mt-1 text-[11px] text-ink3">Bill par chhapa dukaan ka naam, address, phone, GSTIN, FSSAI apne aap padhkar settings me bhar dega. Pehli baar ~2MB model download hoga (internet), phir offline chalega.</p>}
            {ocr.status === 'reading' && (
              <div className="mt-2">
                <div className="h-2 overflow-hidden rounded-full bg-surface3">
                  <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.round(ocr.progress * 100)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-ink3">{ocr.note} {Math.round(ocr.progress * 100)}%</p>
              </div>
            )}
            {ocr.status === 'error' && <p className="mt-2 rounded-lg bg-bad/10 p-2 text-[11px] text-bad">⚠️ {ocr.error}</p>}
            {ocr.status === 'done' && ocr.parsed && (
              <div className="mt-2 space-y-2">
                <div className="grid gap-1.5 text-[11px] sm:grid-cols-2">
                  {ocr.parsed.shopName && <Row k="Dukaan" v={ocr.parsed.shopName} />}
                  {ocr.parsed.tagline && <Row k="Tagline" v={ocr.parsed.tagline} />}
                  {ocr.parsed.address && <Row k="Address" v={ocr.parsed.address} />}
                  {ocr.parsed.phones.map((p, i) => <Row key={p} k={i === 0 ? 'Phone' : 'Phone 2'} v={p} />)}
                  {ocr.parsed.gstin && <Row k="GSTIN" v={ocr.parsed.gstin} />}
                  {ocr.parsed.fssai && <Row k="FSSAI" v={ocr.parsed.fssai} />}
                  {ocr.parsed.cin && <Row k="CIN" v={ocr.parsed.cin} />}
                  {ocr.parsed.email && <Row k="Email" v={ocr.parsed.email} />}
                  {ocr.parsed.website && <Row k="Website" v={ocr.parsed.website} />}
                </div>
                <button className="btn-primary w-full" onClick={applyOcr}><Check size={15} /> Ye details settings me save karo</button>
              </div>
            )}
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

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex gap-2 rounded-lg border border-line bg-surface px-2 py-1.5">
    <span className="shrink-0 font-bold text-ink3">{k}:</span>
    <span className="break-all font-semibold text-ink">{v}</span>
  </div>
);
