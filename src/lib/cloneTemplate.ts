/* ── Bill photo → template cloner ───────────────────────────────────
   Kisi bhi purane bill ki photo se same-to-same template banao.
   Approach (100% offline, no AI/server needed):
   - bill photo ka UPPER hissa (shop name, logo, address) header image banta hai
   - NEECHE ka hissa (thank-you, terms, sign) footer image banta hai
   - BEECH ka hissa dynamic hota hai: bill no, date, items, total — har bill
     par badalte hue {{tokens}} ke saath.
   Header/footer original pixels hone se print bilkul original jaisa lagta hai. */

export interface CloneOptions {
  paper: '58mm' | '80mm' | 'A4';
  headerImg: string;          // data URL (jpeg) or ''
  footerImg: string;          // data URL (jpeg) or ''
  showMeta: boolean;          // bill no / date / customer row
  itemsStyle: 'compact' | 'detailed';
  showTaxRows: boolean;       // CGST/SGST rows (else single GST row)
  showQr: boolean;
  showBarcode: boolean;
  showWords: boolean;         // amount in words
  font: 'mono' | 'sans';
}

const PAPER_W: Record<CloneOptions['paper'], string> = {
  '58mm': '58mm',
  '80mm': '80mm',
  A4: '210mm',
};

/** Build printable template HTML from cloned header/footer images + tokens. */
export function buildClonedTemplate(o: CloneOptions): string {
  const isA4 = o.paper === 'A4';
  const font = o.font === 'sans'
    ? `font-family:'Segoe UI',system-ui,sans-serif`
    : `font-family:ui-monospace,'Courier New',monospace`;
  const css = isA4
    ? `@page{size:A4;margin:{{margin}}mm}*{box-sizing:border-box}body{margin:0 auto;max-width:190mm;color:#111;background:#fff;${font};font-size:12.5px;line-height:1.4}`
    : `@page{size:${PAPER_W[o.paper]} auto;margin:{{margin}}mm}*{box-sizing:border-box}body{width:${PAPER_W[o.paper]};margin:0 auto;padding:1mm;color:#000;background:#fff;${font};font-size:${o.paper === '58mm' ? '10.5px' : '11.5px'};line-height:1.35}`;
  const common = `.c{text-align:center}.r{text-align:right}.b{font-weight:700}.sm{font-size:.88em}.xs{font-size:.78em}`
    + `table{width:100%;border-collapse:collapse}td,th{padding:1.5px 0;vertical-align:top}`
    + `.hr{border-top:1px dashed #000;margin:4px 0}.tot{font-size:${isA4 ? '19px' : '15px'};font-weight:800}`
    + `img.qr{width:${isA4 ? '110px' : '96px'};height:auto}img.clone{width:100%;height:auto;display:block}`;

  const head = (img: string) => img
    ? `<img class="clone" src="${img}" alt=""/>` : '';

  const meta = o.showMeta ? (isA4
    ? `<table class="sm" style="margin:8px 0"><tr><td>Bill No: <b>{{invoice_no}}</b></td><td class="r">{{datetime}}</td></tr>`
      + `<tr><td>Customer: <b>{{customer_name}}</b></td><td class="r">{{pay_mode}}</td></tr></table><div class="hr"></div>`
    : `<table class="sm"><tr><td class="b">{{invoice_no}}</td><td class="r">{{datetime}}</td></tr>`
      + `<tr><td>{{customer_name}}</td><td class="r">{{staff}}</td></tr></table><div class="hr"></div>`)
    : '';

  const items = o.itemsStyle === 'detailed'
    ? `<table class="${isA4 ? '' : 'sm'}"><tr class="b"><td>#</td><td>Item</td><td class="r">Qty</td><td class="r">Rate</td><td class="r">GST</td><td class="r">Amt</td></tr>`
      + `{{#items}}<tr><td>{{sr}}</td><td>{{name}}{{#hsn}}<br><span class="xs">{{hsn}}</span>{{/hsn}}</td>`
      + `<td class="r">{{qty}}</td><td class="r">{{rate}}</td><td class="r">{{gst}}</td><td class="r">{{amount}}</td></tr>{{/items}}</table>`
    : isA4
      ? `<table><thead><tr><th style="text-align:left">Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>`
        + `<tbody>{{#items}}<tr><td>{{name}}</td><td class="r">{{qty}}</td><td class="r">{{rate}}</td><td class="r">{{amount}}</td></tr>{{/items}}</tbody></table>`
      : `<table><tr class="b"><td>Item</td><td class="r">Qty</td><td class="r">Rate</td><td class="r">Amt</td></tr>`
        + `{{#items}}<tr><td colspan="4">{{name}}</td></tr>`
        + `<tr><td></td><td class="r">{{qty}}</td><td class="r">{{rate}}</td><td class="r">{{amount}}</td></tr>{{/items}}</table>`;

  const taxRows = o.showTaxRows
    ? `<tr><td>CGST</td><td class="r">{{cgst}}</td></tr><tr><td>SGST</td><td class="r">{{sgst}}</td></tr>`
    : `<tr><td>GST</td><td class="r">{{gst_total}}</td></tr>`;

  const totals = `<div class="hr"></div><table class="sm"><tr><td>Subtotal</td><td class="r">{{subtotal}}</td></tr>`
    + `{{#has_savings}}<tr><td>You saved</td><td class="r">-{{savings}}</td></tr>{{/has_savings}}`
    + taxRows
    + `<tr><td>Round off</td><td class="r">{{round_off}}</td></tr></table>`
    + `<div class="hr"></div><table><tr class="tot"><td>TOTAL</td><td class="r">{{total}}</td></tr></table>`
    + `<table class="sm"><tr><td>Paid via</td><td class="r">{{pay_mode}}</td></tr>`
    + `{{#tendered}}<tr><td>Tendered</td><td class="r">{{tendered}}</td></tr><tr><td>Change</td><td class="r">{{change}}</td></tr>{{/tendered}}</table>`
    + (o.showWords ? `<div class="xs" style="margin-top:2px">{{total_words}}</div>` : '');

  const qr = o.showQr
    ? `{{#upi_qr}}<div class="hr"></div><div class="c"><div class="b sm">SCAN TO PAY</div><img class="qr" src="{{upi_qr}}"/><div class="xs">{{upi_id}}</div></div>{{/upi_qr}}`
    : '';

  const barcode = o.showBarcode
    ? `{{#barcode}}<div class="c" style="margin-top:4px"><img src="{{barcode}}" style="height:38px"/></div>{{/barcode}}`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"><title>{{invoice_no}}</title>`
    + `<style>${css}\n${common}</style></head><body>`
    + head(o.headerImg)
    + (o.headerImg && (meta || items) ? `<div class="hr"></div>` : '')
    + meta + items + totals + qr + barcode
    + (o.footerImg ? `<div class="hr"></div>${head(o.footerImg)}` : '')
    + `</body></html>`;
}

/* ── image helpers (browser canvas, fully offline) ─────────────────── */

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('Could not read the image'));
    r.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Could not load the image'));
    img.src = src;
  });
}

export interface CropOpts {
  rotation: 0 | 90 | 180 | 270;
  headerPct: number;      // 5..70 — top slice kept as header
  footerPct: number;      // 5..70 — bottom slice kept as footer
  bw: boolean;            // grayscale + contrast (thermal-printer friendly)
  maxWidth: number;       // px — slices are resized to this width
  quality: number;        // jpeg quality 0..1
}

function drawRotated(img: HTMLImageElement, rotation: number): HTMLCanvasElement {
  const swap = rotation === 90 || rotation === 270;
  const c = document.createElement('canvas');
  c.width = swap ? img.height : img.width;
  c.height = swap ? img.width : img.height;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return c;
}

function toBw(src: HTMLCanvasElement) {
  const ctx = src.getContext('2d')!;
  const d = ctx.getImageData(0, 0, src.width, src.height);
  const px = d.data;
  // grayscale + gentle contrast boost + paper-white floor
  for (let i = 0; i < px.length; i += 4) {
    let g = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
    g = (g - 128) * 1.25 + 128;                 // contrast
    if (g > 225) g = 255;                        // clean paper background
    px[i] = px[i + 1] = px[i + 2] = Math.max(0, Math.min(255, g));
  }
  ctx.putImageData(d, 0, 0);
}

function slice(src: HTMLCanvasElement, y0: number, y1: number, o: CropOpts): string {
  const h = Math.max(8, Math.round(y1 - y0));
  const scale = Math.min(1, o.maxWidth / src.width);
  const c = document.createElement('canvas');
  c.width = Math.max(8, Math.round(src.width * scale));
  c.height = Math.max(8, Math.round(h * scale));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(src, 0, y0, src.width, h, 0, 0, c.width, c.height);
  if (o.bw) toBw(c);
  return c.toDataURL('image/jpeg', o.quality);
}

export interface CropResult { header: string; footer: string; width: number; height: number }

/** Rotate → slice header/footer → (optional) B&W → compress. */
export async function cropBillPhoto(src: string, o: CropOpts): Promise<CropResult> {
  const img = await loadImage(src);
  const full = drawRotated(img, o.rotation);
  const hp = Math.min(70, Math.max(0, o.headerPct)) / 100;
  const fp = Math.min(70, Math.max(0, o.footerPct)) / 100;
  const header = hp > 0 ? slice(full, 0, full.height * hp, o) : '';
  const footer = fp > 0 ? slice(full, full.height * (1 - fp), full.height, o) : '';
  return { header, footer, width: full.width, height: full.height };
}

/** Approx KB of a data URL (for storage-size display). */
export function dataUrlKB(u: string): number {
  if (!u) return 0;
  const b64 = u.split(',')[1] ?? '';
  return Math.round((b64.length * 3) / 4 / 1024);
}
