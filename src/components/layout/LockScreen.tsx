import { useEffect, useState } from 'react';
import { Lock, Delete } from 'lucide-react';
import { useSettings } from '@/store/settings';
import { useUI } from '@/store/ui';
import { cx } from '@/lib/format';
import { errorSound, successSound, buzz } from '@/lib/sound';

export default function LockScreen() {
  const s = useSettings();
  const { locked, setLocked } = useUI();
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  /* auto-lock on idle */
  useEffect(() => {
    if (!s.appLockPin || !s.autoLockMinutes) return;
    let t: any;
    const reset = () => { clearTimeout(t); t = setTimeout(() => setLocked(true), s.autoLockMinutes * 60000); };
    ['mousemove', 'keydown', 'touchstart', 'click'].forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(t); ['mousemove', 'keydown', 'touchstart', 'click'].forEach((e) => window.removeEventListener(e, reset)); };
  }, [s.appLockPin, s.autoLockMinutes]);

  useEffect(() => { if (locked) setPin(''); }, [locked]);

  if (!locked || !s.appLockPin) return null;

  const press = (d: string) => {
    const next = (pin + d).slice(0, 6);
    setPin(next);
    if (next.length >= s.appLockPin.length) {
      if (next === s.appLockPin) { successSound(); buzz(15); setLocked(false); }
      else { errorSound(); buzz([20, 60, 20]); setShake(true); setTimeout(() => { setShake(false); setPin(''); }, 400); }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/95 backdrop-blur-xl">
      <div className={cx('w-full max-w-xs px-6 text-center', shake && 'animate-pulse')}>
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand shadow-glow"><Lock size={24} /></div>
        <p className="text-lg font-extrabold text-ink">{s.shopName}</p>
        <p className="mb-5 text-xs text-ink3">Enter your PIN to unlock</p>
        <div className="mb-6 flex justify-center gap-2.5">
          {Array.from({ length: Math.max(4, s.appLockPin.length) }).map((_, i) => (
            <span key={i} className={cx('h-3 w-3 rounded-full border', i < pin.length ? 'border-brand bg-brand' : 'border-line')} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} onClick={() => press(d)} className="rounded-2xl border border-line bg-surface py-4 text-xl font-bold text-ink active:scale-95">{d}</button>
          ))}
          <span />
          <button onClick={() => press('0')} className="rounded-2xl border border-line bg-surface py-4 text-xl font-bold text-ink active:scale-95">0</button>
          <button onClick={() => setPin((p) => p.slice(0, -1))} className="grid place-items-center rounded-2xl border border-line bg-surface text-ink2 active:scale-95"><Delete size={20} /></button>
        </div>
      </div>
    </div>
  );
}
