import { memo } from 'react';
import { Star, AlertTriangle, Sparkles } from 'lucide-react';
import type { Product } from '@/db/types';
import { money, cx } from '@/lib/format';
import { stockState } from '@/lib/calc';
import { useSettings } from '@/store/settings';

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
        'group flex h-full w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-150 active:scale-[.98]',
        st === 'out'
          ? 'border-bad/30 bg-surface/40 opacity-55'
          : 'border-line bg-surface/90 hover:border-brand/60 hover:bg-surface2 hover:shadow-glow',
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface2/90 border border-line/60 text-lg group-hover:scale-105 transition">
        {p.image ?? '📦'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-ink">{p.name}</span>
          {p.favorite && <Star size={12} className="shrink-0 fill-warn text-warn" />}
          {discountPct > 0 && (
            <span className="rounded bg-ok/15 px-1 py-0.2 text-[9px] font-extrabold text-ok">
              {discountPct}% OFF
            </span>
          )}
        </span>
        <span className="block truncate text-[11px] text-ink3 font-medium">
          {p.brand ? p.brand + ' · ' : ''}
          {p.category}
          {p.barcode ? ' · ' + p.barcode : ''}
          {p.batch ? ' · B:' + p.batch : ''}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-sm font-extrabold text-ink">{money(p.price, s.currency)}</span>
        {p.mrp && p.mrp > p.price && (
          <span className="block font-mono text-[10px] text-ink3 line-through">{money(p.mrp, s.currency)}</span>
        )}
        <span
          className={cx(
            'block text-[10px] font-bold',
            st === 'out' ? 'text-bad' : st === 'low' ? 'text-warn' : 'text-ok',
          )}
        >
          {st === 'out' ? 'Out of stock' : `${p.stock} ${p.unit || 'pcs'}`}
        </span>
      </span>
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
        'group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left transition-all duration-150 active:scale-[.96]',
        st === 'out'
          ? 'border-bad/30 bg-surface/40 opacity-55'
          : 'border-line bg-surface/85 hover:border-brand/70 hover:bg-surface2/90 hover:shadow-glow',
      )}
    >
      {/* Top badges */}
      <div className="flex items-center justify-between w-full">
        {discountPct > 0 ? (
          <span className="rounded-md bg-ok/20 border border-ok/30 px-1.5 py-0.5 text-[9px] font-extrabold text-ok">
            {discountPct}% OFF
          </span>
        ) : (
          <span className="text-[10px] text-ink3 truncate max-w-[80px]">{p.category}</span>
        )}

        <div className="flex items-center gap-1">
          {p.favorite && <Star size={12} className="fill-warn text-warn" />}
          {st !== 'ok' && (
            <AlertTriangle
              size={12}
              className={cx(st === 'out' ? 'text-bad fill-bad/20' : 'text-warn fill-warn/20')}
            />
          )}
        </div>
      </div>

      {/* Image or Icon */}
      {s.showImages && (
        <span className="my-1.5 block text-center text-3xl group-hover:scale-110 transition duration-150">
          {p.image ?? '📦'}
        </span>
      )}

      {/* Product Name */}
      <div className="my-1">
        <span className="line-clamp-2 min-h-[30px] text-xs font-bold leading-tight text-ink group-hover:text-brand transition">
          {p.name}
        </span>
        {p.brand && <span className="block truncate text-[10px] text-ink3">{p.brand}</span>}
      </div>

      {/* Price & Stock bar */}
      <div className="mt-1 pt-1.5 border-t border-line/40 flex items-end justify-between gap-1">
        <div>
          <span className="block font-mono text-sm font-extrabold text-brand">
            {money(p.price, s.currency)}
          </span>
          {p.mrp && p.mrp > p.price && (
            <span className="block font-mono text-[9px] text-ink3 line-through">
              {money(p.mrp, s.currency)}
            </span>
          )}
        </div>
        <span
          className={cx(
            'rounded-full px-2 py-0.5 text-[9px] font-extrabold',
            st === 'out'
              ? 'bg-bad/15 text-bad'
              : st === 'low'
              ? 'bg-warn/15 text-warn'
              : 'bg-surface2 text-ink3 border border-line/60',
          )}
        >
          {st === 'out' ? '0' : `${p.stock} ${p.unit || ''}`}
        </span>
      </div>
    </button>
  );
});

function ProductGridImpl({ products, onPick, onLong, layout, cols }: Props) {
  const s = useSettings();
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
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {products.map((p) => (
        <ProductCard key={p.id} p={p} onPick={onPick} onLong={onLong} />
      ))}
    </div>
  );
}

export default memo(ProductGridImpl);
