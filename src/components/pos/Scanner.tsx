import React, { useEffect, useRef, useState } from 'react';
import { Camera, ScanLine, X, Search, Sparkles } from 'lucide-react';
import { Modal, Input } from '@/components/ui';
import { beep, buzz } from '@/lib/sound';

interface Props {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
}

export default function Scanner({
  open,
  onClose,
  onScan,
  title = 'Scan Barcode',
  subtitle = 'Point camera at product barcode or enter code below',
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState('');
  const [manual, setManual] = useState('');

  useEffect(() => {
    if (!open) {
      setManual('');
      setErr('');
      return;
    }

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    (async () => {
      try {
        const Det = (window as any).BarcodeDetector;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (!Det) {
          setErr('Live BarcodeDetector is not supported in this browser. Enter code manually below.');
          return;
        }

        const det = new Det({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
        });

        const loop = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await det.detect(videoRef.current);
            if (codes?.length) {
              const raw = codes[0].rawValue.trim();
              if (raw) {
                stopped = true;
                beep();
                buzz('light');
                onScan(raw);
                onClose();
                return;
              }
            }
          } catch {
            /* frame skip */
          }
          if (!stopped) raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
      } catch (e: any) {
        setErr('Camera unavailable: ' + (e?.message ?? 'permission denied'));
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);

  const handleManualSubmit = () => {
    if (manual.trim()) {
      beep();
      buzz('light');
      onScan(manual.trim());
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        <p className="text-xs text-ink3">{subtitle}</p>

        {/* Live Camera Viewport */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-56 sm:h-64 w-full object-cover"
          />

          {/* Viewfinder Target Laser Overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-36 w-60 rounded-2xl border-2 border-brand/80 shadow-glow flex items-center justify-center">
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent shadow-glow animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand/90 bg-black/70 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                Align Barcode Here
              </span>
            </div>
          </div>

          {err && (
            <div className="absolute bottom-2 inset-x-2 bg-bad/85 backdrop-blur-md p-2 rounded-xl text-center text-xs text-white">
              {err}
            </div>
          )}
        </div>

        {/* Manual Barcode Input Fallback */}
        <div className="flex gap-2 pt-1">
          <Input
            placeholder="Or enter / paste barcode number manually…"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleManualSubmit();
            }}
            autoFocus={!!err}
          />
          <button
            className="btn-primary shrink-0 px-4"
            onClick={handleManualSubmit}
            disabled={!manual.trim()}
          >
            Submit
          </button>
        </div>
      </div>
    </Modal>
  );
}
