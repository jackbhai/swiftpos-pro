import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useUI } from '@/store/ui';

const icons = { ok: CheckCircle2, err: XCircle, warn: AlertTriangle, info: Info } as const;
const tones = { ok: 'text-ok border-ok/40', err: 'text-bad border-bad/40', warn: 'text-warn border-warn/40', info: 'text-brand border-brand/40' } as const;

export default function Toasts() {
  const { toasts, dismiss } = useUI();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[110] flex flex-col items-center gap-2 px-3">
      {toasts.map((t) => {
        const Icon = icons[t.kind];
        return (
          <button key={t.id} onClick={() => dismiss(t.id)}
            className={`pointer-events-auto animate-pop flex w-full max-w-sm items-center gap-2.5 rounded-xl border bg-surface/95 px-3.5 py-2.5 text-sm font-semibold text-ink shadow-2xl backdrop-blur ${tones[t.kind]}`}>
            <Icon size={17} className="shrink-0" />
            <span className="flex-1 text-left">{t.msg}</span>
          </button>
        );
      })}
    </div>
  );
}
