import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Image as ImageIcon, Trash2, Info, ShieldCheck, MessageSquare, Printer, Bell, Percent,
} from 'lucide-react';
import { Card, Field, Input, Select, Textarea, Toggle, Tabs, SectionTitle, Badge, ConfirmBtn } from '@/components/ui';
import { useSettings, useShop } from '@/store/settings';
import { toast } from '@/store/ui';
import { cx, money } from '@/lib/format';
import { ShopTypeTab, JsonTab, BackupTab } from './settings/DataTabs';
import PaymentsTab from './settings/PaymentsTab';
import TemplatesTab from './settings/TemplatesTab';

const TABS = [
  { id: 'shop', label: 'Shop Type' },
  { id: 'store', label: 'Store' },
  { id: 'billing', label: 'Billing & Tax' },
  { id: 'charges', label: 'Charges' },
  { id: 'payments', label: 'Payments & UPI' },
  { id: 'templates', label: 'Bill Templates' },
  { id: 'printing', label: 'Printing' },
  { id: 'pos', label: 'POS' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'security', label: 'Security' },
  { id: 'json', label: 'JSON Data' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'backup', label: 'Backup' },
  { id: 'about', label: 'About' },
];

export default function SettingsPage() {
  const s = useSettings();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') ?? 'shop');
  useEffect(() => { setParams(tab === 'shop' ? {} : { tab }); }, [tab]);

  return (
    <div className="space-y-3">
      <Card pad={false} className="p-3"><Tabs active={tab} onChange={setTab} tabs={TABS} /></Card>

      {tab === 'shop' && <ShopTypeTab />}
      {tab === 'store' && <StoreTab />}
      {tab === 'billing' && <BillingTab />}
      {tab === 'charges' && <ChargesTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'printing' && <PrintingTab />}
      {tab === 'pos' && <PosTab />}
      {tab === 'inventory' && <InventoryTab />}
      {tab === 'loyalty' && <LoyaltyTab />}
      {tab === 'messaging' && <MessagingTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'json' && <JsonTab />}
      {tab === 'appearance' && <AppearanceTab />}
      {tab === 'backup' && <BackupTab />}
      {tab === 'about' && <AboutTab />}
    </div>
  );
}

/* ── STORE ─────────────────────────────────────────────── */
function StoreTab() {
  const s = useSettings();
  const logoRef = useRef<HTMLInputElement>(null);
  const signRef = useRef<HTMLInputElement>(null);
  const readImg = (f: File, key: 'logoDataUrl' | 'signatureDataUrl') => {
    if (f.size > 400_000) return toast('Please use an image under 400 KB', 'err');
    const r = new FileReader();
    r.onload = () => { s.set({ [key]: String(r.result) } as any); toast('Image saved'); };
    r.readAsDataURL(f);
  };
  return (
    <div className="space-y-3">
      <Card className="grid gap-3 sm:grid-cols-2">
        <Field label="Shop name" className="sm:col-span-2"><Input value={s.shopName} onChange={(e) => s.set({ shopName: e.target.value })} /></Field>
        <Field label="Tagline"><Input value={s.tagline} onChange={(e) => s.set({ tagline: e.target.value })} /></Field>
        <Field label="Logo emoji"><Input value={s.logoEmoji} onChange={(e) => s.set({ logoEmoji: e.target.value })} /></Field>
        <Field label="Phone"><Input value={s.phone} onChange={(e) => s.set({ phone: e.target.value })} /></Field>
        <Field label="Alternate phone"><Input value={s.phone2} onChange={(e) => s.set({ phone2: e.target.value })} /></Field>
        <Field label="Email"><Input value={s.email} onChange={(e) => s.set({ email: e.target.value })} /></Field>
        <Field label="Website"><Input value={s.website} onChange={(e) => s.set({ website: e.target.value })} /></Field>
        <Field label="Address" className="sm:col-span-2"><Textarea value={s.address} onChange={(e) => s.set({ address: e.target.value })} /></Field>
      </Card>
      <Card className="grid gap-3 sm:grid-cols-2">
        <SectionTitle title="Legal identifiers" sub="Printed on invoices where the template supports them" />
        <div />
        <Field label="GSTIN"><Input value={s.gstin} onChange={(e) => s.set({ gstin: e.target.value })} /></Field>
        <Field label="PAN"><Input value={s.panNo} onChange={(e) => s.set({ panNo: e.target.value })} /></Field>
        <Field label="FSSAI licence"><Input value={s.fssai} onChange={(e) => s.set({ fssai: e.target.value })} /></Field>
        <Field label="Drug licence (pharmacy)"><Input value={s.drugLicense} onChange={(e) => s.set({ drugLicense: e.target.value })} /></Field>
      </Card>
      <Card>
        <SectionTitle title="Logo & signature" sub="Used by A4 templates. Keep files small (< 400 KB)." />
        <div className="grid gap-3 sm:grid-cols-2">
          {([['logoDataUrl', 'Logo', logoRef], ['signatureDataUrl', 'Signature', signRef]] as const).map(([key, label, ref]) => (
            <div key={key} className="rounded-xl border border-line p-3">
              <p className="label">{label}</p>
              {s[key] ? <img src={s[key] as string} alt={label} className="mb-2 max-h-20 rounded bg-white p-1" />
                      : <div className="mb-2 grid h-20 place-items-center rounded bg-surface2 text-ink3"><ImageIcon size={20} /></div>}
              <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && readImg(e.target.files[0], key)} />
              <div className="flex gap-2">
                <button className="btn-soft flex-1 text-xs" onClick={() => ref.current?.click()}>Upload</button>
                <button className="btn-ghost text-xs" onClick={() => s.set({ [key]: '' } as any)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="grid gap-3 sm:grid-cols-3">
        <Field label="Currency symbol"><Input value={s.currency} onChange={(e) => s.set({ currency: e.target.value })} /></Field>
        <Field label="Symbol position"><Select value={s.currencyPosition} onChange={(e) => s.set({ currencyPosition: e.target.value as any })}><option value="before">Before — ₹100</option><option value="after">After — 100₹</option></Select></Field>
        <Field label="Decimal places"><Select value={s.decimals} onChange={(e) => s.set({ decimals: +e.target.value as any })}>{[0, 1, 2].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
        <Field label="Date format"><Select value={s.dateFormat} onChange={(e) => s.set({ dateFormat: e.target.value as any })}>{['dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy-mm-dd', 'dd MMM yyyy'].map((f) => <option key={f} value={f}>{f}</option>)}</Select></Field>
        <Field label="Language"><Select value={s.language} onChange={(e) => s.set({ language: e.target.value as any })}><option value="en">English</option><option value="hi">हिन्दी (beta)</option></Select></Field>
      </Card>
    </div>
  );
}

/* ── BILLING ───────────────────────────────────────────── */
function BillingTab() {
  const s = useSettings();
  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <SectionTitle title="Invoice numbering" />
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Prefix"><Input value={s.invoicePrefix} onChange={(e) => s.set({ invoicePrefix: e.target.value })} /></Field>
          <Field label="Next number"><Input inputMode="numeric" value={s.invoiceNext} onChange={(e) => s.set({ invoiceNext: +e.target.value || 1 })} /></Field>
          <Field label="Digits"><Input inputMode="numeric" value={s.invoicePadding} onChange={(e) => s.set({ invoicePadding: +e.target.value || 5 })} /></Field>
          <Field label="Suffix"><Input value={s.invoiceSuffix} onChange={(e) => s.set({ invoiceSuffix: e.target.value })} /></Field>
        </div>
        <p className="text-xs text-ink3">Preview: <b className="text-brand">{s.invoicePrefix}{String(s.invoiceNext).padStart(s.invoicePadding, '0')}{s.invoiceSuffix}</b></p>
        <Toggle checked={s.resetInvoiceYearly} onChange={(v) => s.set({ resetInvoiceYearly: v })} label="Reset numbering every financial year" />
      </Card>
      <Card className="space-y-3">
        <SectionTitle title="Tax" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Default GST %"><Input inputMode="decimal" value={s.defaultGst} onChange={(e) => s.set({ defaultGst: +e.target.value || 0 })} /></Field>
          <Field label="Cess %"><Input inputMode="decimal" value={s.cessPct} onChange={(e) => s.set({ cessPct: +e.target.value || 0 })} /></Field>
          <Field label="Rounding mode"><Select value={s.roundMode} onChange={(e) => s.set({ roundMode: e.target.value as any })}><option value="nearest">Nearest rupee</option><option value="up">Always up</option><option value="down">Always down</option></Select></Field>
        </div>
        <Toggle checked={s.taxInclusive} onChange={(v) => s.set({ taxInclusive: v })} label="Prices include GST" hint="Turn off to add tax on top" />
        <Toggle checked={s.roundOff} onChange={(v) => s.set({ roundOff: v })} label="Round off bill total" />
        <Toggle checked={s.enableCess} onChange={(v) => s.set({ enableCess: v })} label="Enable cess" hint="Additional levy on top of GST" />
        <Toggle checked={s.showHsn} onChange={(v) => s.set({ showHsn: v })} label="Show HSN/SAC on invoices" />
        <Toggle checked={s.showSavings} onChange={(v) => s.set({ showSavings: v })} label="Show 'you saved' line" />
        <Toggle checked={s.showAmountInWords} onChange={(v) => s.set({ showAmountInWords: v })} label="Print amount in words" />
      </Card>
      <Card className="space-y-3">
        <SectionTitle title="Receipt text" />
        <Field label="Footer note"><Input value={s.footerNote} onChange={(e) => s.set({ footerNote: e.target.value })} /></Field>
        <Field label="Terms & conditions"><Textarea value={s.termsText} onChange={(e) => s.set({ termsText: e.target.value })} /></Field>
        <Field label="Duplicate copy label"><Input value={s.duplicateLabel} onChange={(e) => s.set({ duplicateLabel: e.target.value })} /></Field>
      </Card>
    </div>
  );
}

/* ── CHARGES ───────────────────────────────────────────── */
function ChargesTab() {
  const s = useSettings();
  return (
    <Card className="space-y-3">
      <SectionTitle title="Extra charges" sub="Defaults applied at billing — the cashier can still override per bill." right={<Percent size={16} className="text-ink3" />} />
      <Toggle checked={s.serviceChargeEnabled} onChange={(v) => s.set({ serviceChargeEnabled: v })} label="Apply service charge automatically" hint="Common for dine-in restaurants" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Service charge %"><Input inputMode="decimal" value={s.serviceChargePct} onChange={(e) => s.set({ serviceChargePct: +e.target.value || 0 })} /></Field>
        <Field label="Packaging charge" hint="Added for takeaway / delivery"><Input inputMode="decimal" value={s.packagingCharge} onChange={(e) => s.set({ packagingCharge: +e.target.value || 0 })} /></Field>
        <Field label="Delivery charge"><Input inputMode="decimal" value={s.deliveryCharge} onChange={(e) => s.set({ deliveryCharge: +e.target.value || 0 })} /></Field>
        <Field label="Preview on a ₹1,000 bill">
          <div className="input flex items-center justify-between">
            <span className="text-ink3">Total with charges</span>
            <span className="font-mono font-bold text-brand">{money(1000 + (s.serviceChargeEnabled ? 10 * s.serviceChargePct : 0) + s.packagingCharge + s.deliveryCharge, s.currency)}</span>
          </div>
        </Field>
      </div>
      <Toggle checked={s.tipEnabled} onChange={(v) => s.set({ tipEnabled: v })} label="Show tip field at payment" />
      <Toggle checked={s.chargesTaxable} onChange={(v) => s.set({ chargesTaxable: v })} label="Charges are taxable" hint="Apply GST on service/packaging charges" />
    </Card>
  );
}

/* ── PRINTING ──────────────────────────────────────────── */
function PrintingTab() {
  const s = useSettings();
  return (
    <Card className="space-y-3">
      <SectionTitle title="Printer & paper" sub="Works with any thermal or laser printer your device can reach." right={<Printer size={16} className="text-ink3" />} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Paper size"><Select value={s.printPaper} onChange={(e) => s.set({ printPaper: e.target.value as any })}>{['58mm', '80mm', 'A4'].map((p) => <option key={p}>{p}</option>)}</Select></Field>
        <Field label="Copies per bill"><Select value={s.printCopies} onChange={(e) => s.set({ printCopies: +e.target.value })}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
        <Field label="Margin (mm)"><Input inputMode="decimal" value={s.printMargin} onChange={(e) => s.set({ printMargin: +e.target.value || 0 })} /></Field>
        <Field label="Font scale"><Input inputMode="decimal" value={s.printFontScale} onChange={(e) => s.set({ printFontScale: +e.target.value || 1 })} /></Field>
        <Field label="Density"><Select value={s.printDensity} onChange={(e) => s.set({ printDensity: e.target.value as any })}>{['compact', 'normal', 'airy'].map((d) => <option key={d}>{d}</option>)}</Select></Field>
      </div>
      <Toggle checked={s.autoPrint} onChange={(v) => s.set({ autoPrint: v })} label="Auto-print receipt after payment" />
      <Toggle checked={s.autoPrintKot} onChange={(v) => s.set({ autoPrintKot: v })} label="Auto-print kitchen KOT" hint="Restaurants: fires when the order is saved" />
      <Toggle checked={s.printLogo} onChange={(v) => s.set({ printLogo: v })} label="Print logo on invoices" />
      <Toggle checked={s.printBarcodeOnBill} onChange={(v) => s.set({ printBarcodeOnBill: v })} label="Print invoice barcode" hint="Scan the bill to pull it up instantly" />
      <Toggle checked={s.printQrOnBill} onChange={(v) => s.set({ printQrOnBill: v })} label="Print UPI QR on bill" />
      <Toggle checked={s.openDrawer} onChange={(v) => s.set({ openDrawer: v })} label="Send cash-drawer kick signal" hint="Requires a drawer wired to the printer" />
    </Card>
  );
}

/* ── POS ───────────────────────────────────────────────── */
function PosTab() {
  const s = useSettings();
  return (
    <Card className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Default layout"><Select value={s.posLayout} onChange={(e) => s.set({ posLayout: e.target.value as any })}><option value="grid">Grid</option><option value="list">List</option></Select></Field>
        <Field label="Grid columns (mobile)"><Input inputMode="numeric" value={s.gridCols} onChange={(e) => s.set({ gridCols: Math.min(5, Math.max(2, +e.target.value || 3)) })} /></Field>
        <Field label="Quick cash buttons"><Input value={s.quickCash.join(', ')} onChange={(e) => s.set({ quickCash: e.target.value.split(',').map((x) => +x.trim()).filter(Boolean) })} /></Field>
      </div>
      <Toggle checked={s.showImages} onChange={(v) => s.set({ showImages: v })} label="Show product icons" />
      <Toggle checked={s.oneTapAdd} onChange={(v) => s.set({ oneTapAdd: v })} label="One-tap add to cart" hint="Off = ask quantity first" />
      <Toggle checked={s.autoFocusSearch} onChange={(v) => s.set({ autoFocusSearch: v })} label="Auto-focus search on open" />
      <Toggle checked={s.confirmClearCart} onChange={(v) => s.set({ confirmClearCart: v })} label="Confirm before clearing the cart" />
      <Toggle checked={s.keepCustomerAfterSale} onChange={(v) => s.set({ keepCustomerAfterSale: v })} label="Keep customer attached after a sale" />
      <Toggle checked={s.customerRequired} onChange={(v) => s.set({ customerRequired: v })} label="Require a customer on every bill" />
      <Toggle checked={s.soundEnabled} onChange={(v) => s.set({ soundEnabled: v })} label="Sound feedback" />
      <Toggle checked={s.hapticEnabled} onChange={(v) => s.set({ hapticEnabled: v })} label="Haptic vibration (mobile)" />
      <Toggle checked={s.scannerBeep} onChange={(v) => s.set({ scannerBeep: v })} label="Beep on barcode scan" />
    </Card>
  );
}

/* ── INVENTORY ─────────────────────────────────────────── */
function InventoryTab() {
  const s = useSettings();
  return (
    <Card className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Expiry alert (days)"><Input inputMode="numeric" value={s.expiryAlertDays} onChange={(e) => s.set({ expiryAlertDays: +e.target.value || 30 })} /></Field>
        <Field label="Auto-reorder multiplier" hint="Suggested PO qty = low-stock × this"><Input inputMode="decimal" value={s.reorderMultiplier} onChange={(e) => s.set({ reorderMultiplier: +e.target.value || 2 })} /></Field>
        <Field label="Barcode prefix for generated codes"><Input value={s.barcodePrefix} onChange={(e) => s.set({ barcodePrefix: e.target.value })} /></Field>
        <Field label="Label columns per sheet"><Input inputMode="numeric" value={s.labelColumns} onChange={(e) => s.set({ labelColumns: Math.min(6, Math.max(1, +e.target.value || 3)) })} /></Field>
      </div>
      <Toggle checked={s.lowStockAlert} onChange={(v) => s.set({ lowStockAlert: v })} label="Low stock alerts" />
      <Toggle checked={s.negativeStock} onChange={(v) => s.set({ negativeStock: v })} label="Allow selling out-of-stock items" />
      <Toggle checked={s.autoReorder} onChange={(v) => s.set({ autoReorder: v })} label="Suggest purchase orders automatically" />
      <Toggle checked={s.labelShowMrp} onChange={(v) => s.set({ labelShowMrp: v })} label="Show MRP on price labels" />
      <Toggle checked={s.labelShowName} onChange={(v) => s.set({ labelShowName: v })} label="Show product name on labels" />
    </Card>
  );
}

/* ── LOYALTY ───────────────────────────────────────────── */
function LoyaltyTab() {
  const s = useSettings();
  return (
    <Card className="space-y-3">
      <Toggle checked={s.loyaltyEnabled} onChange={(v) => s.set({ loyaltyEnabled: v })} label="Enable loyalty points" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={`Points per ${s.currency}100`}><Input inputMode="decimal" value={s.pointsPer100} onChange={(e) => s.set({ pointsPer100: +e.target.value || 0 })} /></Field>
        <Field label="Value of 1 point"><Input inputMode="decimal" value={s.pointValue} onChange={(e) => s.set({ pointValue: +e.target.value || 0 })} /></Field>
        <Field label="Minimum redemption"><Input inputMode="numeric" value={s.minRedeem} onChange={(e) => s.set({ minRedeem: +e.target.value || 0 })} /></Field>
        <Field label="Points expire after (days, 0 = never)"><Input inputMode="numeric" value={s.pointsExpiryDays} onChange={(e) => s.set({ pointsExpiryDays: +e.target.value || 0 })} /></Field>
        <Field label="Birthday bonus points"><Input inputMode="numeric" value={s.birthdayBonus} onChange={(e) => s.set({ birthdayBonus: +e.target.value || 0 })} /></Field>
      </div>
    </Card>
  );
}

/* ── MESSAGING ─────────────────────────────────────────── */
function MessagingTab() {
  const s = useSettings();
  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <SectionTitle title="WhatsApp templates" sub="Placeholders: {customer} {shop} {invoice} {total} {due} {footer}" right={<MessageSquare size={16} className="text-ink3" />} />
        <Field label="Bill message"><Textarea value={s.waBillTemplate} onChange={(e) => s.set({ waBillTemplate: e.target.value })} /></Field>
        <Field label="Payment reminder"><Textarea value={s.waDueTemplate} onChange={(e) => s.set({ waDueTemplate: e.target.value })} /></Field>
        <Field label="Marketing blast"><Textarea value={s.waMarketingTemplate} onChange={(e) => s.set({ waMarketingTemplate: e.target.value })} /></Field>
      </Card>
      <Card className="space-y-2">
        <SectionTitle title="Alerts" right={<Bell size={16} className="text-ink3" />} />
        <Toggle checked={s.notifyLowStock} onChange={(v) => s.set({ notifyLowStock: v })} label="Low stock notifications" />
        <Toggle checked={s.notifyExpiry} onChange={(v) => s.set({ notifyExpiry: v })} label="Expiry notifications" />
        <Toggle checked={s.notifyDues} onChange={(v) => s.set({ notifyDues: v })} label="Credit due reminders" />
        <Toggle checked={s.dailySummary} onChange={(v) => s.set({ dailySummary: v })} label="Daily summary card on dashboard" />
      </Card>
    </div>
  );
}

/* ── SECURITY ──────────────────────────────────────────── */
function SecurityTab() {
  const s = useSettings();
  return (
    <Card className="space-y-3">
      <SectionTitle title="Access control" right={<ShieldCheck size={16} className="text-ink3" />} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="App lock PIN" hint="Blank = disabled"><Input inputMode="numeric" maxLength={6} value={s.appLockPin} onChange={(e) => s.set({ appLockPin: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Auto-lock after (minutes, 0 = never)"><Input inputMode="numeric" value={s.autoLockMinutes} onChange={(e) => s.set({ autoLockMinutes: +e.target.value || 0 })} /></Field>
        <Field label="Max discount a cashier can give (%)"><Input inputMode="decimal" value={s.restrictDiscountPct} onChange={(e) => s.set({ restrictDiscountPct: +e.target.value || 0 })} /></Field>
      </div>
      <Toggle checked={s.requirePin} onChange={(v) => s.set({ requirePin: v })} label="Require staff PIN for refunds & price overrides" />
      <Toggle checked={s.restrictRefunds} onChange={(v) => s.set({ restrictRefunds: v })} label="Only managers can refund" />
      <Toggle checked={s.hideCostPrices} onChange={(v) => s.set({ hideCostPrices: v })} label="Hide cost prices & margins from staff" />
      <ConfirmBtn onConfirm={() => { s.set({ appLockPin: '', autoLockMinutes: 0, requirePin: false }); toast('Security reset'); }}>Reset security settings</ConfirmBtn>
    </Card>
  );
}

/* ── APPEARANCE ────────────────────────────────────────── */
function AppearanceTab() {
  const s = useSettings();
  return (
    <Card className="space-y-4">
      <div>
        <p className="label">Theme</p>
        <div className="flex gap-2">
          {(['amoled', 'light'] as const).map((t) => (
            <button key={t} onClick={() => s.set({ theme: t })} className={cx('chip capitalize', s.theme === t && 'chip-on')}>{t === 'amoled' ? 'AMOLED black' : 'Light'}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">Accent colour</p>
        <div className="flex flex-wrap gap-2">
          {(['cyan', 'mint', 'violet', 'amber', 'rose', 'lime'] as const).map((a) => (
            <button key={a} onClick={() => s.set({ accent: a })} className={cx('chip capitalize', s.accent === a && 'chip-on')}>{a}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">Density</p>
        <div className="flex gap-2">
          {(['compact', 'normal', 'cozy'] as const).map((d) => (
            <button key={d} onClick={() => s.set({ density: d })} className={cx('chip capitalize', s.density === d && 'chip-on')}>{d}</button>
          ))}
        </div>
      </div>
      <Toggle checked={s.animations} onChange={(v) => s.set({ animations: v })} label="Interface animations" />
    </Card>
  );
}

/* ── ABOUT ─────────────────────────────────────────────── */
function AboutTab() {
  const { profile } = useShop();
  const s = useSettings();
  return (
    <Card className="space-y-3">
      <SectionTitle title="SwiftPOS Pro v7.1" sub="Offline-first point of sale for any business" right={<Info size={16} className="text-ink3" />} />
      <div className="grid gap-2 sm:grid-cols-3">
        {[['Shop profile', `${profile.emoji} ${profile.label}`], ['Theme', s.theme], ['Templates', '20 built-in + custom'],
          ['Storage', 'IndexedDB (offline)'], ['Stack', 'React · TS · Vite · Dexie'], ['Licence', 'MIT']].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-surface2/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-ink3">{k}</p>
            <p className="truncate text-sm font-bold text-ink">{v}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink3">Every byte of your data stays on this device. Take regular backups from the Backup tab.</p>
    </Card>
  );
}
