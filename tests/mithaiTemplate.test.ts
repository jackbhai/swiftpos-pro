import { describe, it, expect } from 'vitest';
import { TEMPLATES, renderTemplate, buildContext, sampleSale, gstSummary, tokenNo, fmtQty3 } from '../src/lib/templates';
import { defaultSettings } from '../src/store/settings';
import { computeTotals } from '../src/lib/calc';

const mithai = TEMPLATES.find((t) => t.id === 'thermal-mithai')!;
const settings: any = { ...defaultSettings, shopName: 'Kali Ghata Sweets', fssai: '12345678901234', cinNo: 'U15490RJ2015PTC047123' };

describe('Mithai / Halwai 80mm template', () => {
  it('is registered as an 80mm thermal template', () => {
    expect(mithai).toBeTruthy();
    expect(mithai.paper).toBe('80mm');
    expect(mithai.group).toBe('Thermal');
    expect(TEMPLATES.filter((t) => t.id === 'thermal-mithai')).toHaveLength(1);
  });

  it('prints token no, CIN, FSSAI, HSN and 3-decimal quantities', () => {
    const sale = sampleSale('sweets');
    const html = renderTemplate(mithai.html, { ...buildContext(sale, settings), margin: 3 });
    expect(html).toContain('TOKEN NO.');
    expect(html).toContain('>42<');
    expect(html).toContain('CIN: U15490RJ2015PTC047123');
    expect(html).toContain('FSSAI: 12345678901234');
    expect(html).toContain('HSN : 2106');
    expect(html).toContain('HSN : 4819');
    for (const q of ['0.500', '1.250', '0.250', '1.000']) expect(html).toContain(`<td class="r">${q}</td>`);
    expect(html).toContain('Net Qty : 3.000');
    expect(html).toContain('GST SUMMARY');
    expect(html).toContain('Tender Amount');
    expect(html).toContain('Balance Amount');
    expect(html).toContain('Payable Amt');
    expect(html).not.toMatch(/\{\{[#/^]?\w+\}\}/); // every token resolved
  });

  it('shows rate-wise GST summary rows', () => {
    const sale = sampleSale('sweets');
    const ctx = buildContext(sale, settings);
    const rates = ctx.gst_summary.map((r) => r.rate);
    expect(rates).toEqual(['5%', '12%', '18%']);
    const html = renderTemplate(mithai.html, { ...ctx, margin: 3 });
    expect(html).toContain('<td>OUT @5%</td>');
    expect(html).toContain('<td>OUT @12%</td>');
    expect(html).toContain('<td>OUT @18%</td>');
  });

  it('hides CIN / token rows when the shop has none', () => {
    const sale = { ...sampleSale('sweets'), invoiceNo: 'KG', meta: {} } as any;
    const html = renderTemplate(mithai.html, { ...buildContext(sale, { ...settings, cinNo: '' }), margin: 3 });
    expect(html).not.toContain('CIN:');
    expect(html).not.toContain('TOKEN NO.');
  });
});

describe('gstSummary', () => {
  it('splits inclusive tax by rate and reconciles with computeTotals', () => {
    const sale = sampleSale('sweets');
    const { rows } = gstSummary(sale, true);
    const totalTax = rows.reduce((t, r) => t + r.cgst + r.sgst, 0);
    const expected = computeTotals(sale.lines, { billDiscount: sale.billDiscount, taxInclusive: true }).gstAmount;
    expect(Math.abs(totalTax - expected)).toBeLessThan(0.05);
    for (const r of rows) expect(r.cgst).toBeCloseTo(r.sgst, 2);
  });

  it('spreads a bill-level discount proportionally', () => {
    const sale = sampleSale('grocery');
    const noDisc = gstSummary({ ...sale, billDiscount: 0 }, true).rows[0];
    const withDisc = gstSummary(sale, true).rows[0];
    expect(withDisc.taxable).toBeLessThan(noDisc.taxable);
  });
});

describe('tokenNo / fmtQty3', () => {
  it('prefers captured token, falls back to the numeric tail of the bill no', () => {
    const base = sampleSale('grocery');
    expect(tokenNo({ ...base, meta: { token: 7 } })).toBe('7');
    expect(tokenNo({ ...base, invoiceNo: 'INV-00042', meta: undefined })).toBe('42');
    expect(tokenNo({ ...base, invoiceNo: 'ABC', meta: undefined })).toBe('');
  });
  it('formats weights with three decimals', () => {
    expect(fmtQty3(0.25)).toBe('0.250');
    expect(fmtQty3(2)).toBe('2.000');
    expect(fmtQty3(NaN)).toBe('0.000');
  });
});
