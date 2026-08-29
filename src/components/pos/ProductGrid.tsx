import { memo } from 'react';
import { Star, AlertTriangle } from 'lucide-react';
import type { Product } from '@/db/types';
import { money, cx } from '@/lib/format';
import { stockState } from '@/lib/calc';
import { useSettings } from '@/store/settings';
import ProductImage from '@/components/ui/ProductImage';

interface Props {
  products: Product[];
  onPick: (p: Product) => void;
  onLong?: (p: Product) => void;
  layout: 'grid' | 'list';
  cols: number;
}

export const ProductRow = memo(function ProductRow({
  p,
  onPick,
  onLong,
}: {
  p: Product;
  onPick: (p: Product) => void;
  onLong?: (p: Product) => void;
}) {
  const s = useSettings();
  const st = stockState(p);
  const discountPct = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

  return (
    <button
      onClick={() => onPick(p)}
      onContextMenu={(e) => {
        e.preventDefault();
        onLong?.(p);
      }}
      className={cx(
        'group flex h-full w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-all duration-150 active:scale-[.98] overflow-hidden',
        st === 'out'
          ? 'border-bad/30 bg-surface/40 opacity-55'
          : 'border-line bg-surface/90 hover:border-brand/60 hover:bg-surface2 hover:shadow-glow',
      )}
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-surface2 border border-line/60 flex items-center justify-center group-hover:scale-105 transition">
        <ProductImage src={p.image} alt={p.name} emojiClassName="text-xl" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs sm:text-sm font-bold text-ink">{p.name}</span>
          {p.favorite && <Star size={11} className="shrink-0 fill-warn text-warn" />}
          {discountPct > 0 && (
            <span className="shrink-0 rounded bg-ok/15 px-1 py-0.2 text-[9px] font-extrabold text-ok">
              {discountPct}% OFF
            </span>
          )}
        </div>
        <p className="truncate text-[10px] sm:text-[11px] text-ink3 font-medium">
          {p.brand ? p.brand + ' · ' : ''}
          {p.category}
          {p.barcode ? ' · ' + p.barcode : ''}
          {p.batch ? ' · B:' + p.batch : ''}
        </p>
      </div>

      <div className="shrink-0 text-right pl-2">
        <span className="block font-mono text-xs sm:text-sm font-extrabold text-ink">
          {money(p.price, s.currency)}
        </span>
        {p.mrp && p.mrp > p.price && (
          <span className="block font-mono text-[9px] text-ink3 line-through">
            {money(p.mrp, s.currency)}
          </span>
        )}
        <span
          className={cx(
            'block text-[9px] sm:text-[10px] font-extrabold',
            st === 'out' ? 'text-bad' : st === 'low' ? 'text-warn' : 'text-ok',
          )}
        >
          {st === 'out' ? '0' : `${p.stock} ${p.unit || ''}`}
        </span>
      </div>
    </button>
  );
});

export const ProductCard = memo(function ProductCard({
  p,
  onPick,
  onLong,
}: {
  p: Product;
  onPick: (p: Product) => void;
  onLong?: (p: Product) => void;
}) {
  const s = useSettings();
  const st = stockState(p);
  const discountPct = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

  return (
    <button
      onClick={() => onPick(p)}
      onContextMenu={(e) => {
        e.preventDefault();
        onLong?.(p);
      }}
      className={cx(
        'group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border p-2.5 text-left transition-all duration-150 active:scale-[.96]',
        st === 'out'
          ? 'border-bad/30 bg-surface/40 opacity-55'
          : 'border-line bg-surface/85 hover:border-brand/70 hover:bg-surface2/90 hover:shadow-glow',
      )}
    >
      {/* Top Header Badge Row */}
      <div className="flex h-5 items-center justify-between w-full shrink-0">
        {discountPct > 0 ? (
          <span className="rounded bg-ok/20 border border-ok/30 px-1 py-0.2 text-[9px] font-extrabold text-ok leading-none">
            {discountPct}% OFF
          </span>
        ) : (
          <span className="text-[10px] text-ink3 truncate max-w-[90px] font-medium leading-none">
            {p.category}
          </span>
        )}

        <div className="flex items-center gap-1">
          {p.favorite && <Star size={11} className="fill-warn text-warn shrink-0" />}
          {st !== 'ok' && (
            <AlertTriangle
              size={11}
              className={cx(st === 'out' ? 'text-bad fill-bad/20' : 'text-warn fill-warn/20', 'shrink-0')}
            />
          )}
        </div>
      </div>

      {/* Image or Icon Container (fixed height) */}
      {s.showImages && (
        <div className="my-1 flex h-14 sm:h-16 w-full items-center justify-center overflow-hidden rounded-xl bg-surface2/40 shrink-0">
          <ProductImage src={p.image} alt={p.name} emojiClassName="text-3xl" />
        </div>
      )}

      {/* Title (fixed 2 lines height) */}
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <p className="line-clamp-2 text-xs font-bold leading-snug text-ink group-hover:text-brand transition">
          {p.name}
        </p>
      </div>

      {/* Price & Stock bar (fixed bottom row with border) */}
      <div className="mt-1 flex h-7 items-end justify-between gap-1 border-t border-line/40 pt-1 shrink-0">
        <div className="min-w-0 flex items-baseline gap-1">
          <span className="font-mono text-xs sm:text-sm font-extrabold text-brand truncate">
            {money(p.price, s.currency)}
          </span>
          {p.mrp && p.mrp > p.price && (
            <span className="hidden sm:inline font-mono text-[9px] text-ink3 line-through truncate">
              {money(p.mrp, s.currency)}
            </span>
          )}
        </div>
        <span
          className={cx(
            'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold',
            st === 'out'
              ? 'bg-bad/15 text-bad'
              : st === 'low'
              ? 'bg-warn/15 text-warn'
              : 'bg-surface2 text-ink2 border border-line/50',
          )}
        >
          {st === 'out' ? '0' : `${p.stock} ${p.unit || ''}`}
        </span>
      </div>
    </button>
  );
});

function ProductGridImpl({ products, onPick, onLong, layout, cols }: Props) {
  if (layout === 'list') {
    return (
      <div className="space-y-1.5">
        {products.map((p) => (
          <ProductRow key={p.id} p={p} onPick={onPick} onLong={onLong} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {products.map((p) => (
        <ProductCard key={p.id} p={p} onPick={onPick} onLong={onLong} />
      ))}
    </div>
  );
}

export default memo(ProductGridImpl);
