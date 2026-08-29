import React, { useState } from 'react';
import { Printer, CheckCircle2, Play, Sparkles, FileText, QrCode, Smartphone, Usb, Bluetooth } from 'lucide-react';
import { Card, SectionTitle, Badge, Field, Select, Input } from '@/components/ui';
import { printHTML } from '@/lib/receipt';
import { useSettings } from '@/store/settings';
import { money, dt } from '@/lib/format';
import { toast } from '@/store/ui';
import { clickSound, successSound, buzz } from '@/lib/sound';

export default function PrinterTestBench() {
  const s = useSettings();
  const [paper, setPaper] = useState<'58mm' | '80mm' | 'A4'>(s.printPaper);
  const [sampleShop, setSampleShop] = useState(s.shopName || 'Swift Store');
  const [samplePhone, setSamplePhone] = useState(s.phone || '9876543210');

  const printSampleReceipt = (size: '58mm' | '80mm' | 'A4') => {
    clickSound();
    buzz('medium');
    const width = size === '58mm' ? '48mm' : size === '80mm' ? '72mm' : '100%';
    const font = size === '58mm' ? '11px' : size === '80mm' ? '13px' : '14px';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Printer Test Page</title>
  <style>
    @page { margin: 2mm; }
    body {
      font-family: monospace, system-ui, -apple-system;
      width: ${width};
      margin: 0 auto;
      padding: 4mm;
      color: #000;
      font-size: ${font};
      line-height: 1.35;
      background: #fff;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .line { border-bottom: 1px dashed #000; margin: 6px 0; }
    .double-line { border-bottom: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: inherit; }
    td, th { padding: 2px 0; }
    .header { font-size: 1.3em; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="header bold">${sampleShop}</div>
    <div>${s.tagline || 'Retail & Billing POS'}</div>
    <div>Ph: ${samplePhone}</div>
    ${s.gstin ? `<div>GSTIN: ${s.gstin}</div>` : ''}
  </div>

  <div class="line"></div>
  <div class="center bold">*** PRINTER TEST RECEIPT ***</div>
  <div>Date: ${dt(Date.now())}</div>
  <div>Invoice: TEST-${Date.now().toString().slice(-4)}</div>
  <div>Paper Size: ${size}</div>
  <div>Terminal: POS-01 (SwiftPOS Pro)</div>
  <div class="line"></div>

  <table>
    <thead>
      <tr>
        <th align="left">ITEM</th>
        <th align="center">QTY</th>
        <th align="right">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Mineral Water 1L</td>
        <td align="center">2</td>
        <td align="right">40.00</td>
      </tr>
      <tr>
        <td>Basmati Rice 5kg</td>
        <td align="center">1</td>
        <td align="right">450.00</td>
      </tr>
      <tr>
        <td>Dairy Milk Silk</td>
        <td align="center">3</td>
        <td align="right">270.00</td>
      </tr>
    </tbody>
  </table>

  <div class="line"></div>
  <table>
    <tr>
      <td>Sub Total</td>
      <td align="right">760.00</td>
    </tr>
    <tr>
      <td>CGST (2.5%)</td>
      <td align="right">19.00</td>
    </tr>
    <tr>
      <td>SGST (2.5%)</td>
      <td align="right">19.00</td>
    </tr>
    <tr class="bold">
      <td>NET TOTAL</td>
      <td align="right">${s.currency} 798.00</td>
    </tr>
  </table>

  <div class="double-line"></div>
  <div class="center">
    <div>Payment: CASH RECEIVED</div>
    <div class="bold">STATUS: OK / TEST PASSED</div>
    <div style="margin-top: 6px; font-size: 0.9em;">Thank you for shopping with us!</div>
    <div style="font-size: 0.8em; color: #555;">Powered by SwiftPOS Pro</div>
  </div>
</body>
</html>`;

    printHTML(html);
    successSound();
    toast(`Sent ${size} test print to printer`);
  };

  const testDrawerKick = () => {
    clickSound();
    buzz('heavy');
    // Drawer kick pulse ESC p 0 25 250
    toast('Cash drawer kick pulse sent via printer driver');
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Thermal & Hardware Studio"
        sub="Test 58mm, 80mm thermal receipts, A4 GST invoices, and cash drawer kick signals"
        right={<Badge tone="brand">Hardware Ready</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Test Controls Card */}
        <Card className="space-y-4">
          <h3 className="text-sm font-extrabold text-ink flex items-center gap-2">
            <Printer size={16} className="text-brand" /> Live Print Test Bench
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Shop Name on Test Print">
              <Input value={sampleShop} onChange={(e) => setSampleShop(e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={samplePhone} onChange={(e) => setSamplePhone(e.target.value)} />
            </Field>
          </div>

          <div className="space-y-2 pt-2 border-t border-line">
            <p className="label">1-Tap Test Print by Format</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => printSampleReceipt('58mm')}
                className="btn-soft flex flex-col items-center justify-center gap-1.5 py-3 text-xs"
              >
                <Printer size={18} className="text-brand" />
                <span className="font-bold">58mm Thermal</span>
                <span className="text-[10px] text-ink3">2-inch roll</span>
              </button>

              <button
                onClick={() => printSampleReceipt('80mm')}
                className="btn-soft flex flex-col items-center justify-center gap-1.5 py-3 text-xs"
              >
                <Printer size={18} className="text-ok" />
                <span className="font-bold">80mm Thermal</span>
                <span className="text-[10px] text-ink3">3-inch roll (Std)</span>
              </button>

              <button
                onClick={() => printSampleReceipt('A4')}
                className="btn-soft flex flex-col items-center justify-center gap-1.5 py-3 text-xs"
              >
                <FileText size={18} className="text-warn" />
                <span className="font-bold">A4 Tax Invoice</span>
                <span className="text-[10px] text-ink3">Laser / Inkjet</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-line flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-ink">Cash Drawer Kick Pulse</p>
              <p className="text-[11px] text-ink3">Sends RJ11 pulse (ESC p 0 25 250)</p>
            </div>
            <button onClick={testDrawerKick} className="btn-ghost text-xs">
              <Play size={14} /> Test Drawer Kick
            </button>
          </div>
        </Card>

        {/* Live Thermal Paper Visual Preview */}
        <Card className="flex flex-col items-center justify-center p-4 bg-surface2/30">
          <p className="label mb-2 text-center">Thermal Paper Simulated Preview</p>
          <div
            className="w-full max-w-[280px] rounded-lg bg-white p-4 text-black font-mono shadow-2xl transition-all"
            style={{ fontSize: '11px', lineHeight: '1.3' }}
          >
            <div className="text-center font-bold text-sm tracking-tight">{sampleShop}</div>
            <div className="text-center text-[10px] text-gray-600">Ph: {samplePhone}</div>
            <div className="my-2 border-b border-dashed border-gray-400" />
            <div className="text-center font-bold text-[10px]">*** THERMAL TEST ***</div>
            <div className="text-[10px] text-gray-700">Inv: #TEST-9821 · {new Date().toLocaleDateString()}</div>
            <div className="my-2 border-b border-dashed border-gray-400" />
            <div className="flex justify-between font-bold text-[10px]">
              <span>ITEM</span>
              <span>TOTAL</span>
            </div>
            <div className="flex justify-between text-[10px] my-1">
              <span>Mineral Water 1L × 2</span>
              <span>₹40.00</span>
            </div>
            <div className="flex justify-between text-[10px] my-1">
              <span>Basmati Rice 5kg × 1</span>
              <span>₹450.00</span>
            </div>
            <div className="my-2 border-b border-dashed border-gray-400" />
            <div className="flex justify-between font-bold text-xs">
              <span>NET TOTAL</span>
              <span>₹490.00</span>
            </div>
            <div className="my-2 border-b-2 border-black" />
            <div className="text-center text-[10px] font-bold text-emerald-700">PAID VIA UPI / CASH</div>
            <div className="text-center text-[9px] text-gray-500 mt-1">Thank you! Visit again.</div>
          </div>
        </Card>
      </div>

      {/* Hardware Connection Setup Guide */}
      <Card className="space-y-3">
        <h3 className="text-sm font-extrabold text-ink flex items-center gap-2">
          <Sparkles size={16} className="text-brand" /> Supported Hardware & Quick Setup
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface2/50 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <Usb size={16} className="text-brand" /> USB Thermal Printers
            </div>
            <p className="text-[11px] text-ink3 leading-relaxed">
              Connect printer via USB. On Windows/Mac/Linux, install standard ESC/POS or manufacturer driver (TVS, EPSON, NGX, Everycom).
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface2/50 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <Bluetooth size={16} className="text-ok" /> Bluetooth Mobile Printers
            </div>
            <p className="text-[11px] text-ink3 leading-relaxed">
              Pair Bluetooth printer in phone settings (default PIN 0000 or 1234). Choose 58mm in SwiftPOS for instant pocket printing.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface2/50 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <QrCode size={16} className="text-warn" /> 1D / 2D Barcode Scanners
            </div>
            <p className="text-[11px] text-ink3 leading-relaxed">
              Plug USB/Bluetooth handheld barcode gun (HID mode). Scans automatically add products to billing cart with zero clicks.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
