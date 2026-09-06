import { useEffect, useMemo, useState } from 'react';
import { Scale, Plus } from 'lucide-react';
import type { Product } from '@/db/types';
import { Modal, Field, Input } from '@/components/ui';
import { money, cx } from '@/lib/format';
import { useSettings } from '@/store/settings';
import {
  formatQty, inputUnits, parseCustomWeight, weightFamily, weightPresets,
} from '@/lib/weight';

interface Props {
  product: Product | null;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}

/** Kirana / sweets weight picker — presets + custom grams / kg / ml / litre. */
export default function WeightPicker({ product, onClose, onConfirm }: Props) {
  const s = useSettings();
  const presets = useMemo(() => (product ? weightPresets(product.unit) : []), [product]);
  const units = useMemo(() => (product ? inputUnits(product.unit) : []), [product]);
  const family = product ? weightFamily(product.unit) : null;

  const [picked, setPicked] = useState<string | null>(presets[3]?.id ?? null);
  const [custom, setCustom] = useState('');
  const [customUnit, setCustomUnit] = useState(units[0]?.id ?? 'g');

  useEffect(() => {
    if (!product) return;
    const next = weightPresets(product.unit);
    const nextUnits = inputUnits(product.unit);
    setPicked(next[3]?.id ?? next[0]?.id ?? null);
    setCustom('');
    setCustomUnit(nextUnits[0]?.id ?? 'g');
  }, [product?.id, product?.unit]);

  if (!product) return null;

  const customQty = custom.trim() ? parseCustomWeight(`${custom} ${customUnit}`, product.unit) : null;
  const preset = presets.find((p) => p.id === picked);
  const qty = customQty && customQty > 0 ? customQty : (preset?.qty ?? 0);
  const amount = +(qty * product.price).toFixed(2);
  const perLabel = family === 'volume' ? `per ${product.unit === 'ml' ? 'ml' : 'liter'}` : `per ${product.unit === 'g' ? 'gram' : 'kg'}`;

  const applyPreset = (id: string) => {
    setPicked(id);
    setCustom('');
  };

  const applyManual = (raw: string) => {
    setCustom(raw);
    if (raw.trim()) setPicked(null);
  };

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      title={`Wazan chuniye · ${product.name}`}
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1"
            disabled={!(qty > 0)}
            onClick={() => qty > 0 && onConfirm(qty)}
          >
            <Plus size={15} /> Add {formatQty(qty, product.unit)} · {money(amount, s.currency)}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand">
          <Scale size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-ink">{product.name}</p>
          <p className="text-[11px] text-ink3">
            {money(product.price, s.currency)} {perLabel}
            {product.stock > 0 && <> · stock {formatQty(product.stock, product.unit)}</>}
          </p>
        </div>
      </div>

      <p className="label mt-4">Ready packs — tap to add</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className={cx(
              'rounded-2xl border px-3 py-3 text-left transition active:scale-[.98]',
              picked === p.id && !custom.trim()
                ? 'border-brand bg-brand/15 shadow-glow'
                : 'border-line bg-surface2/50 hover:border-brand/40',
            )}
          >
            <p className="text-sm font-extrabold text-ink">{p.label}</p>
            <p className="text-[11px] text-ink3">
              {p.hint} · {money(+(p.qty * product.price).toFixed(2), s.currency)}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface2/40 p-3">
        <p className="text-xs font-bold text-ink">Custom weight — khud likhiye</p>
        <p className="mt-0.5 text-[11px] text-ink3">
          Jaise 350 gram, 1.25 kg, 600 ml. Pack size alag ho to yahin type kijiye.
        </p>
        <div className="mt-2 flex gap-2">
          <Field label="Weight" className="flex-1">
            <Input
              inputMode="decimal"
              autoFocus
              value={custom}
              placeholder={family === 'volume' ? 'e.g. 600' : 'e.g. 350'}
              onChange={(e) => applyManual(e.target.value.replace(/[^0-9.]/g, ''))}
            />
          </Field>
          <Field label="Unit" className="w-28">
            <div className="flex h-[42px] overflow-hidden rounded-xl border border-line">
              {units.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setCustomUnit(u.id);
                    if (custom.trim()) setPicked(null);
                  }}
                  className={cx('flex-1 text-[11px] font-bold', customUnit === u.id ? 'bg-brand text-black' : 'bg-surface text-ink2')}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </Field>
        </div>
        {custom.trim() && customQty == null && (
          <p className="mt-1.5 text-[11px] text-bad">Wazan sahi number me likhiye.</p>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-line p-3 text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink3">Bill amount</p>
        <p className="font-mono text-2xl font-extrabold text-brand">{money(amount, s.currency)}</p>
        <p className="text-[11px] text-ink3">
          {qty > 0 ? `${formatQty(qty, product.unit)} × ${money(product.price, s.currency)}` : 'Pack ya custom weight chuniye'}
        </p>
      </div>
    </Modal>
  );
}
