import { useEffect, useMemo, useState } from 'react';
import { Monitor, Maximize2, ExternalLink, QrCode, ShoppingBag } from 'lucide-react';
import { useCart } from '@/store/cart';
import { useSettings } from '@/store/settings';
import { computeTotals } from '@/lib/calc';
import { money, num } from '@/lib/format';
import { qrDataUrl, upiLink } from '@/lib/upi';
import { Card, SectionTitle, Badge } from '@/components/ui';
import type { CartLine } from '@/db/types';

const KEY = 'swiftpos-cart';

/** Customer-facing second screen. Open on a tablet / second monitor — live cart mirror + UPI QR. */
export default function Display() {
  const live = useCart();
  const [mirror, setMirror] = useState<any>(null);
  const s = useSettings();
  const [qr, setQr] = useState('');
  const [tick, setTick] = useState(0);

  // Mirror cart from other tabs/windows (localStorage persisted store)
  useEffect(() => {
    const read = () => {
      try { const raw = localStorage.getItem(KEY); if (raw) setMirror(JSON.parse(raw).state); } catch { /* ignore */ }
    };
    read();
    const onStore = (e: StorageEvent) => { if (e.key === KEY) read(); };
    window.addEventListener('storage', onStore);
    const iv = setInterval(() => { read(); setTick((t) => t + 1); }, 1000);
    return () => { window.removeEventListener('storage', onStore); clearInterval(iv); };
  }, []);

  const state = mirror && mirror.lines ? mirror : live;
  const lines: CartLine[] = state.lines || [];
  const t = useMemo(() => computeTotals(lines, {
    billDiscount: state.billDiscount, billDiscountType: state.billDiscountType, coupon: state.coupon,
    taxInclusive: s.taxInclusive, roundOff: s.roundOff, pointsRedeemed: state.pointsRedeemed, pointValue: s.pointValue,
    serviceChargePct: state.serviceChargePct, deliveryCharge: state.deliveryCharge, packagingCharge: state.packagingCharge, tip: state.tip,
  }), [lines, state, s]);

  const acc = (s.upiAccounts || []).find((a: any) => a.primary) || (s.upiAccounts || [])[0];
  useEffect(() => {
    if (!acc || t.total <= 0) { setQr(''); return; }
    qrDataUrl(upiLink(acc, t.total, s.shopName), 220).then(setQr).catch(() => setQr(''));
  }, [acc, t.total, s.shopName]);

  const fullscreen = () => {
    const el = document.getElementById('cfd-root');
    if (el?.requestFullscreen) el.requestFullscreen();
  };
  const openWindow = () => window.open(location.href, '_blank', 'width=900,height=700');

  const savings = t.itemDiscount + t.billDiscount + t.couponValue;
  const last = lines[lines.length - 1];
  const clock = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle title="Customer display (second screen)" sub="Isko tablet ya doosre monitor par kholiye — customer ko live bill dikhta rahega"
          right={<div className="flex gap-2">
            <button className="btn-soft" onClick={openWindow}><ExternalLink size={15} /> New window</button>
            <button className="btn-primary" onClick={fullscreen}><Maximize2 size={15} /> Fullscreen</button>
          </div>} />
        <div className="flex flex-wrap gap-2 text-[11px] text-ink3">
          <Badge tone={mirror ? 'ok' : 'muted'}><Monitor size={10} /> {mirror ? 'Mirroring POS cart' : 'Local cart'}</Badge>
          <Badge tone="muted">Auto-refresh 1s · {tick}</Badge>
          {acc && <Badge tone="brand"><QrCode size={10} /> UPI QR live</Badge>}
        </div>
      </Card>

      <div id="cfd-root" className="overflow-hidden rounded-2xl border border-line bg-black">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">{s.shopName || 'SwiftPOS'}</p>
            <p className="text-[11px] text-ink3">{s.tagline || s.address || 'Welcome! आपका स्वागत है'}</p>
          </div>
          <p className="font-mono text-sm text-ink3">{clock}</p>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
          <div className="min-h-[320px] p-4">
            {lines.length === 0 ? (
              <div className="grid h-full min-h-[280px] place-items-center text-center">
                <div>
                  <ShoppingBag size={40} className="mx-auto text-ink3" />
                  <p className="mt-3 text-2xl font-extrabold text-ink">Welcome 🙏</p>
                  <p className="mt-1 text-sm text-ink3">{'Aapka bill yahin dikhega. Dhanyavaad!'}</p>
                </div>
              </div>
            ) : (
              <>
                {last && (
                  <div className="mb-3 rounded-xl border border-brand/30 bg-brand/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-ink3">Last scanned</p>
                    <p className="truncate text-xl font-extrabold text-ink">{last.name}</p>
                    <p className="font-mono text-sm text-brand">{last.qty} × {money(last.price, s.currency)} = {money(last.qty * last.price - (last.discount || 0), s.currency)}</p>
                  </div>
                )}
                <div className="max-h-[42vh] overflow-auto">
                  {lines.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 border-b border-line py-2 text-sm last:border-0">
                      <span className="min-w-0 flex-1 truncate text-ink">{l.name}</span>
                      <span className="font-mono text-ink3">{l.qty} {l.unit}</span>
                      <span className="w-24 text-right font-mono text-ink">{money(l.qty * l.price - (l.discount || 0), s.currency)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="border-t border-line p-4 lg:border-l lg:border-t-0">
            <div className="space-y-1 text-xs text-ink3">
              <Row k={`Items (${num(lines.length)})`} v={money(t.subTotal, s.currency)} />
              {t.itemDiscount + t.billDiscount + t.couponValue > 0 && <Row k="Discount" v={'- ' + money(t.itemDiscount + t.billDiscount + t.couponValue, s.currency)} tone="ok" />}
              {t.gstAmount > 0 && <Row k="Tax (GST)" v={money(t.gstAmount, s.currency)} />}
              {!!t.roundOff && <Row k="Round off" v={money(t.roundOff, s.currency)} />}
            </div>
            <div className="mt-3 rounded-xl bg-brand/15 p-3 text-center">
              <p className="text-[11px] uppercase tracking-widest text-ink3">Total payable</p>
              <p className="font-mono text-4xl font-extrabold text-brand">{money(t.total, s.currency)}</p>
            </div>
            {qr && (
              <div className="mt-3 rounded-xl bg-white p-3 text-center">
                <img src={qr} alt="UPI QR" className="mx-auto h-40 w-40" />
                <p className="mt-1 text-[11px] font-semibold text-black">Scan & pay · {acc?.vpa}</p>
              </div>
            )}
            {savings > 0 && <p className="mt-2 text-center text-xs font-semibold text-ok">🎉 Aapne {money(savings, s.currency)} bachaye!</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const Row = ({ k, v, tone }: { k: string; v: string; tone?: string }) => (
  <div className="flex justify-between"><span>{k}</span><span className={tone === 'ok' ? 'font-mono text-ok' : 'font-mono text-ink'}>{v}</span></div>
);
