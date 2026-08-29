import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Inbox, Loader2 } from 'lucide-react';
import { cx } from '@/lib/format';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { pad?: boolean }> = ({ className, pad = true, ...p }) => (
  <div {...p} className={cx('card', pad && 'p-4', className)} />
);

export const SectionTitle: React.FC<{ title: string; sub?: string; right?: React.ReactNode }> = ({ title, sub, right }) => (
  <div className="mb-3 flex items-end justify-between gap-3">
    <div>
      <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
      {sub && <p className="text-xs text-ink3">{sub}</p>}
    </div>
    {right}
  </div>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; tone?: 'brand' | 'ok' | 'warn' | 'bad' }> = ({ label, value, sub, icon, tone = 'brand' }) => {
  const tones = { brand: 'text-brand', ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' } as const;
  return (
    <div className="card card-hover p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink3">{label}</span>
        <span className={cx('opacity-80', tones[tone])}>{icon}</span>
      </div>
      <div className="mt-1.5 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-ink3">{sub}</div>}
    </div>
  );
};

export const Modal: React.FC<{ open: boolean; onClose: () => void; title?: string; children: React.ReactNode; wide?: boolean; footer?: React.ReactNode }> = ({ open, onClose, title, children, wide, footer }) => {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('animate-slideup flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-2xl', wide ? 'sm:max-w-4xl' : 'sm:max-w-lg')}>
        {title && (
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-bold tracking-tight text-ink">{title}</h3>
            <button onClick={onClose} className="rounded-lg p-1.5 text-ink3 hover:bg-surface2 hover:text-ink"><X size={18} /></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="safe-b border-t border-line bg-surface2/60 px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string; className?: string }> = ({ label, children, hint, className }) => (
  <div className={className}>
    <label className="label">{label}</label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-ink3">{hint}</p>}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((p, ref) => (
  <input ref={ref} {...p} className={cx('input', p.className)} />
));
Input.displayName = 'Input';

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (p) => (
  <select {...p} className={cx('input appearance-none', p.className)} />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (p) => (
  <textarea {...p} className={cx('input min-h-[80px] resize-y', p.className)} />
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string; hint?: string }> = ({ checked, onChange, label, hint }) => (
  <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface2/50 px-3 py-2.5 text-left transition hover:border-brand/40">
    <span>
      {label && <span className="block text-sm font-semibold text-ink">{label}</span>}
      {hint && <span className="block text-[11px] text-ink3">{hint}</span>}
    </span>
    <span className={cx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-line')}>
      <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-black transition', checked ? 'left-[22px]' : 'left-0.5', checked ? '' : 'bg-ink3')} />
    </span>
  </button>
);

export const SearchBar = React.forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; right?: React.ReactNode }>(
  ({ value, onChange, placeholder = 'Search…', autoFocus, right }, ref) => (
    <div className="relative flex-1">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
      <input ref={ref} autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9 pr-9" />
      {value && <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink3 hover:text-ink"><X size={14} /></button>}
      {right}
    </div>
  )
);
SearchBar.displayName = 'SearchBar';

export const Empty: React.FC<{ title: string; sub?: string; action?: React.ReactNode; icon?: React.ReactNode }> = ({ title, sub, action, icon }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
    <div className="rounded-2xl border border-line bg-surface2 p-4 text-ink3">{icon ?? <Inbox size={26} />}</div>
    <p className="text-sm font-bold text-ink">{title}</p>
    {sub && <p className="max-w-xs text-xs text-ink3">{sub}</p>}
    {action}
  </div>
);

export const Spinner = () => <Loader2 className="animate-spin text-brand" size={20} />;

export const Badge: React.FC<{ tone?: 'ok' | 'warn' | 'bad' | 'brand' | 'muted'; children: React.ReactNode; className?: string }> = ({ tone = 'muted', children, className }) => {
  const map = {
    ok: 'bg-ok/15 text-ok', warn: 'bg-warn/15 text-warn', bad: 'bg-bad/15 text-bad',
    brand: 'bg-brand/15 text-brand', muted: 'bg-surface2 text-ink3 border border-line',
  } as const;
  return <span className={cx('pill', map[tone], className)}>{children}</span>;
};

export const Tabs: React.FC<{ tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }> = ({ tabs, active, onChange }) => (
  <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
    {tabs.map((t) => (
      <button key={t.id} onClick={() => onChange(t.id)} className={cx('chip', active === t.id && 'chip-on')}>
        {t.label}{t.count !== undefined && <span className="ml-1 opacity-60">{t.count}</span>}
      </button>
    ))}
  </div>
);

export function useClickOutside<T extends HTMLElement>(cb: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [cb]);
  return ref;
}

export const ConfirmBtn: React.FC<{ onConfirm: () => void; children: React.ReactNode; className?: string }> = ({ onConfirm, children, className }) => {
  const [armed, setArmed] = React.useState(false);
  useEffect(() => { if (armed) { const t = setTimeout(() => setArmed(false), 2500); return () => clearTimeout(t); } }, [armed]);
  return (
    <button className={cx(armed ? 'btn-danger' : 'btn-ghost', className)} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? 'Tap again to confirm' : children}
    </button>
  );
};
