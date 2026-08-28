import { useEffect, useMemo, useState } from 'react';
import { Banknote, Smartphone, CreditCard, Wallet, HandCoins, Split } from 'lucide-react';
import { Modal, Field, Input } from '@/components/ui';
import UpiPay from './UpiPay';
import { money, cx } from '@/lib/format';
import { useSettings } from '@/store/settings';
import type { PayMode, SplitPart, GiftCard } from '@/db/types';
import { db } from '@/db/db';
import { toast } from '@/store/ui';

const MODES: { id: PayMode; label: string; icon: any }[] = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'credit', label: 'Credit', icon: HandCoins },
  { id: 'split', label: 'Split', icon: Split },
];

export default function PaymentModal({ open, onClose, total, onConfirm, hasCustomer }: {
  open: boolean; onClose: () => void; total: number; hasCustomer: boolean;
  onConfirm: (mode: PayMode, tendered?: number, splits?: SplitPart[]) => void;
}) {
  const s = useSettings();
  const [mode, setMode] = useState<PayMode>('cash');
  const [tendered, setTendered] = useState('');
  const [splits, setSplits] = useState<SplitPart[]>([{ mode: 'cash', amount: 0 }, { mode: 'upi', amount: 0 }]);

  const [cardCode, setCardCode] = useState('');
  const [card, setCard] = useState<GiftCard | null>(null);

  useEffect(() => { if (open) { setMode('cash'); setTendered(''); setCardCode(''); setCard(null); setSplits([{ mode: 'cash', amount: 0 }, { mode: 'upi', amount: 0 }]); } }, [open]);

  const lookupCard = async () => {
    const code = cardCode.trim().toUpperCase();
    if (!code) return;
    const found = await db.giftCards.where('code').equals(code).first();
    if (!found) { setCard(null); return toast('Card code nahi mila', 'err'); }
    if (!found.active) { setCard(null); return toast('Ye card active nahi hai', 'err'); }
    if (found.expiry && new Date(found.expiry).getTime() < Date.now()) { setCard(null); return toast('Card expire ho chuka hai', 'err'); }
    setCard(found);
    toast(`Balance ${money(found.balance, s.currency)}`);
  };

  const redeemCard = async () => {
    if (!card) return;
    const use = Math.min(card.balance, total);
    const bal = +(card.balance - use).toFixed(2);
    await db.giftCards.update(card.id, {
      balance: bal,
      history: [...(card.history || []), { ts: Date.now(), type: 'redeem' as const, amount: use, ref: 'POS bill' }],
    });
    toast(`${money(use, s.currency)} card se cut hua · balance ${money(bal, s.currency)}`);
  };

  const tenderNum = parseFloat(tendered || '0');
  const change = tenderNum - total;
  const splitSum = splits.reduce((t, x) => t + (+x.amount || 0), 0);
  const quick = useMemo(() => {
    const base = [total, Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500];
    return [...new Set([...base, ...s.quickCash].filter((v) => v >= total))].sort((a, b) => a - b).slice(0, 6);
  }, [total, s.quickCash]);

  const ready = mode === 'split' ? Math.abs(splitSum - total) < 0.5 : mode === 'cash' ? (!tendered || tenderNum >= total) : true;

  return (
    <Modal open={open} onClose={onClose} title="Take payment"
      footer={
        <button disabled={!ready} className="btn-primary w-full py-3 text-base"
          onClick={async () => { if (mode === 'wallet' && card) await redeemCard(); onConfirm(mode, mode === 'cash' && tendered ? tenderNum : undefined, mode === 'split' ? splits.filter((x) => +x.amount > 0) : undefined); }}>
          Confirm {money(total, s.currency)}
        </button>
      }>
      <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4 text-center">
        <p className="text-[11px] uppercase tracking-widest text-ink3">Amount due</p>
        <p className="font-mono text-4xl font-extrabold text-brand">{money(total, s.currency)}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {MODES.filter((m) => s.enabledPayModes.includes(m.id)).map((m) => {
          const Icon = m.icon;
          const disabled = m.id === 'credit' && !hasCustomer;
          return (
            <button key={m.id} disabled={disabled} onClick={() => setMode(m.id)}
              className={cx('flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-bold transition disabled:opacity-30',
                mode === m.id ? 'border-brand bg-brand/10 text-brand' : 'border-line text-ink2 hover:border-brand/40')}>
              <Icon size={18} />{m.label}
            </button>
          );
        })}
      </div>

      {mode === 'cash' && (
        <div className="mt-4 space-y-3">
          <Field label="Cash tendered">
            <Input inputMode="decimal" value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder={String(total)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {quick.map((q) => <button key={q} className="chip" onClick={() => setTendered(String(q))}>{money(q, s.currency)}</button>)}
          </div>
          {tendered && (
            <div className={cx('rounded-xl border p-3 text-center font-mono text-lg font-bold', change >= 0 ? 'border-ok/40 bg-ok/10 text-ok' : 'border-bad/40 bg-bad/10 text-bad')}>
              {change >= 0 ? `Change ${money(change, s.currency)}` : `Short ${money(-change, s.currency)}`}
            </div>
          )}
        </div>
      )}

      {mode === 'split' && (
        <div className="mt-4 space-y-2">
          {splits.map((sp, i) => (
            <div key={i} className="flex gap-2">
              <select className="input w-32" value={sp.mode} onChange={(e) => setSplits(splits.map((x, j) => (j === i ? { ...x, mode: e.target.value as any } : x)))}>
                {['cash', 'upi', 'card', 'wallet', 'credit'].map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
              <Input inputMode="decimal" value={sp.amount || ''} placeholder="0"
                onChange={(e) => setSplits(splits.map((x, j) => (j === i ? { ...x, amount: +e.target.value || 0 } : x)))} />
            </div>
          ))}
          <div className="flex items-center justify-between text-xs">
            <button className="text-brand font-bold" onClick={() => setSplits([...splits, { mode: 'cash', amount: 0 }])}>+ Add part</button>
            <span className={cx('font-mono', Math.abs(splitSum - total) < 0.5 ? 'text-ok' : 'text-warn')}>{money(splitSum, s.currency)} / {money(total, s.currency)}</span>
          </div>
        </div>
      )}

      {(mode === 'upi' || (mode === 'split' && splits.some((x) => x.mode === 'upi'))) && s.showUpiQrOnPayment && (
        <div className="mt-4"><UpiPay amount={mode === 'upi' ? total : splits.filter((x) => x.mode === 'upi').reduce((t, x) => t + (+x.amount || 0), 0)} note="Bill payment" /></div>
      )}

      {mode === 'wallet' && (
        <div className="mt-4 space-y-2">
          <Field label="Gift card / wallet code (optional)">
            <div className="flex gap-2">
              <Input value={cardCode} onChange={(e) => setCardCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && lookupCard()} placeholder="e.g. GC-8K2M-4QT9" />
              <button className="btn-soft" onClick={lookupCard}>Check</button>
            </div>
          </Field>
          {card && (
            <div className={cx('rounded-xl border p-3 text-xs', card.balance >= total ? 'border-ok/30 bg-ok/10 text-ok' : 'border-warn/30 bg-warn/10 text-warn')}>
              {card.kind} · balance <b>{money(card.balance, s.currency)}</b>
              {card.balance >= total
                ? ` — pura bill card se cut ho jaega, ${money(card.balance - total, s.currency)} bachega.`
                : ` — sirf ${money(card.balance, s.currency)} cut hoga, baaki ${money(total - card.balance, s.currency)} alag se lijiye.`}
            </div>
          )}
        </div>
      )}

      {mode === 'credit' && <p className="mt-4 rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">This amount will be added to the customer's outstanding credit balance.</p>}
    </Modal>
  );
}
