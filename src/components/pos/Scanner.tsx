import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui';
import { beep } from '@/lib/sound';

export default function Scanner({ open, onClose, onScan }: { open: boolean; onClose: () => void; onScan: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState('');
  const [manual, setManual] = useState('');

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let raf = 0; let stopped = false;
    (async () => {
      try {
        const Det = (window as any).BarcodeDetector;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        if (!Det) { setErr('Live detection unsupported on this browser — type the code below.'); return; }
        const det = new Det({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'] });
        const loop = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await det.detect(videoRef.current);
            if (codes?.length) { beep(); onScan(codes[0].rawValue); onClose(); return; }
          } catch { /* frame skip */ }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (e: any) {
        setErr('Camera unavailable: ' + (e?.message ?? 'permission denied'));
      }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Scan barcode">
      <div className="overflow-hidden rounded-xl border border-line bg-black">
        <video ref={videoRef} playsInline muted className="h-56 w-full object-cover" />
      </div>
      {err && <p className="mt-2 text-xs text-warn">{err}</p>}
      <div className="mt-3 flex gap-2">
        <input className="input" placeholder="Type / paste barcode" value={manual} onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && manual.trim()) { onScan(manual.trim()); onClose(); } }} />
        <button className="btn-primary" onClick={() => manual.trim() && (onScan(manual.trim()), onClose())}>Add</button>
      </div>
    </Modal>
  );
}
