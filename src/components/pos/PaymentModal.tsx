import { useEffect, useMemo, useState } from 'react';
import { Banknote, Smartphone, CreditCard, Wallet, HandCoins, Split, CheckCircle2 } from 'lucide-react';
import { Modal, Field, Input } from '@/components/ui';
import UpiPay from './UpiPay';
import { money, cx } from '@/lib/format';
import { useSettings } from '@/store/settings';
import type { PayMode, SplitPart, GiftCard } from '@/db/types';
import { db } from '@/db/db';
import { toast } from '@/store/ui';
import { clickSound, buzz } from '@/lib/sound';

const MODES: { id: PayMode; label: string; icon: any }[] = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'upi', label: 'UPI / QR', icon: Smartphone },
  { id: 'card', label: 'Card / POS', icon: CreditCard },
  { id: 'wallet', label: 'Gift / Wallet', icon: Wallet },
  { id: 'credit', label: 'Credit (Udhaar)', icon: HandCoins },
  { id: 'split', label: 'Split Pay', icon: Split },
];

export default function PaymentModal({
  open,
  onClose,
  total,
  onConfirm,
  hasCustomer,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  hasCustomer: boolean;
  onConfirm: (mode: PayMode, tendered?: number, splits?: SplitPart[]) => void;
}) {
  const s = useSettings();
  const [mode, setMode] = useState<PayMode>('cash');
  const [tendered, setTendered] = useState('');
  const [splits, setSplits] = useState<SplitPart[]>([
    { mode: 'cash', amount: 0 },
    { mode: 'upi', amount: 0 },
  ]);

  const [cardCode, setCardCode] = useState('');
  const [card, setCard] = useState<GiftCard | null>(null);

  useEffect(() => {
    if (open) {
      setMode('cash');
      setTendered('');
      setCardCode('');
      setCard(null);
      setSplits([
        { mode: 'cash', amount: Math.floor(total / 2) },
        { mode: 'upi', amount: +(total - Math.floor(total / 2)).toFixed(2) },
      ]);
    }
  }, [open, total]);

  const lookupCard = async () => {
    const code = cardCode.trim().toUpperCase();
    if (!code) return;
    clickSound();
    const found = await db.giftCards.where('code').equals(code).first();
    if (!found) {
      setCard(null);
      return toast('Gift card not found', 'err');
    }
    if (!found.active) {
      setCard(null);
      return toast('This card is inactive', 'err');
    }
    if (found.expiry && new Date(found.expiry).getTime() < Date.now()) {
      setCard(null);
      return toast('Card has expired', 'err');
    }
    setCard(found);
    toast(`Available balance: ${money(found.balance, s.currency)}`);
  };

  const redeemCard = async () => {
    if (!card) return;
    const use = Math.min(card.balance, total);
    const bal = +(card.balance - use).toFixed(2);
    await db.giftCards.update(card.id, {
      balance: bal,
      history: [
        ...(card.history || []),
        { ts: Date.now(), type: 'redeem' as const, amount: use, ref: 'POS bill' },
      ],
    });
    toast(`${money(use, s.currency)} redeemed from gift card`);
  };

  const tenderNum = parseFloat(tendered || '0');
  const change = tenderNum - total;
  const splitSum = splits.reduce((t, x) => t + (+x.amount || 0), 0);

  const quick = useMemo(() => {
    const base = [
      total,
      Math.ceil(total / 10) * 10,
      Math.ceil(total / 50) * 50,
      Math.ceil(total / 100) * 100,
      Math.ceil(total / 500) * 500,
    ];
    return [...new Set([...base, ...s.quickCash].filter((v) => v >= total))]
      .sort((a, b) => a - b)
      .slice(0, 6);
  }, [total, s.quickCash]);

  const ready =
    mode === 'split'
      ? Math.abs(splitSum - total) < 0.5
      : mode === 'cash'
      ? !tendered || tenderNum >= total
      : true;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Complete Payment & Settle"
      footer={
        <button
          disabled={!ready}
          className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 shadow-glow active:scale-[0.98]"
          onClick={async () => {
            if (mode === 'wallet' && card) await redeemCard();
            onConfirm(
              mode,
              mode === 'cash' && tendered ? tenderNum : undefined,
              mode === 'split' ? splits.filter((x) => +x.amount > 0) : undefined,
            );
          }}
        >
          <CheckCircle2 size={18} />
          <span>Confirm Payment ({money(total, s.currency)})</span>
        </button>
      }
    >
      {/* Total Display */}
      <div className="rounded-2xl border border-brand/40 bg-gradient-to-b from-brand/15 to-surface2/80 p-4 text-center shadow-sm">
        <p className="text-[11px] uppercase tracking-widest text-ink3 font-extrabold">Amount Due</p>
        <p className="font-mono text-4xl font-extrabold text-brand tracking-tight mt-0.5">
          {money(total, s.currency)}
        </p>
      </div>

      {/* Payment Modes */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {MODES.filter((m) => s.enabledPayModes.includes(m.id)).map((m) => {
          const Icon = m.icon;
          const disabled = m.id === 'credit' && !hasCustomer;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              disabled={disabled}
              onClick={() => {
                clickSound();
                buzz('light');
                setMode(m.id);
              }}
              className={cx(
                'flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 text-xs font-bold transition-all active:scale-95 disabled:opacity-30',
                active
                  ? 'border-brand bg-brand/15 text-brand shadow-glow ring-1 ring-brand/40'
                  : 'border-line bg-surface2/60 text-ink2 hover:border-brand/40 hover:bg-surface2',
              )}
            >
              <Icon size={20} className={active ? 'drop-shadow-[0_0_6px_rgba(var(--brand),0.6)]' : ''} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode: Cash */}
      {mode === 'cash' && (
        <div className="mt-4 space-y-3">
          <Field label="Cash Tendered / Received">
            <Input
              inputMode="decimal"
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              placeholder={String(total)}
              autoFocus
            />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button
                key={q}
                className={cx('chip font-mono', tendered === String(q) && 'chip-on')}
                onClick={() => {
                  clickSound();
                  setTendered(String(q));
                }}
              >
                {money(q, s.currency)}
              </button>
            ))}
          </div>
          {tendered && (
            <div
              className={cx(
                'rounded-2xl border p-3 text-center font-mono text-lg font-bold transition',
                change >= 0
                  ? 'border-ok/40 bg-ok/10 text-ok'
                  : 'border-bad/40 bg-bad/10 text-bad',
              )}
            >
              {change >= 0 ? `Change: ${money(change, s.currency)}` : `Short by ${money(-change, s.currency)}`}
            </div>
          )}
        </div>
      )}

      {/* Mode: Split */}
      {mode === 'split' && (
        <div className="mt-4 space-y-2.5">
          <p className="label">Split Payment Breakdown</p>
          {splits.map((sp, i) => (
            <div key={i} className="flex gap-2">
              <select
                className="input w-36 font-bold"
                value={sp.mode}
                onChange={(e) =>
                  setSplits(
                    splits.map((x, j) => (j === i ? { ...x, mode: e.target.value as any } : x)),
                  )
                }
              >
                {['cash', 'upi', 'card', 'wallet', 'credit'].map((m) => (
                  <option key={m} value={m}>
                    {m.toUpperCase()}
                  </option>
                ))}
              </select>
              <Input
                inputMode="decimal"
                value={sp.amount || ''}
                placeholder="0"
                onChange={(e) =>
                  setSplits(
                    splits.map((x, j) => (j === i ? { ...x, amount: +e.target.value || 0 } : x)),
                  )
                }
              />
            </div>
          ))}
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              className="text-brand font-bold hover:underline"
              onClick={() => setSplits([...splits, { mode: 'cash', amount: 0 }])}
            >
              + Add Another Split Part
            </button>
            <span
              className={cx(
                'font-mono font-bold',
                Math.abs(splitSum - total) < 0.5 ? 'text-ok' : 'text-warn',
              )}
            >
              Split: {money(splitSum, s.currency)} / {money(total, s.currency)}
            </span>
          </div>
        </div>
      )}

      {/* Mode: UPI */}
      {(mode === 'upi' || (mode === 'split' && splits.some((x) => x.mode === 'upi'))) &&
        s.showUpiQrOnPayment && (
          <div className="mt-4">
            <UpiPay
              amount={
                mode === 'upi'
                  ? total
                  : splits.filter((x) => x.mode === 'upi').reduce((t, x) => t + (+x.amount || 0), 0)
              }
              note="Bill payment"
            />
          </div>
        )}

      {/* Mode: Wallet / Gift Card */}
      {mode === 'wallet' && (
        <div className="mt-4 space-y-2.5">
          <Field label="Gift Card / Customer Wallet Code">
            <div className="flex gap-2">
              <Input
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && lookupCard()}
                placeholder="e.g. GC-8K2M-4QT9"
              />
              <button className="btn-soft" onClick={lookupCard}>
                Lookup
              </button>
            </div>
          </Field>
          {card && (
            <div
              className={cx(
                'rounded-2xl border p-3 text-xs leading-relaxed',
                card.balance >= total
                  ? 'border-ok/40 bg-ok/10 text-ok'
                  : 'border-warn/40 bg-warn/10 text-warn',
              )}
            >
              <b>{card.kind.toUpperCase()} Card</b> · Available Balance:{' '}
              <b>{money(card.balance, s.currency)}</b>
              <br />
              {card.balance >= total
                ? `Full bill covered by card. Remaining balance will be ${money(card.balance - total, s.currency)}.`
                : `Card balance will cover ${money(card.balance, s.currency)}. Please collect remaining ${money(total - card.balance, s.currency)}.`}
            </div>
          )}
        </div>
      )}

      {/* Mode: Credit */}
      {mode === 'credit' && (
        <div className="mt-4 rounded-2xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn leading-relaxed">
          This amount will be booked directly to the customer's ledger khata. Ensure customer name and phone number are selected.
        </div>
      )}
    </Modal>
  );
}
