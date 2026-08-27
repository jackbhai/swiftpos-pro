import { memo } from 'react';
import { Star, AlertTriangle } from 'lucide-react';
import type { Product } from '@/db/types';
import { money, cx } from '@/lib/format';
import { stockState } from '@/lib/calc';
import { useSettings } from '@/store/settings';

interface Props { products: Product[]; onPick: (p: Product) => void; onLong?: (p: Product) => void; layout: 'grid' | 'list'; cols: number }

function ProductGridImpl({ products, onPick, onLong, layout, cols }: Props) {
  const s = useSettings();
  if (layout === 'list') {
    return (
      <div className="space-y-1.5">
        {products.map((p) => {
          const st = stockState(p);
          return (
            <button key={p.id} onClick={() => onPick(p)} onContextMenu={(e) => { e.preventDefault(); onLong?.(p); }}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition hover:border-brand/50 active:scale-[.99]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface2 text-base">{p.image ?? '📦'}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-ink">{p.name}</span>
                  {p.favorite && <Star size={11} className="shrink-0 fill-warn text-warn" />}
                </span>
                <span className="block truncate text-[11px] text-ink3">{p.brand ? p.brand + ' · ' : ''}{p.category}{p.batch ? ' · B:' + p.batch : ''}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm font-bold text-ink">{money(p.price, s.currency)}</span>
                <span className={cx('block text-[10px] font-bold', st === 'out' ? 'text-bad' : st === 'low' ? 'text-warn' : 'text-ink3')}>{p.stock} {p.unit}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {products.map((p) => {
        const st = stockState(p);
        return (
          <button key={p.id} onClick={() => onPick(p)} onContextMenu={(e) => { e.preventDefault(); onLong?.(p); }}
            className={cx('group relative flex flex-col overflow-hidden rounded-xl border bg-surface p-2.5 text-left transition active:scale-[.97]',
              st === 'out' ? 'border-bad/30 opacity-60' : 'border-line hover:border-brand/60 hover:shadow-glow')}>
            {p.favorite && <Star size={11} className="absolute right-2 top-2 fill-warn text-warn" />}
            {st !== 'ok' && <AlertTriangle size={11} className={cx('absolute left-2 top-2', st === 'out' ? 'text-bad' : 'text-warn')} />}
            {s.showImages && <span className="mb-1.5 mt-2 block text-center text-2xl">{p.image ?? '📦'}</span>}
            <span className="line-clamp-2 min-h-[32px] text-[12px] font-semibold leading-tight text-ink">{p.name}</span>
            <span className="mt-1 flex items-end justify-between gap-1">
              <span className="font-mono text-sm font-extrabold text-brand">{money(p.price, s.currency)}</span>
              <span className={cx('text-[10px] font-bold', st === 'out' ? 'text-bad' : st === 'low' ? 'text-warn' : 'text-ink3')}>{p.stock}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default memo(ProductGridImpl);
