import type { UpiAccount } from '@/store/settings';

/** Build a UPI deep-link / QR payload (NPCI spec). */
export function upiLink(acc: UpiAccount, amount?: number, note?: string, txnRef?: string) {
  const p = new URLSearchParams();
  p.set('pa', acc.vpa);
  p.set('pn', acc.payeeName || acc.label || 'Merchant');
  if (amount && amount > 0) { p.set('am', amount.toFixed(2)); p.set('cu', 'INR'); }
  if (note) p.set('tn', note.slice(0, 50));
  if (txnRef) p.set('tr', txnRef.replace(/[^A-Za-z0-9]/g, '').slice(0, 35));
  if (acc.merchantCode) p.set('mc', acc.merchantCode);
  return `upi://pay?${p.toString()}`;
}

export const appLink = (app: 'gpay' | 'phonepe' | 'paytm' | 'bhim', link: string) => {
  const q = link.replace('upi://pay?', '');
  switch (app) {
    case 'gpay': return `tez://upi/pay?${q}`;
    case 'phonepe': return `phonepe://pay?${q}`;
    case 'paytm': return `paytmmp://pay?${q}`;
    default: return link;
  }
};

/** QR as a data-URL PNG (lazy-loads the encoder so it never bloats first paint). */
export async function qrDataUrl(text: string, size = 256, dark = '#000000', light = '#ffffff') {
  const QR = await import('qrcode');
  return QR.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: 'M', color: { dark, light } });
}

export const maskVpa = (vpa: string) => vpa.replace(/^(.{3}).*(@.*)$/, '$1•••$2');
export const validVpa = (vpa: string) => /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(vpa.trim());
