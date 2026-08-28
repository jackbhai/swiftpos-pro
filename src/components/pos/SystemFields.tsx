import { ClipboardList, AlertTriangle } from 'lucide-react';
import { useShop } from '@/store/settings';
import { useBillMeta } from '@/store/billMeta';
import { Input, Select, Badge } from '@/components/ui';
import { cx } from '@/lib/format';

/** Extra billing fields demanded by the active business system
 *  (RMS: table/guests/waiter · Pharmacy: doctor/Rx · Electronics: IMEI · Garage: vehicle…). */
export default function SystemFields({ compact }: { compact?: boolean }) {
  const { system } = useShop();
  const { values, setField } = useBillMeta();
  const fields = system.capture.filter((f) => f.scope === 'bill');
  if (!fields.length) return null;

  const missing = fields.filter((f) => f.required && !values[f.key]);

  return (
    <div className={cx('rounded-2xl border border-line p-3', compact ? 'mb-2' : 'mb-3')}>
      <div className="mb-2 flex items-center gap-2">
        <ClipboardList size={14} className="text-brand" />
        <p className="flex-1 text-[11px] font-bold uppercase tracking-widest text-ink3">{system.emoji} {system.short} details</p>
        {missing.length > 0 && <Badge tone="warn"><AlertTriangle size={10} /> {missing.length} required</Badge>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className="text-[11px] text-ink3">
            {f.label}{f.required && <span className="text-bad"> *</span>}
            {f.type === 'select' ? (
              <Select className="mt-0.5 h-9" value={values[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)}>
                <option value="">Select…</option>
                {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            ) : (
              <Input className={cx('mt-0.5 h-9', f.required && !values[f.key] && 'border-warn/50')}
                type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                inputMode={f.type === 'number' ? 'numeric' : undefined}
                value={values[f.key] ?? ''} placeholder={f.hint}
                onChange={(e) => setField(f.key, e.target.value)} />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
