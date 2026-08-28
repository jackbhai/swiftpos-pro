import { toBlob, toPng } from 'html-to-image';
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

/** Build an offscreen DOM node from a full receipt HTML document. */
function mount(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const styles = Array.from(doc.querySelectorAll('style')).map((s) => s.textContent || '').join('\n');

  const root = document.createElement('div');
  root.className = 'bill-shot-root';
  const width = WIDTH[paperOf(html)] || 576;
  root.setAttribute('style', `position:fixed;left:-99999px;top:0;z-index:-1;background:#ffffff;color:#000000;width:${width}px;padding:14px;box-sizing:border-box;`);

  // Scope the receipt's own CSS so it cannot leak into the app while we rasterise.
  const scoped = styles
    .replace(/(^|[},])\s*body\b/g, '$1 .bill-shot-root')
    .replace(/(^|[},])\s*html\b/g, '$1 .bill-shot-root')
    .replace(/@page[^{]*\{[^}]*\}/g, '');
  const styleEl = document.createElement('style');
  styleEl.textContent = `.bill-shot-root{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.45;}\n${scoped}`;

  root.appendChild(styleEl);
  const body = document.createElement('div');
  body.innerHTML = doc.body.innerHTML;
  root.appendChild(body);
  document.body.appendChild(root);
  return root;
}

async function waitForImages(node: HTMLElement) {
  const imgs = Array.from(node.querySelectorAll('img'));
  await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise<void>((res) => {
    img.onload = () => res(); img.onerror = () => res();
  }))));
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

/** Rasterise a sale into a PNG blob using the chosen bill template. */
export async function saleImageBlob(sale: Sale, s: Settings, templateId?: string): Promise<Blob | null> {
  let html = '';
  try { html = await renderReceipt(sale, s as any, templateId); }
  catch { return canvasFallback(sale, s); }
  const node = mount(html);
  try {
    await waitForImages(node);
    const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
    if (blob && blob.size > 1200) return blob;
    return await canvasFallback(sale, s);
  } catch {
    return await canvasFallback(sale, s);
  } finally {
    node.remove();
  }
}

/** Same as above but returns a data URL (handy for previews). */
export async function saleImageDataUrl(sale: Sale, s: Settings, templateId?: string): Promise<string> {
  const html = await renderReceipt(sale, s as any, templateId);
  const node = mount(html);
  try {
    await waitForImages(node);
    return await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
  } finally {
    node.remove();
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
