import type { Sale } from '@/db/types';
import type { Settings } from '@/store/settings';
import { money, dt } from './format';

export function receiptHTML(sale: Sale, s: Settings, size: '58mm' | '80mm' | 'a4' = '80mm') {
  const w = size === '58mm' ? '58mm' : size === '80mm' ? '80mm' : '210mm';
  const rows = sale.lines.map((l) => `
    <tr>
      <td>${l.name}${l.note ? `<br><small>${l.note}</small>` : ''}</td>
      <td class="r">${l.qty}</td>
      <td class="r">${l.price.toFixed(2)}</td>
      <td class="r">${(l.price * l.qty - (l.discount || 0)).toFixed(2)}</td>
    </tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${sale.invoiceNo}</title>
  <style>
    @page{size:${size === 'a4' ? 'A4' : w + ' auto'};margin:${size === 'a4' ? '12mm' : '3mm'}}
    body{font-family:${size === 'a4' ? 'system-ui,sans-serif' : 'ui-monospace,monospace'};width:${w};margin:0 auto;color:#000;font-size:${size === 'a4' ? '13px' : '12px'}}
    h1{font-size:${size === 'a4' ? '22px' : '15px'};margin:0;text-align:center}
    .c{text-align:center}.r{text-align:right}.b{font-weight:700}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th,td{padding:3px 2px;vertical-align:top}
    thead th{border-bottom:1px dashed #000;font-size:11px;text-align:left}
    tfoot td{padding:2px}
    .hr{border-top:1px dashed #000;margin:6px 0}
    small{color:#444;font-size:10px}
  </style></head><body>
  <h1>${s.shopName}</h1>
  <p class="c" style="margin:2px 0"><small>${s.address}<br>${s.phone}${s.gstin ? ' · GSTIN: ' + s.gstin : ''}</small></p>
  <div class="hr"></div>
  <div style="display:flex;justify-content:space-between"><span><b>${sale.invoiceNo}</b></span><span>${dt(sale.ts)}</span></div>
  ${sale.customerName ? `<div>Customer: ${sale.customerName}</div>` : ''}
  ${sale.staffName ? `<div><small>Billed by ${sale.staffName}</small></div>` : ''}
  <table>
    <thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amt</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="hr"></div>
  <table>
    <tr><td>Subtotal</td><td class="r">${money(sale.subTotal, s.currency)}</td></tr>
    ${sale.itemDiscount ? `<tr><td>Item discount</td><td class="r">-${money(sale.itemDiscount, s.currency)}</td></tr>` : ''}
    ${sale.billDiscount ? `<tr><td>Bill discount</td><td class="r">-${money(sale.billDiscount, s.currency)}</td></tr>` : ''}
    ${sale.couponValue ? `<tr><td>Coupon ${sale.couponCode ?? ''}</td><td class="r">-${money(sale.couponValue, s.currency)}</td></tr>` : ''}
    <tr><td>Taxable</td><td class="r">${money(sale.taxable, s.currency)}</td></tr>
    <tr><td>CGST</td><td class="r">${money(sale.gstAmount / 2, s.currency)}</td></tr>
    <tr><td>SGST</td><td class="r">${money(sale.gstAmount / 2, s.currency)}</td></tr>
    ${sale.roundOff ? `<tr><td>Round off</td><td class="r">${money(sale.roundOff, s.currency)}</td></tr>` : ''}
    <tr class="b" style="font-size:15px"><td>TOTAL</td><td class="r">${money(sale.total, s.currency)}</td></tr>
    <tr><td>Paid via</td><td class="r">${sale.payMode.toUpperCase()}</td></tr>
    ${sale.tendered ? `<tr><td>Tendered</td><td class="r">${money(sale.tendered, s.currency)}</td></tr><tr><td>Change</td><td class="r">${money(sale.change || 0, s.currency)}</td></tr>` : ''}
    ${sale.pointsEarned ? `<tr><td>Points earned</td><td class="r">${sale.pointsEarned}</td></tr>` : ''}
  </table>
  <div class="hr"></div>
  <p class="c"><small>${s.footerNote}</small></p>
  <p class="c"><small>Powered by SwiftPOS Pro</small></p>
  </body></html>`;
}

export function printHTML(html: string) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  const d = f.contentDocument!;
  d.open(); d.write(html); d.close();
  setTimeout(() => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 1200); }, 260);
}

export function saleText(sale: Sale, s: Settings) {
  const items = sale.lines.map((l) => `• ${l.name} x${l.qty} = ${money(l.price * l.qty, s.currency)}`).join('\n');
  return `*${s.shopName}*\n${sale.invoiceNo} · ${dt(sale.ts)}\n\n${items}\n\n*Total: ${money(sale.total, s.currency)}*\nPaid: ${sale.payMode.toUpperCase()}\n\n${s.footerNote}`;
}

export const waLink = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(text)}`;
