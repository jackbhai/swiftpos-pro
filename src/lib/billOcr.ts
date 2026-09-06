/* ── Bill OCR: photo se dukaan ki details padho ──────────────────────
   tesseract.js dynamic import hota hai — sirf tab load jab user OCR chalaye,
   isliye app ka normal bundle/size bilkul nahi badhta.
   Pehli baar ~2MB English model download hota hai (internet chahiye),
   uske baad browser cache se offline bhi chal jaata hai. */

import { loadImage, rotateCanvas } from './cloneTemplate';
import type { Settings } from '@/store/settings';

/** OCR ke liye photo taiyaar karo: rotate + resize + grayscale. */
export async function prepareOcrImage(src: string, rotation: 0 | 90 | 180 | 270): Promise<string> {
  const img = await loadImage(src);
  const full = rotateCanvas(img, rotation);
  const scale = Math.min(1, 1400 / full.width);
  const c = document.createElement('canvas');
  c.width = Math.max(8, Math.round(full.width * scale));
  c.height = Math.max(8, Math.round(full.height * scale));
  const ctx = c.getContext('2d')!;
  ctx.drawImage(full, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const g = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
    px[i] = px[i + 1] = px[i + 2] = g;
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL('image/jpeg', 0.85);
}

/** Photo se saara text padho (0..1 progress callback ke saath).
 *  `opts.langPath` — self-hosted / test environments ke liye (Node me local
 *  file path bhi chalta hai); default CDN se model aata hai. */
export async function recognizeBillText(
  img: string, onProgress?: (p01: number, status: string) => void,
  opts: { langPath?: string } = {},
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', undefined, {
    logger: (m: any) => {
      if (!m || typeof m.status !== 'string') return;
      if (m.status === 'recognizing text') onProgress?.(m.progress ?? 0, 'Text padh rahe hain…');
      else if (/load|download|initializ/i.test(m.status)) onProgress?.(0, 'Model taiyaar ho raha hai…');
    },
    ...(opts.langPath ? { langPath: opts.langPath } : {}),
  } as any);
  try {
    const { data } = await worker.recognize(img);
    return (data?.text ?? '').trim();
  } finally {
    try { await worker.terminate(); } catch { /* already gone */ }
  }
}

/* ── Indian bill parser (pure function — testable without OCR) ───── */

export interface ParsedBill {
  shopName: string; tagline: string; address: string;
  phones: string[]; gstin: string; fssai: string; cin: string;
  email: string; website: string;
}

const EMPTY: ParsedBill = {
  shopName: '', tagline: '', address: '',
  phones: [], gstin: '', fssai: '', cin: '', email: '', website: '',
};

const MARKERS = [
  'cin', 'gstin', 'gst no', 'fssai', 'fssai', 'phone', 'ph ', 'ph:', 'mob', 'tel', 'call',
  'email', 'e-mail', 'bill', 'invoice', 'cashier', 'cash memo', 'receipt', 'challan',
  'description', 'item', 'qty', 'rate', 'amount', 'total', 'tax', 'cgst', 'sgst', 'igst',
  'discount', 'tender', 'balance', 'token', 'customer', 'date', 'time', 'payment',
  'thank', 'visit', 'welcome', 'powered by', 'terms', 'e&oe', 'subject to',
];

const isMarker = (line: string) => {
  const l = line.toLowerCase();
  return MARKERS.some((m) => l.includes(m));
};
const alnum = (s: string) => (s.match(/[a-z0-9]/gi) || []).length;
const digits = (s: string) => (s.replace(/\D/g, ''));

export function parseBillDetails(raw: string): ParsedBill {
  const out: ParsedBill = { ...EMPTY, phones: [] };
  if (!raw || !raw.trim()) return out;
  const lines = raw.split('\n').map((l) => l.trim()).filter((l) => l && alnum(l) >= 3);
  if (!lines.length) return out;
  const text = lines.join('\n');

  /* GSTIN — strict 15-char pattern, phir OCR-noise-tolerant fallback */
  const upper = text.toUpperCase();
  const fixGstin = (tok: string) => {
    // position-aware OCR correction: 07AAECK2795F1ZE
    const c = tok.split('');
    for (const i of [0, 1]) c[i] = { O: '0', I: '1', L: '1', S: '5', B: '8' }[c[i]] ?? c[i];
    for (const i of [7, 8, 9, 10]) c[i] = { O: '0', I: '1', L: '1', S: '5', B: '8' }[c[i]] ?? c[i];
    if (c[13] === '2') c[13] = 'Z';
    return c.join('');
  };
  const strict = upper.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/);
  if (strict) out.gstin = strict[0];
  else {
    const near = upper.match(/GSTI?N?[^A-Z0-9]{0,4}([A-Z0-9][A-Z0-9 ]{13,19})/)
      || upper.match(/\b([A-Z0-9 ]{18,20})\b/);
    if (near) {
      const tok = fixGstin(near[1].replace(/[^A-Z0-9]/g, '').slice(0, 15));
      if (/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(tok)) out.gstin = tok;
    }
  }

  /* FSSAI — 14 digits */
  const fss = text.match(/FSSAI?\D{0,6}([\d ]{14,22})/i);
  if (fss) {
    const d = digits(fss[1]);
    if (d.length >= 14) out.fssai = d.slice(0, 14);
  }

  /* CIN — U12345DL2010PTC123456 */
  const cin = upper.match(/CIN[^A-Z0-9]{0,4}([A-Z0-9-]{20,24})/);
  if (cin) {
    const tok = cin[1].replace(/[^A-Z0-9]/g, '');
    if (/^[A-Z]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(tok)) out.cin = tok;
  }

  /* Phones — 10-digit mobiles + STD landlines */
  const debarred = new Set([out.gstin, out.fssai, out.cin]);
  const mobText = text.replace(/(\d)[\/,|](\d)/g, '$1 $2');
  const mobiles = mobText.match(/\b[6-9]\d{9}\b/g) || [];
  const lands = (text.match(/\b0\d{2,4}[-\s]?\d{6,8}\b/g) || []).map((l) => digits(l));
  for (const p of [...mobiles, ...lands]) {
    if (!debarred.has(p) && !out.phones.includes(p) && out.phones.length < 3) out.phones.push(p);
  }

  /* Email + website (TLD me 2+ akshar — "CGST@2.5" jaisa kachra nahi) */
  const em = text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/i);
  if (em) out.email = em[0].toLowerCase();
  const deSpaced = text.replace(/(www\.)\s+/gi, '$1').replace(/\s+\./g, '.');
  const ws = deSpaced.match(/(www\.[a-z0-9.-]+\.[a-z]{2,})/i);
  if (ws) out.website = ws[0].toLowerCase();

  /* Shop name — pehli saaf, non-marker line */
  let nameIdx = -1;
  for (let i = 0; i < Math.min(4, lines.length); i++) {
    const l = lines[i].replace(/^[^a-z0-9(]+/i, '');
    if (!isMarker(l) && alnum(l) >= 4 && /[a-z]/i.test(l)) { out.shopName = l; nameIdx = i; break; }
  }

  /* Tagline — naam ke baad wali bina-digit chhoti line */
  let addrFrom = nameIdx + 1;
  if (nameIdx >= 0 && nameIdx + 1 < lines.length) {
    const l = lines[nameIdx + 1];
    if (!isMarker(l) && !/\d/.test(l) && l.length <= 48 && alnum(l) >= 4) {
      out.tagline = l; addrFrom = nameIdx + 2;
    }
  }

  /* Address — marker/phone/email line tak ki 1-3 linein */
  const addr: string[] = [];
  for (let i = addrFrom; i < lines.length && addr.length < 3; i++) {
    const l = lines[i];
    if (isMarker(l)) break;
    if (digits(l).length >= 10 && (l.match(/[a-z]/gi) || []).length <= 2) continue; // sirf phone/fax wali line
    if (/@/.test(l) || /www\./i.test(l)) continue;
    if (/^[-=*_~#]{3,}/.test(l)) continue;
    addr.push(l.replace(/^(address|add)\s*[:\-]\s*/i, ''));
    if (/\b\d{6}\b/.test(l)) break;                              // pincode mil gaya
  }
  out.address = addr.join(', ');

  return out;
}

/** Parsed bill → shop settings (sirf mile hue fields). */
export function parsedToSettings(p: ParsedBill): Partial<Settings> {
  const o: Partial<Settings> = {};
  if (p.shopName) o.shopName = p.shopName;
  if (p.tagline) o.tagline = p.tagline;
  if (p.address) o.address = p.address;
  if (p.phones[0]) o.phone = p.phones[0];
  if (p.phones[1]) o.phone2 = p.phones[1];
  if (p.email) o.email = p.email;
  if (p.website) o.website = p.website;
  if (p.gstin) o.gstin = p.gstin;
  if (p.fssai) o.fssai = p.fssai;
  if (p.cin) o.cinNo = p.cin;
  return o;
}
