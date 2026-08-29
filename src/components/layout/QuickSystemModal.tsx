import React from 'react';
import { SYSTEMS, getSystem } from '@/lib/systems';
import { useSettings, useShop } from '@/store/settings';
import { Modal, Badge } from '@/components/ui';
import { cx } from '@/lib/format';
import { toast } from '@/store/ui';
import { Check, Sparkles, Layers, ArrowRight } from 'lucide-react';
import { clickSound, successSound, buzz } from '@/lib/sound';
import { useNavigate } from 'react-router-dom';

export default function QuickSystemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();
  const { system } = useShop();
  const navigate = useNavigate();

  const handleActivate = (sysId: string) => {
    clickSound();
    buzz('medium');
    s.applySystem(sysId as any, true);
    const selected = getSystem(sysId);
    successSound();
    buzz('success');
    toast(`Switched to ${selected.emoji} ${selected.label}! All screens & UI updated.`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Switch Business Edition (10 Systems)" wide>
      <div className="space-y-4">
        <p className="text-xs text-ink3">
          Select any business system below. The whole POS interface, billing fields, receipts, navigation screens, and terminology will dynamically transform for that industry.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SYSTEMS.map((sys) => {
            const active = system.id === sys.id;
            return (
              <div
                key={sys.id}
                onClick={() => handleActivate(sys.id)}
                className={cx(
                  'group relative flex flex-col justify-between rounded-2xl border p-4 cursor-pointer transition-all duration-200',
                  active
                    ? 'border-brand bg-brand/10 shadow-glow ring-1 ring-brand/50'
                    : 'border-line bg-surface2/40 hover:border-brand/40 hover:bg-surface2/80 hover:scale-[1.01]',
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-3xl p-2 rounded-xl bg-black/40 border border-line/60">{sys.emoji}</span>
                    {active ? (
                      <span className="pill bg-brand text-black font-extrabold flex items-center gap-1">
                        <Check size={11} /> ACTIVE
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-ink3 opacity-0 group-hover:opacity-100 transition">
                        Tap to activate →
                      </span>
                    )}
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-ink">{sys.label}</h4>
                  <p className="mt-1 text-xs text-ink2 line-clamp-2">{sys.blurb}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-line/50 flex items-center justify-between">
                  <span className="text-[10px] text-ink3 uppercase font-semibold">{sys.caps.length} features on</span>
                  <span className={cx('text-xs font-bold', active ? 'text-brand' : 'text-ink3 group-hover:text-ink')}>
                    {active ? 'Currently Active' : 'Switch Now'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-line pt-3 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              navigate('/systems');
            }}
            className="btn-ghost text-xs"
          >
            <Layers size={14} /> Full System Configuration & Modules
          </button>
          <button onClick={onClose} className="btn-primary text-xs">
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
