import { useEffect, useState } from 'react';
import { Copy, Check, ExternalLink, QrCode, RefreshCw } from 'lucide-react';
import { useSettings, type UpiAccount } from '@/store/settings';
import { upiLink, appLink, qrDataUrl, maskVpa } from '@/lib/upi';
import { money, cx } from '@/lib/format';
import { toast } from '@/store/ui';

export default function UpiPay({ amount, note, compact }: { amount: number; note?: string; compact?: boolean }) {
  const s = useSettings();
  const accounts = s.upiAccounts.filter((u) => u.active);
  const [sel, setSel] = useState<UpiAccount | null>(null);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSel(accounts.find((u) => u.isDefault) ?? accounts[0] ?? null);
  }, [s.upiAccounts.length]);

  useEffect(() => {
    let alive = true;
    if (!sel) { setQr(''); return; }
    qrDataUrl(upiLink(sel, amount, note, note), s.upiQrSize)
      .then((d) => alive && setQr(d)).catch(() => alive && setQr(''));
    return () => { alive = false; };
  }, [sel?.id, amount, note, s.upiQrSize]);

  if (!accounts.length) {
    return (
      <div className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
        No UPI ID added yet. Go to <b>Settings → Payments &amp; UPI</b> to add one (you can store as many as you like).
      </div>
    );
  }

  const link = sel ? upiLink(sel, amount, note, note) : '';

  return (
    <div className="space-y-2">
      {accounts.length > 1 && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {accounts.map((u) => (
            <button key={u.id} onClick={() => setSel(u)} className={cx('chip', sel?.id === u.id && 'chip-on')}>
              {u.label}{u.isDefault ? ' ★' : ''}
            </button>
          ))}
        </div>
      )}
      <div className={cx('flex items-center gap-3 rounded-2xl border border-line bg-surface2/50 p-3', compact ? '' : 'flex-col sm:flex-row')}>
        <div className="grid shrink-0 place-items-center rounded-xl bg-white p-2">
          {qr ? <img src={qr} alt="UPI QR" className={compact ? 'h-24 w-24' : 'h-40 w-40'} />
              : <div className={cx('grid place-items-center text-black/40', compact ? 'h-24 w-24' : 'h-40 w-40')}><QrCode size={28} /></div>}
        </div>
        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-ink3">Scan &amp; pay</p>
            <p className="font-mono text-lg font-extrabold text-brand">{money(amount, s.currency)}</p>
            <p className="truncate font-mono text-xs text-ink2">{sel?.vpa}</p>
            <p className="text-[11px] text-ink3">{sel?.payeeName}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
            <button className="chip" onClick={() => { navigator.clipboard.writeText(sel!.vpa); setCopied(true); toast('UPI ID copied'); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? <Check size={11} className="mr-1 inline" /> : <Copy size={11} className="mr-1 inline" />}Copy ID
            </button>
            <a className="chip" href={link}><ExternalLink size={11} className="mr-1 inline" />Any UPI app</a>
            <a className="chip" href={appLink('gpay', link)}>GPay</a>
            <a className="chip" href={appLink('phonepe', link)}>PhonePe</a>
            <a className="chip" href={appLink('paytm', link)}>Paytm</a>
          </div>
        </div>
      </div>
    </div>
  );
}
