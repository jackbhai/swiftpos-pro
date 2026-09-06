import { toCanvas } from 'html-to-image';
import type { Sale } from '@/db/types';
type Settings = any;
import { renderReceipt, saleText, waLink } from './receipt';
import { download } from './csv';

/** Pixel width used when rasterising each paper size. */
const WIDTH: Record<string, number> = { '58mm': 420, '80mm': 576, a4: 820, A4: 820 };

function paperOf(html: string): string {
  if (/width:\s*58mm|58mm/.test(html)) return '58mm';
  if (/A4|210mm|a4-/.test(html)) return 'a4';
  return '80mm';
}

/** Scope a receipt's own CSS to the capture root so it cannot leak into the app. */
export function scopeReceiptCss(styles: string): string {
  return styles
    .replace(/@page[^{]*\{[^}]*\}/g, '')
    .replace(/(^|[},\n])\s*html\s*,\s*body\b/g, '$1 .bill-shot-root')
    .replace(/(^|[},\n])\s*body\b/g, '$1 .bill-shot-root')
    .replace(/(^|[},\n])\s*html\b/g, '$1 .bill-shot-root');
}

/** Rasterise options shared by every capture. `style` resets any positioning html-to-image
 *  copies onto the clone — an off-screen `left:-99999px` would otherwise render a white image. */
const SHOT_STYLE = { position: 'static', left: '0', top: '0', right: 'auto', bottom: 'auto', transform: 'none', zIndex: 'auto', visibility: 'visible', opacity: '1' } as Record<string, string>;

/**
 * Build an offscreen DOM node from a full receipt HTML document.
 * The *wrapper* is what we push off-screen; the captured root itself stays statically
 * positioned so its cloned computed style does not carry the off-screen offset.
 */
function mount(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const styles = Array.from(doc.querySelectorAll('style')).map((s) => s.textContent || '').join('\n');
  const width = WIDTH[paperOf(html)] || 576;

  const holder = document.createElement('div');
  holder.className = 'bill-shot-holder';
  holder.setAttribute('style', `position:fixed;left:0;top:0;width:${width}px;height:0;overflow:visible;transform:translateX(-200vw);pointer-events:none;z-index:-1;`);
  holder.setAttribute('aria-hidden', 'true');

  const root = document.createElement('div');
  root.className = 'bill-shot-root';
  root.setAttribute('style', `position:static;background:#ffffff;color:#000000;width:${width}px;padding:14px;box-sizing:border-box;`);

  const styleEl = document.createElement('style');
  styleEl.textContent = [
    `.bill-shot-root{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.45;color:#000;background:#fff;}`,
    `.bill-shot-root img{max-width:100%;}`,
    scopeReceiptCss(styles),
    // Win over the template's own body{width:80mm;margin:..;padding:..} so the PNG stays crisp and full-width.
    `.bill-shot-root{width:${width}px !important;max-width:none !important;min-height:0 !important;margin:0 !important;padding:14px !important;position:static !important;left:auto !important;top:auto !important;transform:none !important;zoom:1 !important;color-scheme:light;}`,
  ].join('\n');

  root.appendChild(styleEl);
  const body = document.createElement('div');
  body.innerHTML = doc.body.innerHTML;
  root.appendChild(body);
  holder.appendChild(root);
  document.body.appendChild(holder);
  return { root, holder };
}

/** True when a PNG is (almost) entirely white — i.e. the rasteriser silently failed. */
export async function isBlankImage(blob: Blob): Promise<boolean> {
  try {
    const bmp = await createImageBitmap(blob);
    const w = Math.min(bmp.width, 160); const h = Math.min(bmp.height, 400);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); if (!ctx) return false;
    ctx.drawImage(bmp, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    let dark = 0;
    for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 0 && (px[i] + px[i + 1] + px[i + 2]) < 600) dark++;
    return dark < (px.length / 4) * 0.002;
  } catch { return false; }
}

async function waitForImages(node: HTMLElement) {
  const imgs = Array.from(node.querySelectorAll('img'));
  await Promise.all(imgs.map(async (img) => {
    if (!img.complete) await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); });
    try { await img.decode?.(); } catch { /* broken image — skipped by overlay */ }
  }));
  // Fonts + two paint frames so layout is final before the clone is measured.
  try { await (document as any).fonts?.ready; } catch { /* ignore */ }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 30));
}

/**
 * Plain-canvas fallback: if the browser refuses to rasterise the HTML (old webviews,
 * blocked foreignObject), we still produce a clean monospace bill image.
 */
async function canvasFallback(sale: Sale, s: Settings): Promise<Blob | null> {
  const lines = saleText(sale, s as any).split('\n');
  const pad = 24; const lh = 26; const width = 620;
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = (lines.length * lh + pad * 2) * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, canvas.height);
  ctx.fillStyle = '#111111';
  ctx.font = '15px ui-monospace, Menlo, Consolas, monospace';
  lines.forEach((ln, i) => ctx.fillText(ln, pad, pad + (i + 1) * lh - 8));
  return await new Promise((res) => canvas.toBlob((b) => res(b), 'image/png'));
}

/** Is it safe to draw this image onto a canvas without tainting it? */
function drawable(img: HTMLImageElement): boolean {
  if (!img.complete || !img.naturalWidth) return false;
  const src = img.currentSrc || img.src;
  if (!src) return false;
  if (/^(data|blob):/i.test(src)) return true;
  try { return new URL(src, location.href).origin === location.origin; } catch { return false; }
}

/**
 * Browsers (WebKit especially, Chrome sometimes) drop <img> elements when an HTML
 * subtree is painted through an SVG <foreignObject> — text survives, pictures vanish.
 * So after html-to-image has painted the text, we draw every <img> ourselves, straight
 * from the already-decoded element, at its exact on-page rectangle. Logo, cloned
 * header/footer photo, UPI QR and the SVG barcode all come out reliably this way.
 */
function overlayImages(root: HTMLElement, canvas: HTMLCanvasElement, ratio: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const base = root.getBoundingClientRect();
  for (const img of Array.from(root.querySelectorAll('img'))) {
    if (!drawable(img)) continue;
    const r = img.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const x = (r.left - base.left) * ratio, y = (r.top - base.top) * ratio;
    const w = r.width * ratio, h = r.height * ratio;
    try {
      // Paint paper-white under the picture first so a half-drawn foreignObject copy can't bleed through.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, w, h);
      ctx.drawImage(img, x, y, w, h);
    } catch { /* cross-origin or decode issue — leave whatever foreignObject produced */ }
  }
}

/** Full capture: HTML → canvas via html-to-image, then <img> overlay. */
async function captureCanvas(root: HTMLElement): Promise<HTMLCanvasElement> {
  const ratio = 2;
  const opts = { pixelRatio: ratio, backgroundColor: '#ffffff', cacheBust: false, style: SHOT_STYLE, width: root.offsetWidth, height: root.offsetHeight, skipAutoScale: true };
  let canvas: HTMLCanvasElement;
  try { canvas = await toCanvas(root, opts); }
  catch { canvas = await toCanvas(root, opts); } // WebKit: first foreignObject paint sometimes rejects; second try succeeds
  overlayImages(root, canvas, canvas.width / Math.max(1, root.offsetWidth));
  return canvas;
}

const canvasBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>((res) => c.toBlob((b) => res(b), 'image/png'));

/** Rasterise a sale into a PNG blob using the chosen bill template. */
export async function saleImageBlob(sale: Sale, s: Settings, templateId?: string): Promise<Blob | null> {
  let html = '';
  try { html = await renderReceipt(sale, s as any, templateId); }
  catch { return canvasFallback(sale, s); }
  const { root, holder } = mount(html);
  try {
    await waitForImages(root);
    const blob = await canvasBlob(await captureCanvas(root));
    if (blob && blob.size > 1200 && !(await isBlankImage(blob))) return blob;
    return await canvasFallback(sale, s);
  } catch {
    return await canvasFallback(sale, s);
  } finally {
    holder.remove();
  }
}

/** Same as above but returns a data URL (handy for previews). */
export async function saleImageDataUrl(sale: Sale, s: Settings, templateId?: string): Promise<string> {
  const html = await renderReceipt(sale, s as any, templateId);
  const { root, holder } = mount(html);
  try {
    await waitForImages(root);
    return (await captureCanvas(root)).toDataURL('image/png');
  } finally {
    holder.remove();
  }
}

export function blobToFile(blob: Blob, name: string) {
  return new File([blob], name, { type: 'image/png' });
}

/** Download the bill as a PNG image. */
export async function downloadSaleImage(sale: Sale, s: Settings, templateId?: string) {
  const blob = await saleImageBlob(sale, s, templateId);
  if (!blob) throw new Error('Could not render the bill image');
  download(`${sale.invoiceNo}.png`, blob, 'image/png');
  return true;
}

export type ShareResult = 'shared' | 'downloaded' | 'failed';

/**
 * Share the bill as an image.
 * On phones the Web Share sheet includes WhatsApp, so the picture goes straight into the chat.
 * On desktop (no file sharing) we download the PNG and open the WhatsApp chat so the user
 * can drop the image in — one drag instead of a screenshot.
 */
export async function shareSaleImage(sale: Sale, s: Settings, templateId?: string, phone = ''): Promise<ShareResult> {
  const blob = await saleImageBlob(sale, s, templateId);
  if (!blob) return 'failed';
  const file = blobToFile(blob, `${sale.invoiceNo}.png`);
  const nav: any = navigator;

  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: sale.invoiceNo, text: `${(s as any).shopName || ''} · ${sale.invoiceNo}` });
      return 'shared';
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'shared';
    }
  }

  download(`${sale.invoiceNo}.png`, blob, 'image/png');
  window.open(waLink(phone, `${(s as any).shopName || 'Bill'} · ${sale.invoiceNo}`), '_blank');
  return 'downloaded';
}

/** Send the bill as plain text on WhatsApp. */
export function shareSaleText(sale: Sale, s: Settings, phone = '') {
  window.open(waLink(phone, saleText(sale, s as any)), '_blank');
}
