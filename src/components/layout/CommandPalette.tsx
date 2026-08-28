import { useCatalog } from '@/hooks/useCatalog';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Search, CornerDownLeft } from 'lucide-react';
import { NAV, visibleNav } from './nav';
import { useUI } from '@/store/ui';
import { useCustomers } from '@/hooks/useData';
import { useCart } from '@/store/cart';
import { useShop, useSettings } from '@/store/settings';
import { fuzzyScore } from '@/lib/calc';
import { money, cx } from '@/lib/format';

export default function CommandPalette() {
  const { paletteOpen, setPalette, toast } = useUI();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const { products } = useCatalog();
  const customers = useCustomers();
  const cart = useCart();
  const { system } = useShop();
  const showAllScreens = useSettings((x) => x.showAllScreens);
  const sysScreens = system.screens;

  useEffect(() => { if (paletteOpen) { setQ(''); setI(0); } }, [paletteOpen]);

  const results = useMemo(() => {
    const items: { id: string; label: string; sub: string; kind: string; run: () => void }[] = [];
    visibleNav(sysScreens, showAllScreens).forEach((n) => items.push({ id: n.path, label: n.label, sub: n.hint ?? 'Page', kind: 'Go', run: () => nav(n.path) }));
    (products || []).forEach((p: any) => items.push({
      id: p.id, label: p.name, sub: `${money(p.price)} · stock ${p.stock}`, kind: 'Add',
      run: () => { cart.add(p); toast(`${p.name} added to cart`); nav('/pos'); },
    }));
    (customers || []).forEach((c: any) => items.push({
      id: c.id, label: c.name, sub: c.phone, kind: 'Customer',
      run: () => { cart.setCustomer(c.id, c.name); toast(`${c.name} attached to bill`); nav('/pos'); },
    }));
    if (!q.trim()) return items.slice(0, 12);
    return items
      .map((it) => ({ it, s: Math.max(fuzzyScore(q, it.label), fuzzyScore(q, it.sub) * 0.4) }))
      .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 20).map((x) => x.it);
  }, [q, products, customers]);

  if (!paletteOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 p-3 pt-[10vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setPalette(false)}>
      <div className="animate-pop w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
          <Search size={17} className="text-brand" />
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setI(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(v + 1, results.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(v - 1, 0)); }
              if (e.key === 'Enter' && results[i]) { results[i].run(); setPalette(false); }
              if (e.key === 'Escape') setPalette(false);
            }}
            placeholder="Search pages, products, customers…"
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink3" />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink3">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto py-1.5">
          {results.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink3">No matches</p>}
          {results.map((r, idx) => (
            <button key={r.kind + r.id} onMouseEnter={() => setI(idx)} onClick={() => { r.run(); setPalette(false); }}
              className={cx('flex w-full items-center gap-3 px-3.5 py-2.5 text-left', idx === i ? 'bg-brand/10' : 'hover:bg-surface2')}>
              <span className="rounded-md border border-line bg-surface2 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink3">{r.kind}</span>
              <span className="flex-1 truncate">
                <span className="block truncate text-sm font-semibold text-ink">{r.label}</span>
                <span className="block truncate text-[11px] text-ink3">{r.sub}</span>
              </span>
              {idx === i && <CornerDownLeft size={14} className="text-brand" />}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
