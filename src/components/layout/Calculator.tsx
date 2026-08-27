import { useState } from 'react';
import { Modal } from '@/components/ui';
import { useUI } from '@/store/ui';

const KEYS = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'];

export default function Calculator() {
  const { calcOpen, setCalc } = useUI();
  const [expr, setExpr] = useState('');
  const [out, setOut] = useState('0');
  const press = (k: string) => {
    if (k === '=') {
      try { // eslint-disable-next-line no-new-func
        const v = Function(`"use strict";return (${expr.replace(/[^0-9+\-*/.() ]/g, '')})`)();
        setOut(String(Math.round(v * 100) / 100)); setExpr(String(v));
      } catch { setOut('Error'); }
    } else setExpr((e) => e + k);
  };
  return (
    <Modal open={calcOpen} onClose={() => setCalc(false)} title="Quick Calculator">
      <div className="rounded-xl border border-line bg-surface2 p-4 text-right">
        <div className="min-h-[18px] font-mono text-xs text-ink3">{expr || '\u00a0'}</div>
        <div className="font-mono text-3xl font-bold text-brand">{out}</div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <button className="btn-danger col-span-2" onClick={() => { setExpr(''); setOut('0'); }}>Clear</button>
        <button className="btn-ghost" onClick={() => setExpr((e) => e.slice(0, -1))}>⌫</button>
        <button className="btn-ghost" onClick={() => setExpr((e) => e + '%')}>%</button>
        {KEYS.map((k) => (
          <button key={k} onClick={() => press(k)} className={k === '=' ? 'btn-primary' : 'btn-soft'}>{k}</button>
        ))}
      </div>
    </Modal>
  );
}
