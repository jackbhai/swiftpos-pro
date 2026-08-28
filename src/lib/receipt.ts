import type { Sale, CustomTemplate } from '@/db/types';
import type { Settings, UpiAccount } from '@/store/settings';
import { db } from '@/db/db';
import { money, dt } from './format';
import { TEMPLATES, renderTemplate, buildContext, type TemplateDef } from './templates';
import { upiLink, qrDataUrl } from './upi';

export { TEMPLATES } from './templates';

export async function allTemplates(): Promise<TemplateDef[]> {
  const custom = await db.templates.toArray().catch(() => [] as CustomTemplate[]);
  return [
    ...TEMPLATES,
    ...custom.map((c) => ({ id: c.id, name: c.name, paper: c.paper, group: 'Custom' as any, desc: c.desc ?? 'Uploaded template', html: c.html, custom: true })),
  ];
}

export async function getTemplate(id: string): Promise<TemplateDef> {
  const found = TEMPLATES.find((t) => t.id === id);
  if (found) return found;
  const c = await db.templates.get(id);
  if (c) return { id: c.id, name: c.name, paper: c.paper, group: 'Custom' as any, desc: c.desc ?? '', html: c.html, custom: true };
  return TEMPLATES[0];
}

/** Render a sale into printable HTML using a template id. */
export async function renderReceipt(sale: Sale, s: Settings, templateId?: string, opts: { copyLabel?: string; upi?: UpiAccount | null } = {}) {
  const tpl = await getTemplate(templateId ?? s.defaultTemplate);
  const upi = opts.upi ?? s.upiAccounts.find((u) => u.isDefault && u.active) ?? s.upiAccounts.find((u) => u.active) ?? null;
  let upiQr = '';
  if (upi && s.showUpiQrOnBill) {
    try { upiQr = await qrDataUrl(upiLink(upi, sale.total, sale.invoiceNo, sale.invoiceNo), 260); } catch { upiQr = ''; }
  }
  const ctx = buildContext(sale, s, { upiQr, upiId: upi?.vpa ?? '', copyLabel: opts.copyLabel, logo: s.logoDataUrl });
  let html = renderTemplate(tpl.html, { ...ctx, margin: s.printMargin });
  const scale = s.printFontScale ?? 1;
  if (scale !== 1) html = html.replace('</style>', `body{font-size:calc(1em * ${scale}) !important;zoom:${scale}}</style>`);
  return html;
}

/** Legacy helper kept for quick prints. */
export function receiptHTML(sale: Sale, s: Settings, size: '58mm' | '80mm' | 'a4' = '80mm') {
  const tpl = size === 'a4' ? TEMPLATES.find((t) => t.id === s.a4Template) ?? TEMPLATES[12]
    : size === '58mm' ? TEMPLATES.find((t) => t.paper === '58mm')!
    : TEMPLATES.find((t) => t.id === s.defaultTemplate) ?? TEMPLATES[0];
  return renderTemplate(tpl.html, { ...buildContext(sale, s, { logo: s.logoDataUrl }), margin: s.printMargin });
}

export function printHTML(html: string, copies = 1) {
  const doc = copies > 1
    ? html.replace('</body>', Array.from({ length: copies - 1 }, () => '<div style="page-break-before:always"></div>').join('') + '</body>')
    : html;
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  const d = f.contentDocument!;
  d.open(); d.write(doc); d.close();
  setTimeout(() => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 1500); }, 300);
}

export async function printSale(sale: Sale, s: Settings, templateId?: string, copyLabel?: string) {
  printHTML(await renderReceipt(sale, s, templateId, { copyLabel }), s.printCopies);
}

export function saleText(sale: Sale, s: Settings) {
  const items = sale.lines.map((l) => `• ${l.name} x${l.qty} = ${money(l.price * l.qty, s.currency)}`).join('\n');
  const upi = s.upiAccounts.find((u) => u.isDefault && u.active);
  return (s.waBillTemplate || 'Hi {customer}, bill {invoice} of {total} from {shop}.')
    .replace('{customer}', sale.customerName ?? 'there')
    .replace('{shop}', s.shopName)
    .replace('{invoice}', sale.invoiceNo)
    .replace('{total}', money(sale.total, s.currency))
    .replace('{footer}', s.footerNote)
    + `\n\n${items}\n\n${dt(sale.ts)}${upi ? `\nUPI: ${upi.vpa}` : ''}`;
}

export const waLink = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(text)}`;
