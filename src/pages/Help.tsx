import { Keyboard, Zap, Database, Smartphone, Store } from 'lucide-react';
import { Card, SectionTitle, Badge } from '@/components/ui';
import { useShop, useSettings } from '@/store/settings';
import { SHOP_PROFILES } from '@/lib/shopProfiles';

const KEYS = [
  ['Ctrl / ⌘ + K', 'Command palette — jump anywhere, add any product'],
  ['F1 … F4', 'Billing · Inventory · Customers · Reports'],
  ['/', 'Focus the product search on the billing screen'],
  ['F8', 'Open barcode scanner'],
  ['F9', 'Hold the current bill'],
  ['F10', 'Attach a customer'],
  ['Ctrl / ⌘ + Enter', 'Charge the current cart'],
  ['Ctrl / ⌘ + B', 'Quick calculator'],
  ['Esc', 'Close any dialog'],
];

export default function Help() {
  const { profile, terms } = useShop();
  const s = useSettings();
  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle title={`${s.logoEmoji} ${s.shopName}`} sub={`Running as ${profile.emoji} ${profile.label}`} />
        <p className="text-sm leading-relaxed text-ink2">
          SwiftPOS Pro is a fully offline point-of-sale suite. Everything — {terms.products.toLowerCase()}, {terms.sales.toLowerCase()},
          {' '}{terms.customers.toLowerCase()}, reports — is stored inside your browser, so it keeps working with no internet and no server bill.
          Install it to your home screen for a native, full-screen app.
        </p>
      </Card>

      <Card>
        <SectionTitle title="Keyboard shortcuts" sub="Desktop power-user flow" />
        <div className="space-y-1.5">
          {KEYS.map(([k, d]) => (
            <div key={k} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
              <kbd className="shrink-0 rounded-md border border-line bg-surface2 px-2 py-1 font-mono text-[11px] text-brand">{k}</kbd>
              <span className="text-xs text-ink2">{d}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Getting started in 4 steps" />
        <ol className="space-y-2 text-sm text-ink2">
          <li><b className="text-ink">1. Pick your shop type</b> — Settings → Shop Type. Wording and modules adapt to your trade.</li>
          <li><b className="text-ink">2. Load your catalogue</b> — Settings → JSON Data. Import your own JSON/CSV, or one-tap a bundled demo catalogue.</li>
          <li><b className="text-ink">3. Set store details & tax</b> — Settings → Store and Billing so invoices print correctly.</li>
          <li><b className="text-ink">4. Start billing</b> — press F1, scan or tap items, then Ctrl+Enter to charge.</li>
        </ol>
      </Card>

      <Card>
        <SectionTitle title="Supported business types" sub="Switch any time — your data stays put" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {SHOP_PROFILES.map((p) => (
            <div key={p.id} className="rounded-xl border border-line p-3">
              <p className="text-sm font-bold text-ink">{p.emoji} {p.label}</p>
              <p className="text-[11px] text-ink3">{p.blurb}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Your data" />
        <p className="text-sm text-ink2">
          Stored locally with IndexedDB. Take regular backups from Settings → Backup (a single JSON file that restores everything),
          and export CSVs from any list for your accountant.
        </p>
      </Card>
    </div>
  );
}
