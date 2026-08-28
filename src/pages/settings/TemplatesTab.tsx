import { useEffect, useMemo, useState } from 'react';
import {
  Printer, Upload, Plus, Trash2, Copy, Download, Check, Eye, Code2, Star, Pencil, FileCode2,
} from 'lucide-react';
import { Card, SectionTitle, Field, Input, Select, Textarea, Modal, Badge, Empty, Tabs, Toggle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { db, uid } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { TEMPLATES, TEMPLATE_TOKENS, renderTemplate, buildContext, sampleSale, type TemplateDef } from '@/lib/templates';
import { printHTML } from '@/lib/receipt';
import { qrDataUrl, upiLink } from '@/lib/upi';
import { download } from '@/lib/csv';
import { toast } from '@/store/ui';
import { cx, dt } from '@/lib/format';

export default function TemplatesTab() {
  const s = useSettings();
  const custom = useLiveQuery(() => db.templates.toArray(), [], [] as any[]) || [];
  const [group, setGroup] = useState('All');
  const [preview, setPreview] = useState<TemplateDef | null>(null);
  const [editor, setEditor] = useState<{ id?: string; name: string; paper: string; desc: string; html: string } | null>(null);
  const [qr, setQr] = useState('');

  const all: TemplateDef[] = useMemo(() => [
    ...TEMPLATES,
    ...custom.map((c: any) => ({ id: c.id, name: c.name, paper: c.paper, group: 'Custom' as any, desc: c.desc ?? 'Uploaded template', html: c.html, custom: true })),
  ], [custom]);

  const groups = ['All', 'Thermal', 'A4 / Invoice', 'Specialised', 'Custom'];
  const list = all.filter((t) => group === 'All' || t.group === group);

  useEffect(() => {
    const u = s.upiAccounts.find((x) => x.isDefault && x.active) ?? s.upiAccounts.find((x) => x.active);
    if (u) qrDataUrl(upiLink(u, 549), 240).then(setQr).catch(() => setQr(''));
  }, [s.upiAccounts]);

  const sample = useMemo(() => sampleSale(), []);
  const html = (t: TemplateDef) => renderTemplate(t.html, {
    ...buildContext(sample, s as any, { upiQr: qr, upiId: s.upiAccounts.find((u) => u.isDefault)?.vpa ?? 'shop@upi', copyLabel: s.duplicateLabel, logo: s.logoDataUrl }),
    margin: s.printMargin,
  });

  const saveCustom = async () => {
    if (!editor) return;
    if (!editor.name.trim() || !editor.html.trim()) return toast('Name and HTML are required', 'err');
    const now = Date.now();
    if (editor.id) { await db.templates.update(editor.id, { name: editor.name, paper: editor.paper as any, desc: editor.desc, html: editor.html, updatedAt: now }); toast('Template updated'); }
    else { await db.templates.add({ id: uid('tpl_'), name: editor.name, paper: editor.paper as any, desc: editor.desc, html: editor.html, createdAt: now, updatedAt: now }); toast('Template saved'); }
    setEditor(null);
  };

  const onUpload = async (file: File) => {
    const text = await file.text();
    setEditor({ name: file.name.replace(/\.(html?|txt)$/i, ''), paper: /a4/i.test(text) ? 'A4' : '80mm', desc: 'Uploaded ' + dt(Date.now()), html: text });
    toast('Template loaded into the editor — review and save');
  };

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle title="Bill templates" sub={`${TEMPLATES.length} built-in designs + your own uploads. Preview, set defaults, or edit the HTML.`} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Default receipt template">
            <Select value={s.defaultTemplate} onChange={(e) => s.set({ defaultTemplate: e.target.value })}>
              {all.filter((t) => t.paper !== 'A4').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Default A4 invoice">
            <Select value={s.a4Template} onChange={(e) => s.set({ a4Template: e.target.value })}>
              {all.filter((t) => t.paper === 'A4').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Kitchen / KOT template">
            <Select value={s.kotTemplate} onChange={(e) => s.set({ kotTemplate: e.target.value })}>
              {all.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Tabs active={group} onChange={setGroup} tabs={groups.map((g) => ({ id: g, label: g, count: g === 'All' ? all.length : all.filter((t) => t.group === g).length }))} />
          <label className="btn-soft ml-auto cursor-pointer">
            <Upload size={15} /> Upload .html
            <input type="file" accept=".html,.htm,.txt" hidden onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
          </label>
          <button className="btn-primary" onClick={() => setEditor({ name: 'My template', paper: '80mm', desc: '', html: STARTER })}><Plus size={16} /> New template</button>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((t) => {
          const isDefault = s.defaultTemplate === t.id || s.a4Template === t.id || s.kotTemplate === t.id;
          return (
            <Card key={t.id} className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-bold text-ink">{t.name}{isDefault && <Badge tone="brand">in use</Badge>}</p>
                  <p className="text-[11px] text-ink3">{t.paper} · {t.group}</p>
                </div>
                <Badge tone="muted">{t.custom ? 'custom' : 'built-in'}</Badge>
              </div>
              <p className="line-clamp-2 text-[11px] text-ink3">{t.desc}</p>
              <div className="h-40 overflow-hidden rounded-lg border border-line bg-white">
                <iframe title={t.id} srcDoc={html(t)} className="pointer-events-none h-[500px] w-full origin-top-left"
                  style={{ transform: 'scale(0.55)', width: '182%', height: '290px' }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button className="chip" onClick={() => setPreview(t)}><Eye size={11} className="mr-1 inline" />Preview</button>
                <button className="chip" onClick={() => printHTML(html(t), 1)}><Printer size={11} className="mr-1 inline" />Test print</button>
                <button className="chip" onClick={() => s.set(t.paper === 'A4' ? { a4Template: t.id } : { defaultTemplate: t.id })}><Star size={11} className="mr-1 inline" />Set default</button>
                <button className="chip" onClick={() => setEditor({ name: t.name + ' copy', paper: t.paper, desc: t.desc, html: t.html })}><Copy size={11} className="mr-1 inline" />Duplicate</button>
                <button className="chip" onClick={() => download(`${t.id}.html`, t.html, 'text/html')}><Download size={11} /></button>
                {t.custom && <>
                  <button className="chip" onClick={() => setEditor({ id: t.id, name: t.name, paper: t.paper, desc: t.desc, html: t.html })}><Pencil size={11} /></button>
                  <button className="chip border-bad/40 text-bad" onClick={async () => { await db.templates.delete(t.id); toast('Deleted'); }}><Trash2 size={11} /></button>
                </>}
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <SectionTitle title="Template tokens" sub="Use these placeholders inside your own HTML — everything else is plain HTML/CSS." right={<FileCode2 size={16} className="text-ink3" />} />
        <div className="grid gap-1.5 sm:grid-cols-2">
          {TEMPLATE_TOKENS.map((t) => (
            <button key={t.token} className="flex items-start gap-2 rounded-lg border border-line px-2.5 py-1.5 text-left hover:border-brand/50"
              onClick={() => { navigator.clipboard.writeText(t.token); toast('Token copied'); }}>
              <code className="shrink-0 font-mono text-[10.5px] text-brand">{t.token}</code>
              <span className="text-[10.5px] text-ink3">{t.desc}</span>
            </button>
          ))}
        </div>
      </Card>

      <Modal open={!!preview} onClose={() => setPreview(null)} wide title={preview?.name}
        footer={preview && <div className="flex gap-2">
          <button className="btn-soft flex-1" onClick={() => printHTML(html(preview), 1)}><Printer size={15} /> Test print</button>
          <button className="btn-primary flex-1" onClick={() => { s.set(preview.paper === 'A4' ? { a4Template: preview.id } : { defaultTemplate: preview.id }); toast('Set as default'); setPreview(null); }}><Check size={15} /> Use this template</button>
        </div>}>
        {preview && <div className="overflow-hidden rounded-xl bg-white"><iframe title="full" srcDoc={html(preview)} className="h-[60vh] w-full" /></div>}
      </Modal>

      <Modal open={!!editor} onClose={() => setEditor(null)} wide title={editor?.id ? 'Edit template' : 'New template'}
        footer={<div className="flex gap-2">
          <button className="btn-soft flex-1" onClick={() => editor && printHTML(renderTemplate(editor.html, { ...buildContext(sample, s as any, { upiQr: qr, upiId: 'shop@upi' }), margin: s.printMargin }), 1)}><Printer size={15} /> Test print</button>
          <button className="btn-primary flex-1" onClick={saveCustom}><Check size={15} /> Save template</button>
        </div>}>
        {editor && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Name"><Input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} /></Field>
              <Field label="Paper"><Select value={editor.paper} onChange={(e) => setEditor({ ...editor, paper: e.target.value })}>{['58mm', '80mm', 'A4'].map((p) => <option key={p}>{p}</option>)}</Select></Field>
              <Field label="Description"><Input value={editor.desc} onChange={(e) => setEditor({ ...editor, desc: e.target.value })} /></Field>
            </div>
            <Field label="HTML (tokens allowed)">
              <Textarea className="min-h-[220px] font-mono text-[11px]" value={editor.html} onChange={(e) => setEditor({ ...editor, html: e.target.value })} />
            </Field>
            <div>
              <p className="label">Live preview</p>
              <div className="h-64 overflow-hidden rounded-xl border border-line bg-white">
                <iframe title="live" srcDoc={renderTemplate(editor.html, { ...buildContext(sample, s as any, { upiQr: qr, upiId: 'shop@upi' }), margin: s.printMargin })} className="h-full w-full" />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const STARTER = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:80mm auto;margin:3mm}
body{width:80mm;font-family:ui-monospace,monospace;font-size:12px;color:#000}
.c{text-align:center}.r{text-align:right}.b{font-weight:700}
.hr{border-top:1px dashed #000;margin:5px 0}
table{width:100%;border-collapse:collapse}
</style></head><body>
<div class="c b" style="font-size:16px">{{shop_name}}</div>
<div class="c">{{address}}</div>
<div class="hr"></div>
<div>{{invoice_no}} · {{datetime}}</div>
<div>Customer: {{customer_name}}</div>
<div class="hr"></div>
<table>
{{#items}}<tr><td>{{name}} x{{qty}}</td><td class="r">{{amount}}</td></tr>{{/items}}
</table>
<div class="hr"></div>
<table>
<tr><td>GST</td><td class="r">{{gst_total}}</td></tr>
<tr class="b" style="font-size:15px"><td>TOTAL</td><td class="r">{{total}}</td></tr>
</table>
{{#upi_qr}}<div class="c"><img src="{{upi_qr}}" style="width:110px"/><div>{{upi_id}}</div></div>{{/upi_qr}}
<div class="hr"></div>
<div class="c">{{footer}}</div>
</body></html>`;
