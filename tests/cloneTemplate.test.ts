import { describe, it, expect } from 'vitest';
import { buildClonedTemplate, dataUrlKB } from '../src/lib/cloneTemplate';
import { renderTemplate } from '../src/lib/templates';

const base = {
  paper: '80mm' as const,
  headerImg: 'data:image/jpeg;base64,HEADERPIXELS',
  footerImg: 'data:image/jpeg;base64,FOOTERPIXELS',
  showMeta: true,
  itemsStyle: 'compact' as const,
  showTaxRows: true,
  showQr: true,
  showBarcode: false,
  showWords: false,
  font: 'mono' as const,
};

describe('buildClonedTemplate', () => {
  it('embeds header/footer photos same-to-same', () => {
    const html = buildClonedTemplate(base);
    expect(html).toContain('HEADERPIXELS');
    expect(html).toContain('FOOTERPIXELS');
  });

  it('keeps dynamic tokens for bill no, items and total', () => {
    const html = buildClonedTemplate(base);
    for (const t of ['{{invoice_no}}', '{{#items}}', '{{total}}', '{{datetime}}', '{{customer_name}}']) {
      expect(html).toContain(t);
    }
  });

  it('renders with sample data without leftover tokens', () => {
    const html = buildClonedTemplate(base);
    const out = renderTemplate(html, {
      invoice_no: 'INV-1', datetime: 'd', customer_name: 'c', staff: 's',
      items: [{ name: 'Chai', qty: 2, rate: '₹20', amount: '₹40' }],
      subtotal: '₹40', cgst: '₹1', sgst: '₹1', round_off: '₹0', total: '₹42',
      pay_mode: 'UPI', margin: 3, has_savings: false,
    });
    expect(out).toContain('Chai');
    expect(out).toContain('INV-1');
    expect(out).not.toContain('{{invoice_no}}');
    expect(out).not.toContain('{{total}}');
  });

  it('omits photos cleanly when header/footer are empty', () => {
    const html = buildClonedTemplate({ ...base, headerImg: '', footerImg: '' });
    expect(html).not.toContain('class="clone"');
    expect(html).toContain('{{total}}');
  });

  it('honours toggles: detailed items, single GST row, words, barcode', () => {
    const html = buildClonedTemplate({
      ...base, itemsStyle: 'detailed', showTaxRows: false,
      showQr: false, showWords: true, showBarcode: true, showMeta: false,
    });
    expect(html).toContain('{{gst}}');          // per-item GST in detailed mode
    expect(html).toContain('{{gst_total}}');    // single GST row
    expect(html).not.toContain('{{cgst}}');
    expect(html).toContain('{{total_words}}');
    expect(html).toContain('{{barcode}}');
    expect(html).not.toContain('{{upi_qr}}');
  });

  it('supports all paper sizes', () => {
    expect(buildClonedTemplate({ ...base, paper: '58mm' })).toContain('58mm');
    expect(buildClonedTemplate({ ...base, paper: '80mm' })).toContain('80mm');
    expect(buildClonedTemplate({ ...base, paper: 'A4' })).toContain('A4');
  });
});

describe('dataUrlKB', () => {
  it('estimates kilobytes from base64 length', () => {
    expect(dataUrlKB('')).toBe(0);
    const u = 'data:image/jpeg;base64,' + 'A'.repeat(4000);
    expect(dataUrlKB(u)).toBe(3); // 4000*3/4/1024 ≈ 2.93 → 3
  });
});
