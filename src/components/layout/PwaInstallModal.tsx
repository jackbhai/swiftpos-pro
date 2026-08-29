import React, { useEffect, useState } from 'react';
import { Download, Smartphone, CheckCircle2, Share, PlusSquare, Sparkles, WifiOff, Zap } from 'lucide-react';
import { Modal, Badge } from '@/components/ui';
import { canInstall, promptInstall, isIOS, isStandalone, onPwaChange } from '@/lib/pwa';
import { clickSound, successSound, buzz } from '@/lib/sound';

export default function PwaInstallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [installable, setInstallable] = useState(canInstall());
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setIos(isIOS());
    setInstalled(isStandalone());
    const unsub = onPwaChange(() => {
      setInstallable(canInstall());
      setInstalled(isStandalone());
    });
    return () => {
      unsub();
    };
  }, []);

  const handleInstallClick = async () => {
    clickSound();
    buzz('medium');
    const accepted = await promptInstall();
    if (accepted) {
      successSound();
      buzz('success');
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Install SwiftPOS Pro App">
      <div className="space-y-4">
        {/* App Hero Card */}
        <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/15 via-surface2/60 to-brand2/15 p-4 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-black border border-brand/40 shadow-glow">
            <img src="./icons/icon-192.png" alt="SwiftPOS Icon" className="h-12 w-12 rounded-xl object-contain" />
          </div>
          <h3 className="text-base font-extrabold text-ink">SwiftPOS Pro Mobile & Desktop App</h3>
          <p className="mt-1 text-xs text-ink2">
            Install to home screen for ultra-fast full-screen POS terminal, zero lag, and 100% offline billing.
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Badge tone="ok"><Zap size={11} className="mr-1 inline" /> 100% Offline Ready</Badge>
            <Badge tone="brand"><Sparkles size={11} className="mr-1 inline" /> Instant Native Speed</Badge>
            <Badge tone="muted"><WifiOff size={11} className="mr-1 inline" /> No Internet Required</Badge>
          </div>
        </div>

        {/* Status / Instructions */}
        {installed ? (
          <div className="rounded-xl border border-ok/40 bg-ok/10 p-4 text-center">
            <CheckCircle2 size={28} className="mx-auto mb-2 text-ok" />
            <p className="text-sm font-bold text-ok">SwiftPOS Pro is already installed!</p>
            <p className="text-xs text-ink3">You are running the standalone application.</p>
          </div>
        ) : ios ? (
          /* iOS Step-by-step Guide */
          <div className="space-y-2.5 rounded-xl border border-line bg-surface2/60 p-3.5">
            <p className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Smartphone size={14} className="text-brand" /> How to install on iPhone / iPad (Safari):
            </p>
            <div className="space-y-2 text-xs text-ink2">
              <div className="flex items-start gap-2.5 rounded-lg border border-line/60 bg-surface/50 p-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/20 font-mono text-[10px] font-bold text-brand">1</span>
                <span>Tap the <b>Share icon</b> <Share size={13} className="inline mx-1 text-brand" /> at the bottom or top bar of Safari.</span>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg border border-line/60 bg-surface/50 p-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/20 font-mono text-[10px] font-bold text-brand">2</span>
                <span>Scroll down and tap <b>'Add to Home Screen'</b> <PlusSquare size={13} className="inline mx-1 text-ok" />.</span>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg border border-line/60 bg-surface/50 p-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/20 font-mono text-[10px] font-bold text-brand">3</span>
                <span>Tap <b>'Add'</b> at top right to launch full-screen icon!</span>
              </div>
            </div>
          </div>
        ) : installable ? (
          <button
            onClick={handleInstallClick}
            className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 shadow-glow active:scale-[0.98]"
          >
            <Download size={18} /> Install App on this Device
          </button>
        ) : (
          <div className="rounded-xl border border-line bg-surface2/60 p-3.5 text-xs text-ink2 space-y-2">
            <p className="font-bold text-ink">To install on Android / Chrome / Edge:</p>
            <p>1. Tap the browser menu (<span className="font-mono">⋮</span> or <span className="font-mono">⋯</span>)</p>
            <p>2. Select <b>'Install app'</b> or <b>'Add to Home screen'</b></p>
            <p>3. Enjoy offline full-screen terminal on your desktop or mobile!</p>
          </div>
        )}

        <div className="border-t border-line pt-3 flex justify-end">
          <button onClick={onClose} className="btn-ghost text-xs">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
