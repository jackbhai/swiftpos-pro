import { useState } from 'react';
import { Boxes, Check, Sparkles, ListChecks, Workflow, Layers, ArrowRight } from 'lucide-react';
import { SYSTEMS, getSystem, type CapKey } from '@/lib/systems';
import { useSettings, useShop } from '@/store/settings';
import { NAV } from '@/components/layout/nav';
import { Card, Stat, Badge, Toggle, SectionTitle, Tabs, Modal } from '@/components/ui';
import { cx, num } from '@/lib/format';
import { toast } from '@/store/ui';
import { Link } from 'react-router-dom';

const CAP_LABEL: Record<string, string> = {
  tables: 'Table floor', kot: 'KOT printing', token: 'Token service', courses: 'Course-wise serving',
  modifiers: 'Add-ons / modifiers', delivery: 'Delivery channel', batchExpiry: 'Batch & expiry',
  prescription: 'Prescription capture', scheduleH: 'Schedule-H register', saltSearch: 'Salt / composition search',
  substitutes: 'Substitute suggestions', weighScale: 'Weight billing', mrpMode: 'MRP mode', looseItems: 'Loose items',
  variants: 'Variants', sizeColor: 'Size × colour matrix', serialNumbers: 'IMEI / serial', warranty: 'Warranty register',
  amc: 'AMC tracking', jobCards: 'Job cards', appointments: 'Appointments', stylists: 'Stylist commission',
  memberships: 'Memberships', packages: 'Prepaid packages', vehicle: 'Vehicle history', labour: 'Labour charges',
  recipes: 'Recipe / BOM', production: 'Production batches', subscriptions: 'Subscriptions', loyalty: 'Loyalty points',
};

/** Business systems — 10 complete, ready-made setups. Pick one and the whole app changes. */
export default function Systems() {
  const s = useSettings();
  const { system, capList } = useShop();
  const [preview, setPreview] = useState<string | null>(null);
  const [tab, setTab] = useState<'systems' | 'modules'>('systems');

  const apply = (id: string) => {
    s.applySystem(id as any, true);
    const sys = getSystem(id);
    toast(`${sys.emoji} ${sys.short} system chalu — screens, wording aur billing sab badal gaye`);
    setPreview(null);
  };

  const pv = preview ? getSystem(preview) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active system" value={system.short} tone="brand" icon={<Boxes size={16} />} sub={system.label} />
        <Stat label="Modules on" value={num(capList.size)} tone="ok" icon={<Layers size={16} />} />
        <Stat label="Screens enabled" value={num(NAV.filter((n) => system.screens.includes(n.path)).length)} tone="warn" />
        <Stat label="Ready systems" value={num(SYSTEMS.length)} tone="ok" icon={<Sparkles size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Business systems" sub="Ek app, 10 poore systems — jo chuniye, UI aur features usi business ke hisaab se ho jate hain" />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'systems', label: 'Choose system', count: SYSTEMS.length },
          { id: 'modules', label: 'Fine-tune modules', count: capList.size },
        ]} />
      </Card>

      {tab === 'systems' && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SYSTEMS.map((sys) => {
            const active = system.id === sys.id;
            return (
              <Card key={sys.id} className={cx(active && 'border-brand ring-1 ring-brand')}>
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{sys.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{sys.short}</p>
                    <p className="text-[11px] text-ink3">{sys.label}</p>
                  </div>
                  {active && <Badge tone="brand">active</Badge>}
                </div>
                <p className="mt-2 text-xs text-ink2">{sys.blurb}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {sys.caps.slice(0, 5).map((c) => <Badge key={c} tone="muted">{CAP_LABEL[c] || c}</Badge>)}
                  {sys.caps.length > 5 && <Badge tone="muted">+{sys.caps.length - 5}</Badge>}
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn-soft flex-1 px-2 py-1.5 text-xs" onClick={() => setPreview(sys.id)}>Preview</button>
                  <button className={cx('flex-1 px-2 py-1.5 text-xs', active ? 'btn-soft' : 'btn-primary')} onClick={() => apply(sys.id)}>
                    {active ? 'Re-apply' : 'Activate'}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'modules' && (
        <>
          <Card>
            <SectionTitle title="Modules" sub="System ke default modules — yahan se on/off kar sakte hain" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.keys(CAP_LABEL).map((k) => {
                const key = k as CapKey;
                const on = capList.has(key);
                return (
                  <div key={k} className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
                    <span className="text-xs text-ink2">{CAP_LABEL[k]}</span>
                    <Toggle checked={on} onChange={(v) => { s.toggleCap(key, v); toast(`${CAP_LABEL[k]} ${v ? 'on' : 'off'}`); }} label="" />
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <SectionTitle title="Navigation" sub="Sirf zaroori screens dikhte hain — sab dekhne ho to ye on kar dijiye" />
            <Toggle checked={s.showAllScreens} onChange={(v) => s.set({ showAllScreens: v })} label="Show every screen (ignore system filter)" />
            <div className="mt-2 flex flex-wrap gap-1">
              {NAV.map((n) => (
                <Badge key={n.path} tone={system.screens.includes(n.path) || s.showAllScreens ? 'ok' : 'muted'}>{n.label}</Badge>
              ))}
            </div>
          </Card>
        </>
      )}

      {pv && (
        <Modal open onClose={() => setPreview(null)} title={`${pv.emoji} ${pv.label}`}
          footer={<button className="btn-primary w-full" onClick={() => apply(pv.id)}>Activate this system</button>}>
          <p className="text-xs text-ink2">{pv.blurb}</p>

          <p className="mt-3 flex items-center gap-1 text-[11px] uppercase tracking-widest text-ink3"><ListChecks size={12} /> Kya milta hai</p>
          <ul className="mt-1 space-y-1">
            {pv.highlights.map((h) => <li key={h} className="flex gap-2 text-xs text-ink2"><Check size={13} className="mt-0.5 shrink-0 text-ok" />{h}</li>)}
          </ul>

          <p className="mt-3 flex items-center gap-1 text-[11px] uppercase tracking-widest text-ink3"><Workflow size={12} /> Din kaise chalega</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {pv.workflow.map((w, i) => (
              <span key={w} className="flex items-center gap-1 text-[11px] text-ink2">
                <span className="rounded-lg border border-line px-2 py-1">{w}</span>
                {i < pv.workflow.length - 1 && <ArrowRight size={11} className="text-ink3" />}
              </span>
            ))}
          </div>

          <p className="mt-3 text-[11px] uppercase tracking-widest text-ink3">Billing screen par extra fields</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {pv.capture.map((c) => <Badge key={c.key} tone={c.required ? 'warn' : 'muted'}>{c.label}{c.required ? ' *' : ''} ({c.scope})</Badge>)}
          </div>

          <p className="mt-3 text-[11px] uppercase tracking-widest text-ink3">Screens</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {NAV.filter((n) => pv.screens.includes(n.path)).map((n) => <Badge key={n.path} tone="ok">{n.label}</Badge>)}
          </div>

          <p className="mt-3 text-[11px] uppercase tracking-widest text-ink3">Defaults</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(pv.defaults).slice(0, 10).map(([k, v]) => <Badge key={k} tone="muted">{k}: {String(v)}</Badge>)}
          </div>
          <p className="mt-3 text-[10px] text-ink3">Activate karne par aapka data waisa hi rahega — sirf UI, modules, wording aur billing defaults badalte hain. <Link to="/settings?tab=shop" className="text-brand">Settings</Link> se kabhi bhi badal sakte hain.</p>
        </Modal>
      )}
    </div>
  );
}
