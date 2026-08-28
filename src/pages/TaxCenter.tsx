import { useMemo, useState } from 'react';
import { FileSpreadsheet, Download, Printer, Percent, Building2, ReceiptText } from 'lucide-react';
import { useSales } from '@/hooks/useData';
import { useCatalog } from '@/hooks/useCatalog';
import { money, num, dOnly, dt } from '@/lib/format';
import { downloadCSV, download } from '@/lib/csv';
import { Card, Stat, Field, Input, Select, Empty, Tabs, SectionTitle, Badge } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { printHTML } from '@/lib/receipt';
import type { Sale } from '@/db/types';

/** Tax centre — GSTR-1 style B2B/B2C summaries, HSN report and rate-wise breakup. */
export default function TaxCenter() {
  const sales = useSales() || [];
  const { products } = useCatalog();
  const s = useSettings();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [tab, setTab] = useState<'summary' | 'b2b' | 'b2c' | 'hsn'>('summary');

  const from = new Date(month + '-01T00:00:00').getTime();
  const to = new Date(new Date(from).getFullYear(), new Date(from).getMonth() + 1, 0, 23, 59, 59).getTime();

  const list = useMemo(() => sales.filter((x: Sale) => x.ts >= from && x.ts <= to && x.status !== 'void'), [sales, from, to]);
  const hsnOf = useMemo(() => new Map(products.map((p: any) => [p.id, { hsn: p.hsn || '', unit: p.unit }])), [products]);

  const rateWise = useMemo(() => {
    const m = new Map<number, { taxable: number; tax: number; qty: number }>();
    list.forEach((x: Sale) => x.lines.forEach((l) => {
      const gross = l.price * l.qty - l.discount;
      const taxable = s.taxInclusive ? gross / (1 + l.gst / 100) : gross;
      const tax = s.taxInclusive ? gross - taxable : gross * (l.gst / 100);
      const c = m.get(l.gst) || { taxable: 0, tax: 0, qty: 0 };
      c.taxable += taxable; c.tax += tax; c.qty += l.qty;
      m.set(l.gst, c);
    }));
    return [...m].sort((a, b) => a[0] - b[0]);
  }, [list, s.taxInclusive]);

  const b2b = useMemo(() => list.filter((x: Sale) => x.customerId && (x as any).gstin), [list]);
  const b2c = useMemo(() => list.filter((x: Sale) => !b2b.includes(x)), [list, b2b]);

  const hsnRows = useMemo(() => {
    const m = new Map<string, { hsn: string; desc: string; qty: number; taxable: number; tax: number; rate: number }>();
    list.forEach((x: Sale) => x.lines.forEach((l) => {
      const meta: any = hsnOf.get(l.productId) || {};
      const key = (meta.hsn || 'NA') + ':' + l.gst;
      const gross = l.price * l.qty - l.discount;
      const taxable = s.taxInclusive ? gross / (1 + l.gst / 100) : gross;
      const c = m.get(key) || { hsn: meta.hsn || 'NA', desc: l.name, qty: 0, taxable: 0, tax: 0, rate: l.gst };
      c.qty += l.qty; c.taxable += taxable; c.tax += (s.taxInclusive ? gross - taxable : gross * (l.gst / 100));
      m.set(key, c);
    }));
    return [...m.values()].sort((a, b) => b.taxable - a.taxable);
  }, [list, hsnOf, s.taxInclusive]);

  const totalTaxable = rateWise.reduce((t, [, v]) => t + v.taxable, 0);
  const totalTax = rateWise.reduce((t, [, v]) => t + v.tax, 0);
  const cgst = totalTax / 2;
  const missingHsn = hsnRows.filter((r) => r.hsn === 'NA').length;

  const exportGstrJson = () => {
    const payload = {
      gstin: s.gstin || 'URP',
      fp: month.slice(5) + month.slice(0, 4),
      gt: +totalTaxable.toFixed(2),
      b2b: b2b.map((x: Sale) => ({
        ctin: (x as any).gstin || '', inv: [{ inum: x.invoiceNo, idt: dOnly(x.ts), val: +x.total.toFixed(2), pos: (s.gstin || '07').slice(0, 2), rchrg: 'N',
          itms: x.lines.map((l, i) => ({ num: i + 1, itm_det: { rt: l.gst, txval: +(l.price * l.qty - l.discount).toFixed(2), camt: +((l.price * l.qty - l.discount) * l.gst / 200).toFixed(2), samt: +((l.price * l.qty - l.discount) * l.gst / 200).toFixed(2) } })) }],
      })),
      b2cs: rateWise.map(([rate, v]) => ({ sply_ty: 'INTRA', typ: 'OE', pos: (s.gstin || '07').slice(0, 2), rt: rate, txval: +v.taxable.toFixed(2), camt: +(v.tax / 2).toFixed(2), samt: +(v.tax / 2).toFixed(2) })),
      hsn: { data: hsnRows.map((r, i) => ({ num: i + 1, hsn_sc: r.hsn, desc: r.desc.slice(0, 30), qty: +r.qty.toFixed(2), txval: +r.taxable.toFixed(2), rt: r.rate, camt: +(r.tax / 2).toFixed(2), samt: +(r.tax / 2).toFixed(2) })) },
    };
    download(`gstr1-${month}.json`, JSON.stringify(payload, null, 2), 'application/json');
  };

  const printReturn = () => printHTML(`<html><head><meta charset="utf-8"><title>GST summary ${month}</title><style>
    body{font-family:system-ui,Arial;padding:22px;color:#111;max-width:760px;margin:auto}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}td,th{border:1px solid #ccc;padding:6px}.r{text-align:right}
    .muted{color:#666;font-size:11px}</style></head><body>
    <h2 style="margin:0">${s.shopName || 'Shop'} — GST summary</h2>
    <p class=muted>GSTIN: ${s.gstin || '—'} · Period: ${month} · Generated ${dt(Date.now())}</p>
    <h3 style="font-size:14px">Rate-wise outward supplies</h3>
    <table><thead><tr><th>Rate</th><th class=r>Taxable</th><th class=r>CGST</th><th class=r>SGST</th><th class=r>Total tax</th></tr></thead><tbody>
    ${rateWise.map(([rate, v]) => `<tr><td>${rate}%</td><td class=r>${v.taxable.toFixed(2)}</td><td class=r>${(v.tax / 2).toFixed(2)}</td><td class=r>${(v.tax / 2).toFixed(2)}</td><td class=r>${v.tax.toFixed(2)}</td></tr>`).join('')}
    <tr><td><b>Total</b></td><td class=r><b>${totalTaxable.toFixed(2)}</b></td><td class=r><b>${cgst.toFixed(2)}</b></td><td class=r><b>${cgst.toFixed(2)}</b></td><td class=r><b>${totalTax.toFixed(2)}</b></td></tr>
    </tbody></table>
    <h3 style="font-size:14px">HSN summary</h3>
    <table><thead><tr><th>HSN</th><th>Description</th><th class=r>Qty</th><th class=r>Taxable</th><th class=r>Rate</th><th class=r>Tax</th></tr></thead><tbody>
    ${hsnRows.slice(0, 100).map((r) => `<tr><td>${r.hsn}</td><td>${r.desc}</td><td class=r>${r.qty.toFixed(2)}</td><td class=r>${r.taxable.toFixed(2)}</td><td class=r>${r.rate}%</td><td class=r>${r.tax.toFixed(2)}</td></tr>`).join('')}
    </tbody></table>
    <p class=muted>Computed from ${list.length} invoices. Please verify with your accountant before filing.</p></body></html>`);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Taxable value" value={money(totalTaxable, s.currency)} tone="brand" icon={<FileSpreadsheet size={16} />} sub={`${num(list.length)} invoices`} />
        <Stat label="Total tax" value={money(totalTax, s.currency)} tone="warn" icon={<Percent size={16} />} />
        <Stat label="CGST / SGST" value={money(cgst, s.currency)} tone="ok" sub="each" />
        <Stat label="B2B invoices" value={num(b2b.length)} tone="brand" icon={<Building2 size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Tax centre" sub="GSTR-1 style summary, HSN report aur JSON export — accountant ko bas bhej dijiye"
          right={<div className="flex flex-wrap gap-2">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9" />
            <button className="btn-soft" onClick={printReturn}><Printer size={15} /> Print</button>
            <button className="btn-primary" onClick={exportGstrJson}><Download size={15} /> GSTR-1 JSON</button>
          </div>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'summary', label: 'Rate-wise' }, { id: 'b2b', label: 'B2B', count: b2b.length },
          { id: 'b2c', label: 'B2C', count: b2c.length }, { id: 'hsn', label: 'HSN', count: hsnRows.length },
        ]} />
        {missingHsn > 0 && <p className="mt-2 rounded-xl border border-warn/30 bg-warn/10 p-2.5 text-[11px] text-warn">
          {missingHsn} line groups have no HSN code. Inventory me HSN bhar dijiye — filing ke liye zaroori hai.
        </p>}
      </Card>

      {list.length === 0 ? <Empty title="No invoices in this period" sub="Doosra mahina choose kijiye." icon={<ReceiptText size={22} />} /> : (
        <>
          {tab === 'summary' && (
            <Card pad={false}>
              <div className="flex items-center justify-between p-3">
                <SectionTitle title="Rate-wise outward supplies" />
                <button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV(`gst-ratewise-${month}.csv`, rateWise.map(([rate, v]) => ({
                  rate: rate + '%', qty: +v.qty.toFixed(2), taxable: +v.taxable.toFixed(2), cgst: +(v.tax / 2).toFixed(2), sgst: +(v.tax / 2).toFixed(2), total_tax: +v.tax.toFixed(2),
                })))}><Download size={13} /> CSV</button>
              </div>
              {rateWise.map(([rate, v]) => (
                <div key={rate} className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
                  <Badge tone="brand">{rate}%</Badge>
                  <span className="min-w-0 flex-1 text-ink3">{v.qty.toFixed(2)} units</span>
                  <span className="w-28 text-right font-mono text-ink">{money(v.taxable, s.currency)}</span>
                  <span className="w-24 text-right font-mono text-ink3">{money(v.tax / 2, s.currency)}</span>
                  <span className="w-24 text-right font-mono text-ink3">{money(v.tax / 2, s.currency)}</span>
                  <span className="w-24 text-right font-mono font-bold text-warn">{money(v.tax, s.currency)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-line p-3 text-sm font-bold text-ink">
                <span>Total tax payable</span><span className="font-mono">{money(totalTax, s.currency)}</span>
              </div>
            </Card>
          )}

          {(tab === 'b2b' || tab === 'b2c') && (
            <Card pad={false}>
              <div className="flex items-center justify-between p-3">
                <SectionTitle title={tab === 'b2b' ? 'B2B invoices (registered buyers)' : 'B2C invoices'} />
                <button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV(`gst-${tab}-${month}.csv`, (tab === 'b2b' ? b2b : b2c).map((x: Sale) => ({
                  invoice: x.invoiceNo, date: dOnly(x.ts), customer: x.customerName || 'Walk-in', taxable: +(x.taxable).toFixed(2), tax: +x.gstAmount.toFixed(2), total: +x.total.toFixed(2), mode: x.payMode,
                })))}><Download size={13} /> CSV</button>
              </div>
              {(tab === 'b2b' ? b2b : b2c).slice(0, 300).map((x: Sale) => (
                <div key={x.id} className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
                  <span className="w-28 shrink-0 font-semibold text-ink">{x.invoiceNo}</span>
                  <span className="w-24 shrink-0 text-ink3">{dOnly(x.ts)}</span>
                  <span className="min-w-0 flex-1 truncate text-ink2">{x.customerName || 'Walk-in'}</span>
                  <span className="w-24 text-right font-mono text-ink3">{money(x.taxable, s.currency)}</span>
                  <span className="w-20 text-right font-mono text-warn">{money(x.gstAmount, s.currency)}</span>
                  <span className="w-24 text-right font-mono font-bold text-ink">{money(x.total, s.currency)}</span>
                </div>
              ))}
            </Card>
          )}

          {tab === 'hsn' && (
            <Card pad={false}>
              <div className="flex items-center justify-between p-3">
                <SectionTitle title="HSN-wise summary" sub="Table 12 of GSTR-1" />
                <button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV(`gst-hsn-${month}.csv`, hsnRows.map((r) => ({
                  hsn: r.hsn, description: r.desc, qty: +r.qty.toFixed(2), rate: r.rate, taxable: +r.taxable.toFixed(2), tax: +r.tax.toFixed(2),
                })))}><Download size={13} /> CSV</button>
              </div>
              {hsnRows.slice(0, 300).map((r, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
                  <span className={`w-20 shrink-0 font-mono ${r.hsn === 'NA' ? 'text-bad' : 'text-ink3'}`}>{r.hsn}</span>
                  <span className="min-w-0 flex-1 truncate text-ink2">{r.desc}</span>
                  <span className="w-16 text-right font-mono text-ink3">{r.qty.toFixed(1)}</span>
                  <span className="w-12 text-right text-ink3">{r.rate}%</span>
                  <span className="w-24 text-right font-mono text-ink">{money(r.taxable, s.currency)}</span>
                  <span className="w-20 text-right font-mono text-warn">{money(r.tax, s.currency)}</span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      <Card>
        <SectionTitle title="Filing checklist" />
        <ul className="space-y-1 text-[11px] text-ink3">
          <li>• GSTIN in Settings → Store: <b className="text-ink">{s.gstin || 'not set'}</b></li>
          <li>• Prices are treated as <b className="text-ink">{s.taxInclusive ? 'tax-inclusive' : 'tax-exclusive'}</b> (Settings → Billing)</li>
          <li>• Intra-state supplies split CGST/SGST equally; change state code in Settings for IGST cases</li>
          <li>• Always cross-check the generated JSON with your accountant before uploading to the GST portal</li>
        </ul>
      </Card>
    </div>
  );
}
