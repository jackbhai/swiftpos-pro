/* ── Receipt / invoice template engine ──────────────────────────────
   20 built-in templates + user-uploaded custom templates.
   Templates are HTML with {{tokens}}, {{#items}}…{{/items}} loops and
   {{#if token}}…{{/if}} blocks — no framework, printable anywhere. */

import type { Sale } from '@/db/types';
import type { Settings } from '@/store/settings';
import { amountInWords } from './words';
import { code128DataUri } from './barcode';

export interface TemplateDef {
  id: string; name: string; paper: '58mm' | '80mm' | 'A4'; group: 'Thermal' | 'A4 / Invoice' | 'Specialised';
  desc: string; html: string; custom?: boolean;
}

/* ── rendering context ─────────────────────────────────────────── */

export interface RenderExtras { upiQr?: string; upiId?: string; copyLabel?: string; logo?: string }

export function buildContext(sale: Sale, s: Settings, x: RenderExtras = {}) {
  const cur = s.currency;
  const fx = (n: number) => (s.currencyPosition === 'after'
    ? `${(n ?? 0).toFixed(s.decimals)}${cur}` : `${cur}${(n ?? 0).toFixed(s.decimals)}`);
  const d = new Date(sale.ts);
  const items = sale.lines.map((l, i) => ({
    sr: i + 1, name: l.name, qty: l.qty, unit: l.unit, hsn: (l as any).hsn ?? '',
    rate: fx(l.price), mrp: fx(l.basePrice), gst: l.gst + '%',
    disc: l.discount ? fx(l.discount) : '',
    amount: fx(l.price * l.qty - (l.discount || 0)),
    note: l.note ?? '',
  }));
  const savings = (sale.itemDiscount || 0) + (sale.billDiscount || 0) + (sale.couponValue || 0);
  const anySale: any = sale;
  return {
    shop_name: s.shopName, tagline: s.tagline, address: s.address, phone: s.phone, phone2: s.phone2,
    email: s.email, website: s.website, gstin: s.gstin, fssai: s.fssai, drug_license: s.drugLicense, pan: s.panNo,
    logo: x.logo ?? s.logoDataUrl, logo_emoji: s.logoEmoji, signature: s.signatureDataUrl,
    invoice_no: sale.invoiceNo, date: d.toLocaleDateString('en-IN'), time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    datetime: d.toLocaleString('en-IN'), copy_label: x.copyLabel ?? '',
    customer_name: sale.customerName ?? 'Walk-in', customer_phone: (anySale.customerPhone ?? ''),
    staff: sale.staffName ?? '', channel: (sale.channel ?? 'counter').toUpperCase(), table: anySale.tableName ?? '',
    note: sale.note ?? '', terms: s.termsText, footer: s.footerNote,
    items, item_count: sale.lines.length, qty_total: sale.lines.reduce((t, l) => t + l.qty, 0),
    subtotal: fx(sale.subTotal), item_discount: fx(sale.itemDiscount), bill_discount: fx(sale.billDiscount),
    coupon: sale.couponCode ?? '', coupon_value: fx(sale.couponValue),
    service_charge: fx(anySale.serviceCharge ?? 0), delivery_charge: fx(anySale.deliveryCharge ?? 0),
    packaging_charge: fx(anySale.packagingCharge ?? 0), tip: fx(anySale.tip ?? 0),
    taxable: fx(sale.taxable), cgst: fx(sale.gstAmount / 2), sgst: fx(sale.gstAmount / 2), gst_total: fx(sale.gstAmount),
    round_off: fx(sale.roundOff), total: fx(sale.total), total_plain: sale.total.toFixed(2),
    total_words: amountInWords(sale.total),
    savings: fx(savings), has_savings: savings > 0,
    pay_mode: sale.payMode.toUpperCase(), tendered: sale.tendered ? fx(sale.tendered) : '', change: sale.change ? fx(sale.change) : '',
    points_earned: sale.pointsEarned ?? 0, points_redeemed: sale.pointsRedeemed ?? 0,
    upi_qr: x.upiQr ?? '', upi_id: x.upiId ?? '',
    barcode: code128DataUri(sale.invoiceNo, { height: 34, scale: 1.3 }),
    currency: cur, year: String(d.getFullYear()),
  };
}

/* ── tiny mustache-ish renderer ─────────────────────────────────── */

export function renderTemplate(html: string, ctx: Record<string, any>): string {
  // loops {{#items}} … {{/items}}
  let out = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, key, block) => {
    const val = ctx[key];
    if (Array.isArray(val)) return val.map((row) => renderTemplate(block, { ...ctx, ...row })).join('');
    return val ? renderTemplate(block, ctx) : '';
  });
  // negations {{^key}} … {{/key}}
  out = out.replace(/\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, key, block) => (ctx[key] ? '' : renderTemplate(block, ctx)));
  // simple tokens
  out = out.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const v = ctx[key];
    return v === undefined || v === null ? '' : String(v);
  });
  return out;
}

/* ── shared css helpers ─────────────────────────────────────────── */

const thermal = (w: string, extra = '') => `
@page{size:${w} auto;margin:{{margin}}mm}
*{box-sizing:border-box}
body{width:${w};margin:0 auto;padding:2mm;color:#000;background:#fff;font-family:ui-monospace,'Courier New',monospace;font-size:11.5px;line-height:1.35}
.c{text-align:center}.r{text-align:right}.b{font-weight:700}.sm{font-size:10px}.xs{font-size:9px}
h1{font-size:15px;margin:0}
table{width:100%;border-collapse:collapse}
td,th{padding:1.5px 0;vertical-align:top}
.hr{border-top:1px dashed #000;margin:4px 0}
.hr2{border-top:1px solid #000;margin:4px 0}
.tot{font-size:15px;font-weight:800}
img.qr{width:96px;height:96px}
${extra}`;

const a4 = (extra = '') => `
@page{size:A4;margin:12mm}
*{box-sizing:border-box}
body{margin:0;color:#111;background:#fff;font-family:'Segoe UI',system-ui,sans-serif;font-size:12.5px}
h1{margin:0;font-size:23px}
table{width:100%;border-collapse:collapse}
th{background:#f2f4f8;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:7px}
td{padding:7px;border-bottom:1px solid #e6e9ef}
.r{text-align:right}.c{text-align:center}.b{font-weight:700}.muted{color:#667}
.box{border:1px solid #dfe3ea;border-radius:8px;padding:10px}
.tot{font-size:19px;font-weight:800}
img.qr{width:110px;height:110px}
${extra}`;

const HEAD = (title: string, css: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>`;
const FOOT = `</body></html>`;

const ITEMS_THERMAL = `
<table>
<tr class="b"><td>Item</td><td class="r">Qty</td><td class="r">Rate</td><td class="r">Amt</td></tr>
{{#items}}<tr><td colspan="4">{{name}}</td></tr>
<tr><td></td><td class="r">{{qty}}</td><td class="r">{{rate}}</td><td class="r">{{amount}}</td></tr>
{{#note}}<tr><td colspan="4" class="xs">↳ {{note}}</td></tr>{{/note}}{{/items}}
</table>`;

const TOTALS_THERMAL = `
<table class="sm">
<tr><td>Subtotal</td><td class="r">{{subtotal}}</td></tr>
{{#has_savings}}<tr><td>You saved</td><td class="r">-{{savings}}</td></tr>{{/has_savings}}
<tr><td>CGST</td><td class="r">{{cgst}}</td></tr>
<tr><td>SGST</td><td class="r">{{sgst}}</td></tr>
<tr><td>Round off</td><td class="r">{{round_off}}</td></tr>
</table>
<div class="hr"></div>
<table><tr class="tot"><td>TOTAL</td><td class="r">{{total}}</td></tr></table>
<table class="sm"><tr><td>Paid via</td><td class="r">{{pay_mode}}</td></tr>
{{#tendered}}<tr><td>Tendered</td><td class="r">{{tendered}}</td></tr><tr><td>Change</td><td class="r">{{change}}</td></tr>{{/tendered}}
{{#points_earned}}<tr><td>Points earned</td><td class="r">{{points_earned}}</td></tr>{{/points_earned}}</table>`;

const UPI_BLOCK = `{{#upi_qr}}<div class="hr"></div><div class="c"><div class="b sm">SCAN TO PAY</div><img class="qr" src="{{upi_qr}}"/><div class="xs">{{upi_id}}</div></div>{{/upi_qr}}`;

/* ── 20 built-in templates ──────────────────────────────────────── */

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'thermal-classic', name: 'Classic Thermal', paper: '80mm', group: 'Thermal',
    desc: 'The everyday 80mm receipt — clean, dense, fast to read.',
    html: HEAD('{{invoice_no}}', thermal('80mm')) + `
<div class="c"><h1>{{shop_name}}</h1><div class="xs">{{address}}</div><div class="xs">{{phone}}{{#gstin}} · GSTIN {{gstin}}{{/gstin}}</div></div>
<div class="hr"></div>
<table class="sm"><tr><td class="b">{{invoice_no}}</td><td class="r">{{datetime}}</td></tr>
<tr><td>{{customer_name}}</td><td class="r">{{staff}}</td></tr></table>
<div class="hr"></div>` + ITEMS_THERMAL + `<div class="hr"></div>` + TOTALS_THERMAL + UPI_BLOCK + `
<div class="hr"></div><div class="c xs">{{footer}}</div>
{{#barcode}}<div class="c"><img src="{{barcode}}" style="height:40px"/></div>{{/barcode}}
<div class="c xs">Powered by SwiftPOS Pro</div>` + FOOT,
  },
  {
    id: 'thermal-compact', name: 'Compact 58mm', paper: '58mm', group: 'Thermal',
    desc: 'Tiny 58mm roll — only the essentials, saves paper.',
    html: HEAD('{{invoice_no}}', thermal('58mm', 'body{font-size:10px}h1{font-size:13px}')) + `
<div class="c b">{{shop_name}}</div><div class="c xs">{{phone}}</div>
<div class="hr"></div><div class="xs">{{invoice_no}} · {{datetime}}</div><div class="hr"></div>
{{#items}}<table class="xs"><tr><td>{{name}}</td></tr><tr><td>{{qty}} x {{rate}}</td><td class="r">{{amount}}</td></tr></table>{{/items}}
<div class="hr"></div><table><tr class="tot"><td>TOTAL</td><td class="r">{{total}}</td></tr></table>
<div class="xs">{{pay_mode}}{{#change}} · Change {{change}}{{/change}}</div>` + UPI_BLOCK + `
<div class="hr"></div><div class="c xs">{{footer}}</div>` + FOOT,
  },
  {
    id: 'thermal-detailed', name: 'Detailed Tax Thermal', paper: '80mm', group: 'Thermal',
    desc: 'Per-item HSN, GST% and taxable value — audit friendly.',
    html: HEAD('{{invoice_no}}', thermal('80mm')) + `
<div class="c"><h1>{{shop_name}}</h1><div class="xs">{{address}}</div>
<div class="xs">GSTIN {{gstin}}{{#fssai}} · FSSAI {{fssai}}{{/fssai}}</div></div>
<div class="hr2"></div><div class="b c sm">TAX INVOICE</div><div class="hr"></div>
<table class="xs"><tr><td>Bill</td><td class="r b">{{invoice_no}}</td></tr>
<tr><td>Date</td><td class="r">{{datetime}}</td></tr><tr><td>Customer</td><td class="r">{{customer_name}}</td></tr></table>
<div class="hr"></div>
<table class="xs"><tr class="b"><td>#</td><td>Item / HSN</td><td class="r">Qty</td><td class="r">Rate</td><td class="r">GST</td><td class="r">Amt</td></tr>
{{#items}}<tr><td>{{sr}}</td><td>{{name}}<br><span class="xs">{{hsn}}</span></td><td class="r">{{qty}}</td><td class="r">{{rate}}</td><td class="r">{{gst}}</td><td class="r">{{amount}}</td></tr>{{/items}}
</table><div class="hr"></div>
<table class="sm"><tr><td>Taxable value</td><td class="r">{{taxable}}</td></tr>
<tr><td>CGST</td><td class="r">{{cgst}}</td></tr><tr><td>SGST</td><td class="r">{{sgst}}</td></tr>
<tr><td>Round off</td><td class="r">{{round_off}}</td></tr></table>
<div class="hr2"></div><table><tr class="tot"><td>TOTAL</td><td class="r">{{total}}</td></tr></table>
<div class="xs">{{total_words}}</div>` + UPI_BLOCK + `<div class="hr"></div><div class="c xs">{{terms}}</div>` + FOOT,
  },
  {
    id: 'thermal-minimal', name: 'Minimal Mono', paper: '80mm', group: 'Thermal',
    desc: 'Ultra-clean, no borders, lots of whitespace.',
    html: HEAD('{{invoice_no}}', thermal('80mm', 'body{font-family:system-ui,sans-serif;font-size:12px}.hr{border:0;height:8px}')) + `
<div class="b" style="font-size:17px">{{shop_name}}</div><div class="xs">{{datetime}} · {{invoice_no}}</div>
<div class="hr"></div>
{{#items}}<table><tr><td>{{name}} <span class="xs">x{{qty}}</span></td><td class="r">{{amount}}</td></tr></table>{{/items}}
<div class="hr"></div>
<table><tr><td class="sm">Tax incl.</td><td class="r sm">{{gst_total}}</td></tr>
<tr class="tot"><td>Total</td><td class="r">{{total}}</td></tr></table>
<div class="sm">{{pay_mode}}</div>` + UPI_BLOCK + `<div class="hr"></div><div class="xs">{{footer}}</div>` + FOOT,
  },
  {
    id: 'thermal-bold', name: 'Bold Header', paper: '80mm', group: 'Thermal',
    desc: 'Big inverted shop banner — stands out in a wallet.',
    html: HEAD('{{invoice_no}}', thermal('80mm', '.banner{background:#000;color:#fff;padding:6px;text-align:center;font-weight:800;font-size:17px;letter-spacing:.05em}')) + `
<div class="banner">{{shop_name}}</div>
<div class="c xs" style="margin-top:3px">{{address}} · {{phone}}</div>
<div class="hr"></div><table class="sm"><tr><td class="b">{{invoice_no}}</td><td class="r">{{date}} {{time}}</td></tr></table>
<div class="hr"></div>` + ITEMS_THERMAL + `<div class="hr"></div>` + TOTALS_THERMAL + UPI_BLOCK + `
<div class="hr"></div><div class="c b">{{footer}}</div>` + FOOT,
  },
  {
    id: 'thermal-restaurant', name: 'Restaurant Bill', paper: '80mm', group: 'Thermal',
    desc: 'Table, covers, service charge and tip line for dine-in.',
    html: HEAD('{{invoice_no}}', thermal('80mm')) + `
<div class="c"><h1>{{shop_name}}</h1><div class="xs">{{address}}</div><div class="xs">{{phone}}</div></div>
<div class="hr"></div>
<table class="sm"><tr><td>Bill</td><td class="r b">{{invoice_no}}</td></tr>
<tr><td>Type</td><td class="r">{{channel}}{{#table}} · Table {{table}}{{/table}}</td></tr>
<tr><td>Time</td><td class="r">{{datetime}}</td></tr><tr><td>Steward</td><td class="r">{{staff}}</td></tr></table>
<div class="hr"></div>` + ITEMS_THERMAL + `<div class="hr"></div>
<table class="sm"><tr><td>Subtotal</td><td class="r">{{subtotal}}</td></tr>
<tr><td>Service charge</td><td class="r">{{service_charge}}</td></tr>
<tr><td>Packaging</td><td class="r">{{packaging_charge}}</td></tr>
<tr><td>Delivery</td><td class="r">{{delivery_charge}}</td></tr>
<tr><td>GST</td><td class="r">{{gst_total}}</td></tr></table>
<div class="hr2"></div><table><tr class="tot"><td>TOTAL</td><td class="r">{{total}}</td></tr></table>
<div class="sm">Tip: ______________</div>` + UPI_BLOCK + `
<div class="hr"></div><div class="c xs">{{footer}} · Do visit again!</div>` + FOOT,
  },
  {
    id: 'thermal-pharmacy', name: 'Pharmacy Rx Bill', paper: '80mm', group: 'Thermal',
    desc: 'Batch, expiry and drug-licence details for medical stores.',
    html: HEAD('{{invoice_no}}', thermal('80mm')) + `
<div class="c"><h1>{{shop_name}}</h1><div class="xs">{{address}}</div>
<div class="xs">DL No: {{drug_license}} · GSTIN {{gstin}}</div></div>
<div class="hr2"></div><div class="c b sm">RETAIL DRUG INVOICE</div><div class="hr"></div>
<table class="xs"><tr><td>Bill</td><td class="r b">{{invoice_no}}</td></tr>
<tr><td>Patient</td><td class="r">{{customer_name}}</td></tr>
<tr><td>Date</td><td class="r">{{datetime}}</td></tr></table>
<div class="hr"></div>
<table class="xs"><tr class="b"><td>Medicine</td><td class="r">Qty</td><td class="r">Rate</td><td class="r">Amt</td></tr>
{{#items}}<tr><td>{{name}}</td><td class="r">{{qty}}</td><td class="r">{{rate}}</td><td class="r">{{amount}}</td></tr>{{/items}}</table>
<div class="hr"></div>` + TOTALS_THERMAL + UPI_BLOCK + `
<div class="hr"></div><div class="xs">Not dispensed without a valid prescription. {{terms}}</div>
<div class="c xs" style="margin-top:8px">Pharmacist signature: ____________</div>` + FOOT,
  },
  {
    id: 'thermal-token', name: 'Token / Queue Slip', paper: '58mm', group: 'Thermal',
    desc: 'Giant order number for counters and takeaway pickup.',
    html: HEAD('{{invoice_no}}', thermal('58mm', '.tok{font-size:56px;font-weight:900;text-align:center;line-height:1}')) + `
<div class="c b">{{shop_name}}</div><div class="hr"></div>
<div class="c xs">YOUR TOKEN</div><div class="tok">{{invoice_no}}</div>
<div class="hr"></div><div class="c sm">{{item_count}} items · {{total}}</div>
<div class="c xs">{{datetime}}</div><div class="hr"></div>
<div class="c xs">Please keep this slip until your order is served.</div>` + FOOT,
  },
  {
    id: 'thermal-gift', name: 'Gift Receipt', paper: '80mm', group: 'Thermal',
    desc: 'Items without prices — perfect for gifting and exchanges.',
    html: HEAD('{{invoice_no}}', thermal('80mm')) + `
<div class="c"><h1>{{shop_name}}</h1><div class="xs">{{address}}</div></div>
<div class="hr"></div><div class="c b">GIFT RECEIPT</div><div class="hr"></div>
{{#items}}<div>• {{name}} <span class="xs">x{{qty}}</span></div>{{/items}}
<div class="hr"></div>
<table class="sm"><tr><td>Bill</td><td class="r">{{invoice_no}}</td></tr><tr><td>Date</td><td class="r">{{date}}</td></tr></table>
<div class="hr"></div><div class="c xs">Exchangeable within 7 days with this receipt. {{footer}}</div>` + FOOT,
  },
  {
    id: 'thermal-duplicate', name: 'Duplicate Copy', paper: '80mm', group: 'Thermal',
    desc: 'Marked CUSTOMER / MERCHANT copy with a watermark strip.',
    html: HEAD('{{invoice_no}}', thermal('80mm', '.wm{border:2px solid #000;text-align:center;font-weight:800;padding:3px;letter-spacing:.15em}')) + `
<div class="wm">{{copy_label}}</div>
<div class="c" style="margin-top:4px"><h1>{{shop_name}}</h1><div class="xs">GSTIN {{gstin}}</div></div>
<div class="hr"></div><table class="sm"><tr><td class="b">{{invoice_no}}</td><td class="r">{{datetime}}</td></tr></table>
<div class="hr"></div>` + ITEMS_THERMAL + `<div class="hr"></div>` + TOTALS_THERMAL + `
<div class="hr"></div><div class="c xs">{{footer}}</div>` + FOOT,
  },
  {
    id: 'thermal-upi', name: 'UPI Pay-First', paper: '80mm', group: 'Thermal',
    desc: 'Huge scan-to-pay QR at the top for pay-after-order flows.',
    html: HEAD('{{invoice_no}}', thermal('80mm', 'img.qr{width:150px;height:150px}')) + `
<div class="c"><h1>{{shop_name}}</h1></div>
<div class="c b" style="font-size:19px">PAY {{total}}</div>
{{#upi_qr}}<div class="c"><img class="qr" src="{{upi_qr}}"/><div class="sm b">{{upi_id}}</div>
<div class="xs">Scan with any UPI app · GPay · PhonePe · Paytm</div></div>{{/upi_qr}}
<div class="hr"></div><table class="sm"><tr><td class="b">{{invoice_no}}</td><td class="r">{{datetime}}</td></tr></table>
<div class="hr"></div>` + ITEMS_THERMAL + `<div class="hr"></div>
<table><tr class="tot"><td>TOTAL</td><td class="r">{{total}}</td></tr></table>
<div class="hr"></div><div class="c xs">{{footer}}</div>` + FOOT,
  },
  {
    id: 'thermal-loyalty', name: 'Loyalty Focus', paper: '80mm', group: 'Thermal',
    desc: 'Highlights points earned, savings and the member panel.',
    html: HEAD('{{invoice_no}}', thermal('80mm', '.pts{border:1px dashed #000;padding:5px;text-align:center;margin-top:4px}')) + `
<div class="c"><h1>{{shop_name}}</h1><div class="xs">{{tagline}}</div></div>
<div class="hr"></div><table class="sm"><tr><td>{{customer_name}}</td><td class="r">{{invoice_no}}</td></tr></table>
<div class="hr"></div>` + ITEMS_THERMAL + `<div class="hr"></div>` + TOTALS_THERMAL + `
<div class="pts"><div class="b">★ {{points_earned}} POINTS EARNED ★</div>
{{#has_savings}}<div class="sm">You saved {{savings}} today!</div>{{/has_savings}}</div>` + UPI_BLOCK + `
<div class="hr"></div><div class="c xs">{{footer}}</div>` + FOOT,
  },
  {
    id: 'a4-tax-invoice', name: 'A4 GST Tax Invoice', paper: 'A4', group: 'A4 / Invoice',
    desc: 'Formal GST invoice with party block, HSN table and signature.',
    html: HEAD('{{invoice_no}}', a4()) + `
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #111;padding-bottom:10px">
  <div>{{#logo}}<img src="{{logo}}" style="height:46px"/>{{/logo}}<h1>{{shop_name}}</h1>
    <div class="muted">{{address}}<br>{{phone}} · {{email}}</div>
    <div class="muted">GSTIN: <b>{{gstin}}</b>{{#pan}} · PAN: {{pan}}{{/pan}}</div></div>
  <div class="r"><div class="b" style="font-size:19px">TAX INVOICE</div>
    <div class="muted">{{invoice_no}}<br>{{datetime}}</div>{{#copy_label}}<div class="b">{{copy_label}}</div>{{/copy_label}}</div>
</div>
<div style="display:flex;gap:12px;margin:12px 0">
  <div class="box" style="flex:1"><div class="muted b">BILL TO</div><div class="b">{{customer_name}}</div><div class="muted">{{customer_phone}}</div></div>
  <div class="box" style="flex:1"><div class="muted b">DETAILS</div><div>Channel: {{channel}}</div><div>Served by: {{staff}}</div></div>
</div>
<table><thead><tr><th>#</th><th>Description</th><th>HSN</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">GST</th><th class="r">Amount</th></tr></thead>
<tbody>{{#items}}<tr><td>{{sr}}</td><td>{{name}}</td><td>{{hsn}}</td><td class="r">{{qty}} {{unit}}</td><td class="r">{{rate}}</td><td class="r">{{gst}}</td><td class="r b">{{amount}}</td></tr>{{/items}}</tbody></table>
<div style="display:flex;justify-content:space-between;margin-top:14px;gap:16px">
  <div style="flex:1">
    <div class="box"><div class="b">Amount in words</div><div class="muted">{{total_words}}</div></div>
    {{#upi_qr}}<div class="box" style="margin-top:8px;display:flex;gap:10px;align-items:center"><img class="qr" src="{{upi_qr}}"/><div><div class="b">Scan &amp; Pay</div><div class="muted">{{upi_id}}</div></div></div>{{/upi_qr}}
  </div>
  <div style="width:270px">
    <table>
      <tr><td>Subtotal</td><td class="r">{{subtotal}}</td></tr>
      <tr><td>Discount</td><td class="r">-{{savings}}</td></tr>
      <tr><td>Taxable value</td><td class="r">{{taxable}}</td></tr>
      <tr><td>CGST</td><td class="r">{{cgst}}</td></tr>
      <tr><td>SGST</td><td class="r">{{sgst}}</td></tr>
      <tr><td>Round off</td><td class="r">{{round_off}}</td></tr>
      <tr><td class="tot">TOTAL</td><td class="r tot">{{total}}</td></tr>
      <tr><td>Paid via</td><td class="r">{{pay_mode}}</td></tr>
    </table>
    <div style="margin-top:38px;text-align:center">{{#signature}}<img src="{{signature}}" style="height:40px"/>{{/signature}}
      <div style="border-top:1px solid #333;padding-top:4px" class="muted">Authorised signatory</div></div>
  </div>
</div>
<div class="muted" style="margin-top:14px;border-top:1px solid #e6e9ef;padding-top:8px">{{terms}}<br>{{footer}}</div>` + FOOT,
  },
  {
    id: 'a4-modern', name: 'A4 Modern Accent', paper: 'A4', group: 'A4 / Invoice',
    desc: 'Colour-blocked modern invoice with a clean summary card.',
    html: HEAD('{{invoice_no}}', a4('.hdr{background:#0f172a;color:#fff;padding:20px;border-radius:12px}.hdr .muted{color:#9fb0c8}th{background:#eef6ff}')) + `
<div class="hdr" style="display:flex;justify-content:space-between">
  <div><div style="font-size:24px;font-weight:800">{{shop_name}}</div><div class="muted">{{tagline}}</div>
  <div class="muted" style="margin-top:6px">{{address}}<br>{{phone}} · GSTIN {{gstin}}</div></div>
  <div class="r"><div style="font-size:13px;letter-spacing:.2em">INVOICE</div>
  <div style="font-size:20px;font-weight:800">{{invoice_no}}</div><div class="muted">{{datetime}}</div></div>
</div>
<div style="display:flex;gap:12px;margin:14px 0"><div class="box" style="flex:1"><div class="muted">Billed to</div><div class="b">{{customer_name}}</div><div class="muted">{{customer_phone}}</div></div>
<div class="box" style="flex:1"><div class="muted">Payment</div><div class="b">{{pay_mode}}</div><div class="muted">{{channel}}</div></div>
<div class="box" style="flex:1"><div class="muted">Total due</div><div class="tot">{{total}}</div></div></div>
<table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
<tbody>{{#items}}<tr><td>{{name}}</td><td class="r">{{qty}}</td><td class="r">{{rate}}</td><td class="r">{{amount}}</td></tr>{{/items}}</tbody></table>
<div style="display:flex;justify-content:flex-end;margin-top:12px"><table style="width:280px">
<tr><td>Subtotal</td><td class="r">{{subtotal}}</td></tr><tr><td>GST</td><td class="r">{{gst_total}}</td></tr>
<tr><td>Round off</td><td class="r">{{round_off}}</td></tr><tr><td class="tot">Total</td><td class="r tot">{{total}}</td></tr></table></div>
{{#upi_qr}}<div style="margin-top:14px;display:flex;gap:10px;align-items:center"><img class="qr" src="{{upi_qr}}"/><div><div class="b">Scan to pay instantly</div><div class="muted">{{upi_id}}</div></div></div>{{/upi_qr}}
<div class="muted" style="margin-top:16px">{{footer}}</div>` + FOOT,
  },
  {
    id: 'a4-minimal', name: 'A4 Minimal', paper: 'A4', group: 'A4 / Invoice',
    desc: 'Typography-first, no boxes — elegant and printer friendly.',
    html: HEAD('{{invoice_no}}', a4('th{background:none;border-bottom:2px solid #111}')) + `
<div style="display:flex;justify-content:space-between;align-items:baseline">
  <h1 style="letter-spacing:-.02em">{{shop_name}}</h1><div class="muted">{{invoice_no}} · {{date}}</div></div>
<div class="muted" style="margin-bottom:18px">{{address}} · {{phone}}</div>
<div class="muted">Billed to</div><div class="b" style="font-size:15px;margin-bottom:12px">{{customer_name}}</div>
<table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
<tbody>{{#items}}<tr><td>{{name}}</td><td class="r">{{qty}}</td><td class="r">{{rate}}</td><td class="r">{{amount}}</td></tr>{{/items}}</tbody></table>
<div style="display:flex;justify-content:flex-end;margin-top:16px"><div style="width:240px">
<div style="display:flex;justify-content:space-between"><span class="muted">Subtotal</span><span>{{subtotal}}</span></div>
<div style="display:flex;justify-content:space-between"><span class="muted">Tax</span><span>{{gst_total}}</span></div>
<div style="display:flex;justify-content:space-between;border-top:2px solid #111;margin-top:6px;padding-top:6px" class="tot"><span>Total</span><span>{{total}}</span></div>
</div></div>
<div class="muted" style="margin-top:26px">{{total_words}}</div>
<div class="muted" style="margin-top:26px">{{terms}}</div>` + FOOT,
  },
  {
    id: 'a4-estimate', name: 'A4 Quotation / Estimate', paper: 'A4', group: 'A4 / Invoice',
    desc: 'Non-tax estimate with validity note — great before a sale.',
    html: HEAD('Estimate {{invoice_no}}', a4()) + `
<div style="display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:8px">
<div><h1>{{shop_name}}</h1><div class="muted">{{address}}<br>{{phone}}</div></div>
<div class="r"><div class="b" style="font-size:18px">ESTIMATE</div><div class="muted">{{invoice_no}}<br>{{date}}</div></div></div>
<div class="box" style="margin:12px 0"><div class="muted">Prepared for</div><div class="b">{{customer_name}}</div></div>
<table><thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
<tbody>{{#items}}<tr><td>{{sr}}</td><td>{{name}}</td><td class="r">{{qty}}</td><td class="r">{{rate}}</td><td class="r">{{amount}}</td></tr>{{/items}}</tbody></table>
<div style="display:flex;justify-content:flex-end;margin-top:12px"><table style="width:260px">
<tr><td class="tot">Estimated total</td><td class="r tot">{{total}}</td></tr></table></div>
<div class="box muted" style="margin-top:16px">This is an estimate, not a tax invoice. Prices valid for 7 days and subject to stock availability.<br>{{terms}}</div>` + FOOT,
  },
  {
    id: 'a4-delivery', name: 'A4 Delivery Challan', paper: 'A4', group: 'Specialised',
    desc: 'Dispatch note with address block, no tax summary.',
    html: HEAD('Challan {{invoice_no}}', a4()) + `
<div style="display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:8px">
<div><h1>{{shop_name}}</h1><div class="muted">{{phone}} · {{gstin}}</div></div>
<div class="r"><div class="b" style="font-size:18px">DELIVERY CHALLAN</div><div class="muted">{{invoice_no}} · {{datetime}}</div></div></div>
<div style="display:flex;gap:12px;margin:12px 0">
<div class="box" style="flex:1"><div class="muted b">DELIVER TO</div><div class="b">{{customer_name}}</div><div>{{customer_phone}}</div><div class="muted">{{note}}</div></div>
<div class="box" style="flex:1"><div class="muted b">DISPATCH</div><div>Channel: {{channel}}</div><div>Packed by: {{staff}}</div><div>Items: {{item_count}} · Qty: {{qty_total}}</div></div></div>
<table><thead><tr><th>#</th><th>Item</th><th class="r">Qty</th></tr></thead>
<tbody>{{#items}}<tr><td>{{sr}}</td><td>{{name}}</td><td class="r">{{qty}} {{unit}}</td></tr>{{/items}}</tbody></table>
<div style="display:flex;justify-content:space-between;margin-top:50px" class="muted">
<div style="border-top:1px solid #333;padding-top:4px;width:200px;text-align:center">Receiver signature</div>
<div style="border-top:1px solid #333;padding-top:4px;width:200px;text-align:center">For {{shop_name}}</div></div>` + FOOT,
  },
  {
    id: 'kot-kitchen', name: 'Kitchen KOT', paper: '80mm', group: 'Specialised',
    desc: 'Kitchen order ticket — big item names, no prices.',
    html: HEAD('KOT {{invoice_no}}', thermal('80mm', 'body{font-size:14px}.it{font-size:16px;font-weight:800;margin:3px 0}')) + `
<div class="c sm">{{shop_name}}</div>
<div class="c b" style="font-size:18px">KOT · {{invoice_no}}</div>
<div class="c sm">{{channel}}{{#table}} · TABLE {{table}}{{/table}}</div>
<div class="c xs">{{datetime}} · {{staff}}</div>
<div class="hr2"></div>
{{#items}}<div class="it">{{qty}} × {{name}}</div>{{#note}}<div class="sm">↳ {{note}}</div>{{/note}}{{/items}}
<div class="hr2"></div><div class="c sm">{{item_count}} items · {{qty_total}} qty</div>
{{#note}}<div class="sm">Order note: {{note}}</div>{{/note}}` + FOOT,
  },
  {
    id: 'label-shelf', name: 'Shelf / Price Label', paper: '58mm', group: 'Specialised',
    desc: 'Per-item price tag strip with barcode, printed from a bill.',
    html: HEAD('Labels', thermal('58mm', '.lb{border:1px solid #000;padding:4px;margin-bottom:4px;text-align:center}.pr{font-size:20px;font-weight:900}')) + `
{{#items}}<div class="lb"><div class="sm b">{{name}}</div><div class="pr">{{rate}}</div>
<div class="xs">{{shop_name}}</div></div>{{/items}}` + FOOT,
  },
  {
    id: 'thermal-eod', name: 'Day Close (Z-Report)', paper: '80mm', group: 'Specialised',
    desc: 'End-of-day summary layout for the cash drawer reconciliation.',
    html: HEAD('Z-Report', thermal('80mm')) + `
<div class="c"><h1>{{shop_name}}</h1><div class="b">DAY CLOSE / Z-REPORT</div><div class="xs">{{datetime}}</div></div>
<div class="hr2"></div>
<table class="sm"><tr><td>Reference bill</td><td class="r">{{invoice_no}}</td></tr>
<tr><td>Cashier</td><td class="r">{{staff}}</td></tr></table>
<div class="hr"></div>
{{#items}}<table class="sm"><tr><td>{{name}}</td><td class="r">{{qty}}</td><td class="r">{{amount}}</td></tr></table>{{/items}}
<div class="hr"></div>
<table class="sm"><tr><td>Gross sales</td><td class="r">{{subtotal}}</td></tr>
<tr><td>Discounts</td><td class="r">-{{savings}}</td></tr><tr><td>Tax collected</td><td class="r">{{gst_total}}</td></tr></table>
<div class="hr2"></div><table><tr class="tot"><td>NET</td><td class="r">{{total}}</td></tr></table>
<div class="hr"></div><div class="c xs">Signature: ________________</div>` + FOOT,
  },
];

export const TEMPLATE_TOKENS: { token: string; desc: string }[] = [
  { token: '{{shop_name}}', desc: 'Store name' }, { token: '{{tagline}}', desc: 'Store tagline' },
  { token: '{{address}}', desc: 'Full address' }, { token: '{{phone}}', desc: 'Primary phone' },
  { token: '{{email}}', desc: 'Email' }, { token: '{{website}}', desc: 'Website' },
  { token: '{{gstin}}', desc: 'GSTIN' }, { token: '{{fssai}}', desc: 'FSSAI licence' },
  { token: '{{drug_license}}', desc: 'Drug licence no.' }, { token: '{{pan}}', desc: 'PAN' },
  { token: '{{logo}}', desc: 'Uploaded logo (data URL)' }, { token: '{{signature}}', desc: 'Signature image' },
  { token: '{{invoice_no}}', desc: 'Bill number' }, { token: '{{date}} {{time}} {{datetime}}', desc: 'Date & time' },
  { token: '{{customer_name}}', desc: 'Customer name' }, { token: '{{customer_phone}}', desc: 'Customer phone' },
  { token: '{{staff}}', desc: 'Cashier name' }, { token: '{{channel}}', desc: 'Counter / delivery / takeaway' },
  { token: '{{table}}', desc: 'Table name (restaurants)' }, { token: '{{copy_label}}', desc: 'CUSTOMER / MERCHANT copy' },
  { token: '{{#items}} … {{/items}}', desc: 'Loop over line items' },
  { token: '{{sr}} {{name}} {{qty}} {{unit}} {{rate}} {{mrp}} {{gst}} {{hsn}} {{disc}} {{amount}} {{note}}', desc: 'Available inside the items loop' },
  { token: '{{item_count}} {{qty_total}}', desc: 'Counts' },
  { token: '{{subtotal}} {{item_discount}} {{bill_discount}} {{coupon}} {{coupon_value}}', desc: 'Discount block' },
  { token: '{{service_charge}} {{delivery_charge}} {{packaging_charge}} {{tip}}', desc: 'Extra charges' },
  { token: '{{taxable}} {{cgst}} {{sgst}} {{gst_total}} {{round_off}}', desc: 'Tax block' },
  { token: '{{total}} {{total_plain}} {{total_words}}', desc: 'Grand total' },
  { token: '{{savings}} {{#has_savings}}…{{/has_savings}}', desc: 'Savings, shown only when > 0' },
  { token: '{{pay_mode}} {{tendered}} {{change}}', desc: 'Payment info' },
  { token: '{{points_earned}} {{points_redeemed}}', desc: 'Loyalty' },
  { token: '{{upi_qr}} {{upi_id}}', desc: 'UPI QR image + VPA' },
  { token: '{{barcode}}', desc: 'Invoice barcode image' },
  { token: '{{footer}} {{terms}} {{note}}', desc: 'Footer, terms, bill note' },
];

/* sample sale used for template previews */
export function sampleSale(): Sale {
  const line = (name: string, qty: number, price: number, gst: number) => ({
    id: Math.random().toString(36).slice(2), productId: 'x', name, qty, price, basePrice: price,
    cost: price * 0.7, gst, unit: 'pc', discount: 0,
  });
  const lines = [line('Basmati Rice 1kg', 2, 115, 5), line('Sunflower Oil 1L', 1, 149, 5), line('Tea Powder 500g', 1, 260, 5)];
  const sub = lines.reduce((t, l) => t + l.price * l.qty, 0);
  const gstAmt = lines.reduce((t, l) => t + (l.price * l.qty * l.gst) / (100 + l.gst), 0);
  return {
    id: 'sample', invoiceNo: 'INV-00042', ts: Date.now(), lines, subTotal: sub, itemDiscount: 0,
    billDiscount: 20, couponValue: 0, taxable: sub - gstAmt, gstAmount: +gstAmt.toFixed(2),
    roundOff: 0.4, total: Math.round(sub - 20), profit: 120, payMode: 'upi', tendered: 700,
    change: 700 - Math.round(sub - 20), customerName: 'Aarav Sharma', staffName: 'Cashier 1',
    status: 'completed', pointsEarned: 6, channel: 'counter',
  } as Sale;
}
