import { useMemo, useState } from 'react';
import { CookingPot, Plus, Trash2, Factory, AlertTriangle, Calculator } from 'lucide-react';
import { useRecipes } from '@/hooks/useData';
import { useCatalog, useDebounced, searchProducts } from '@/hooks/useCatalog';
import { db, uid, logActivity, addStockLog } from '@/db/db';
import { money, num, cx } from '@/lib/format';
import { Card, Stat, Modal, Field, Input, Empty, SearchBar, Badge, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast, toastUndo } from '@/store/ui';
import type { Recipe } from '@/db/types';

/** Recipes / BOM & production runs — combos, thali, manufacturing, repacking. */
export default function Recipes() {
  const recipes = useRecipes() || [];
  const { products } = useCatalog();
  const s = useSettings();
  const [q, setQ] = useState('');
  const [editor, setEditor] = useState<Recipe | null>(null);
  const [produce, setProduce] = useState<Recipe | null>(null);

  const byId = useMemo(() => new Map(products.map((p: any) => [p.id, p])), [products]);

  const enriched = useMemo(() => recipes.map((r: Recipe) => {
    const cost = r.items.reduce((t, it) => t + ((byId.get(it.productId) as any)?.cost || 0) * it.qty, 0) + (r.labourCost || 0);
    const out = byId.get(r.productId) as any;
    const unitCost = cost / Math.max(1, r.yield);
    const margin = out?.price ? ((out.price - unitCost) / out.price) * 100 : 0;
    const canMake = Math.min(...r.items.map((it) => Math.floor(((byId.get(it.productId) as any)?.stock || 0) / (it.qty || 1))), 9999);
    return { ...r, cost, unitCost, margin, canMake: Number.isFinite(canMake) ? canMake : 0, out };
  }).filter((r) => !q.trim() || r.productName.toLowerCase().includes(q.toLowerCase())), [recipes, byId, q]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Recipes / BOMs" value={num(recipes.length)} tone="brand" icon={<CookingPot size={16} />} />
        <Stat label="Can produce now" value={num(enriched.filter((r) => r.canMake > 0).length)} tone="ok" icon={<Factory size={16} />} />
        <Stat label="Blocked (no stock)" value={num(enriched.filter((r) => r.canMake === 0).length)} tone="bad" icon={<AlertTriangle size={16} />} />
        <Stat label="Avg margin" value={(enriched.reduce((t, r) => t + r.margin, 0) / Math.max(1, enriched.length)).toFixed(1) + '%'} tone="warn" />
      </div>

      <Card>
        <SectionTitle title="Recipes, combos & production" sub="Ingredients define the cost; production run consumes stock and creates finished goods"
          right={<button className="btn-primary" onClick={() => setEditor({ id: '', productId: '', productName: '', yield: 1, items: [], labourCost: 0, updatedAt: Date.now() })}><Plus size={15} /> New recipe</button>} />
        <SearchBar value={q} onChange={setQ} placeholder="Search recipes…" />
      </Card>

      {enriched.length === 0 ? (
        <Empty title="No recipes yet" icon={<CookingPot size={22} />}
          sub="Thali, combo pack, mixture, repacking ya manufacturing — sab yahan define kijiye."
          action={<button className="btn-primary mt-2" onClick={() => setEditor({ id: '', productId: '', productName: '', yield: 1, items: [], labourCost: 0, updatedAt: Date.now() })}><Plus size={15} /> New recipe</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {enriched.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{r.productName}</p>
                  <p className="text-[11px] text-ink3">yields {r.yield} · {r.items.length} ingredients</p>
                </div>
                <Badge tone={r.canMake > 5 ? 'ok' : r.canMake > 0 ? 'warn' : 'bad'}>{r.canMake} makeable</Badge>
              </div>
              <div className="mt-2 space-y-0.5 rounded-xl border border-line p-2">
                {r.items.slice(0, 5).map((it, i) => {
                  const p: any = byId.get(it.productId);
                  const short = (p?.stock || 0) < it.qty;
                  return (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="truncate text-ink2">{it.name}</span>
                      <span className={cx('font-mono', short ? 'text-bad' : 'text-ink3')}>{it.qty} {it.unit}</span>
                    </div>
                  );
                })}
                {r.items.length > 5 && <p className="text-[10px] text-ink3">+{r.items.length - 5} more</p>}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-ink3">Cost/unit <b className="font-mono text-ink">{money(r.unitCost, s.currency)}</b></span>
                <span className={cx('font-mono font-bold', r.margin < 15 ? 'text-bad' : r.margin < 30 ? 'text-warn' : 'text-ok')}>{r.margin.toFixed(0)}% margin</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button className="btn-primary flex-1 px-2 py-1.5 text-xs" disabled={r.canMake < 1} onClick={() => setProduce(r)}><Factory size={13} /> Produce</button>
                <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => setEditor(r)}>Edit</button>
                <button className="btn-ghost px-2 py-1.5 text-xs" onClick={async () => { const bk = await db.recipes.get(r.id); await db.recipes.delete(r.id); toastUndo('Recipe deleted', async () => { if (bk) { await db.recipes.put(bk); toast('Restored'); } }); }}><Trash2 size={13} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && <RecipeEditor recipe={editor} products={products} onClose={() => setEditor(null)} />}
      {produce && <ProduceModal recipe={produce as any} onClose={() => setProduce(null)} />}
    </div>
  );
}

function RecipeEditor({ recipe, products, onClose }: { recipe: Recipe; products: any[]; onClose: () => void }) {
  const s = useSettings();
  const [f, setF] = useState<Recipe>(recipe);
  const [outQ, setOutQ] = useState(recipe.productName);
  const [ingQ, setIngQ] = useState('');
  const dOut = useDebounced(outQ, 150); const dIng = useDebounced(ingQ, 150);

  const outHits = useMemo(() => (dOut.trim() && dOut !== f.productName ? searchProducts(products as any, dOut, 6) : []), [products, dOut, f.productName]);
  const ingHits = useMemo(() => (dIng.trim() ? searchProducts(products as any, dIng, 6) : []), [products, dIng]);

  const cost = f.items.reduce((t, it) => {
    const p = products.find((x: any) => x.id === it.productId);
    return t + ((p?.cost || 0) * it.qty);
  }, 0) + (f.labourCost || 0);

  const save = async () => {
    if (!f.productId) return toast('Select the finished product', 'err');
    if (!f.items.length) return toast('Add at least one ingredient', 'err');
    const rec = { ...f, id: f.id || uid('rc_'), updatedAt: Date.now() };
    await db.recipes.put(rec);
    await logActivity('recipe', `Recipe saved for ${rec.productName}`);
    toast('Recipe saved'); onClose();
  };

  return (
    <Modal open onClose={onClose} wide title={f.id ? 'Edit recipe' : 'New recipe'}
      footer={<div className="flex items-center gap-2">
        <div className="flex-1"><p className="text-[10px] uppercase text-ink3">Batch cost</p><p className="font-mono text-lg font-bold text-brand">{money(cost, s.currency)}</p></div>
        <button className="btn-primary" onClick={save}>Save recipe</button>
      </div>}>
      <Field label="Finished product">
        <Input value={outQ} onChange={(e) => { setOutQ(e.target.value); setF({ ...f, productId: '', productName: e.target.value }); }} placeholder="Search the item you produce…" />
      </Field>
      {outHits.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-xl border border-line">
          {outHits.map((p: any) => (
            <button key={p.id} className="flex w-full justify-between border-b border-line px-3 py-2 text-left text-xs last:border-0 hover:bg-surface2"
              onClick={() => { setF({ ...f, productId: p.id, productName: p.name }); setOutQ(p.name); }}>
              <span className="truncate text-ink">{p.name}</span><span className="font-mono text-brand">{money(p.price, s.currency)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Yield (units per batch)"><Input inputMode="decimal" value={f.yield} onChange={(e) => setF({ ...f, yield: +e.target.value || 1 })} /></Field>
        <Field label="Labour / overhead cost"><Input inputMode="decimal" value={f.labourCost ?? 0} onChange={(e) => setF({ ...f, labourCost: +e.target.value || 0 })} /></Field>
      </div>

      <Field label="Add ingredient" className="mt-3"><Input value={ingQ} onChange={(e) => setIngQ(e.target.value)} placeholder="Search raw material…" /></Field>
      {ingHits.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-xl border border-line">
          {ingHits.map((p: any) => (
            <button key={p.id} className="flex w-full justify-between border-b border-line px-3 py-2 text-left text-xs last:border-0 hover:bg-surface2"
              onClick={() => { setF({ ...f, items: [...f.items, { productId: p.id, name: p.name, qty: 1, unit: p.unit }] }); setIngQ(''); }}>
              <span className="truncate text-ink">{p.name}</span><span className="font-mono text-ink3">stock {p.stock}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        {f.items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl border border-line p-2">
            <span className="min-w-0 flex-1 truncate text-xs text-ink">{it.name}</span>
            <input className="input h-7 w-20 text-center font-mono text-xs" value={it.qty}
              onChange={(e) => setF({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, qty: +e.target.value || 0 } : x)) })} />
            <span className="w-10 text-[11px] text-ink3">{it.unit}</span>
            <button className="rounded-lg p-1 text-ink3 hover:text-bad" onClick={() => setF({ ...f, items: f.items.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-2 text-[11px] text-ink3"><Calculator size={13} /> Cost per unit: <b className="text-ink">{money(cost / Math.max(1, f.yield), s.currency)}</b></p>
    </Modal>
  );
}

function ProduceModal({ recipe, onClose }: { recipe: any; onClose: () => void }) {
  const s = useSettings();
  const [batches, setBatches] = useState('1');
  const n = Math.max(0, +batches || 0);

  const run = async () => {
    if (n < 1) return toast('Enter batches', 'err');
    if (n > recipe.canMake) return toast(`Only ${recipe.canMake} batches possible with current stock`, 'err');
    for (const it of recipe.items) {
      const p = await db.products.get(it.productId);
      if (!p) continue;
      const before = p.stock; const after = +(before - it.qty * n).toFixed(3);
      await db.products.update(p.id, { stock: after, updatedAt: Date.now() });
      await addStockLog(p.id, p.name, 'transfer', -it.qty * n, before, after, 'PROD-' + recipe.id.slice(-4));
    }
    const out = await db.products.get(recipe.productId);
    if (out) {
      const before = out.stock; const after = +(before + recipe.yield * n).toFixed(3);
      await db.products.update(out.id, { stock: after, cost: +recipe.unitCost.toFixed(2), updatedAt: Date.now() });
      await addStockLog(out.id, out.name, 'purchase', recipe.yield * n, before, after, 'PROD-' + recipe.id.slice(-4));
    }
    await logActivity('production', `Produced ${recipe.yield * n} × ${recipe.productName}`);
    toast(`Produced ${recipe.yield * n} ${recipe.productName}`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Production run · ${recipe.productName}`}
      footer={<button className="btn-primary w-full" onClick={run}><Factory size={15} /> Produce {recipe.yield * n} units</button>}>
      <Field label="Batches to produce" hint={`Max possible right now: ${recipe.canMake}`}>
        <Input inputMode="numeric" value={batches} onChange={(e) => setBatches(e.target.value)} autoFocus />
      </Field>
      <div className="mt-3 rounded-xl border border-line p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink3">Will consume</p>
        {recipe.items.map((it: any, i: number) => (
          <div key={i} className="flex justify-between text-xs text-ink2"><span className="truncate">{it.name}</span><span className="font-mono">{(it.qty * n).toFixed(2)} {it.unit}</span></div>
        ))}
      </div>
      <div className="mt-2 rounded-xl border border-ok/30 bg-ok/10 p-3 text-xs text-ok">
        Produces <b>{recipe.yield * n}</b> × {recipe.productName} at <b>{money(recipe.unitCost, s.currency)}</b> per unit.
      </div>
    </Modal>
  );
}
