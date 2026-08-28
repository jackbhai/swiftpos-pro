import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getProfile, type ShopProfile, type ShopTypeId } from '@/lib/shopProfiles';

export interface UpiAccount {
  id: string;
  label: string;          // "HDFC Current", "Owner GPay"
  vpa: string;            // name@bank
  payeeName: string;
  merchantCode?: string;  // optional MCC for merchant VPAs
  active: boolean;
  isDefault: boolean;
  note?: string;
}

export interface BankAccount {
  id: string; label: string; accountName: string; accountNo: string; ifsc: string; bank: string; active: boolean;
}

export interface Settings {
  /* identity */
  shopType: ShopTypeId;
  moduleOverrides: Partial<ShopProfile['modules']>;
  shopName: string; tagline: string; address: string; phone: string; phone2: string; email: string;
  website: string; gstin: string; fssai: string; drugLicense: string; panNo: string;
  currency: string; currencyPosition: 'before' | 'after'; decimals: 0 | 1 | 2;
  logoEmoji: string; logoDataUrl: string; signatureDataUrl: string;
  dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd' | 'dd MMM yyyy';
  language: 'en' | 'hi';

  /* tax & billing */
  taxInclusive: boolean; roundOff: boolean; roundMode: 'nearest' | 'up' | 'down';
  defaultGst: number; enableCess: boolean; cessPct: number;
  invoicePrefix: string; invoiceNext: number; invoiceSuffix: string; invoicePadding: number;
  resetInvoiceYearly: boolean; footerNote: string; termsText: string; showHsn: boolean;
  showSavings: boolean; showAmountInWords: boolean;

  /* charges */
  serviceChargePct: number; serviceChargeEnabled: boolean;
  deliveryCharge: number; packagingCharge: number; tipEnabled: boolean;
  chargesTaxable: boolean;

  /* payments */
  upiAccounts: UpiAccount[]; bankAccounts: BankAccount[];
  showUpiQrOnBill: boolean; showUpiQrOnPayment: boolean; upiQrSize: number;
  enabledPayModes: string[]; defaultPayMode: string; allowCredit: boolean;

  /* receipt templates */
  defaultTemplate: string; a4Template: string; kotTemplate: string;
  printCopies: number; printPaper: '58mm' | '80mm' | 'A4';
  printFontScale: number; printMargin: number; printDensity: 'compact' | 'normal' | 'airy';
  autoPrint: boolean; autoPrintKot: boolean; openDrawer: boolean; printLogo: boolean;
  printBarcodeOnBill: boolean; printQrOnBill: boolean; duplicateLabel: string;

  /* inventory & alerts */
  lowStockAlert: boolean; expiryAlertDays: number; negativeStock: boolean;
  autoReorder: boolean; reorderMultiplier: number; barcodePrefix: string;
  labelColumns: number; labelShowMrp: boolean; labelShowName: boolean;

  /* loyalty */
  loyaltyEnabled: boolean; pointsPer100: number; pointValue: number; minRedeem: number;
  pointsExpiryDays: number; birthdayBonus: number;

  /* POS behaviour */
  soundEnabled: boolean; hapticEnabled: boolean; scannerBeep: boolean;
  quickCash: number[]; posLayout: 'grid' | 'list'; gridCols: number; showImages: boolean;
  confirmClearCart: boolean; autoFocusSearch: boolean; keepCustomerAfterSale: boolean;
  askTender: boolean; customerRequired: boolean; oneTapAdd: boolean;
  restaurantMode: boolean;

  /* security */
  requirePin: boolean; appLockPin: string; autoLockMinutes: number;
  hideCostPrices: boolean; restrictRefunds: boolean; restrictDiscountPct: number;

  /* notifications & messaging */
  waBillTemplate: string; waDueTemplate: string; waMarketingTemplate: string;
  notifyLowStock: boolean; notifyExpiry: boolean; notifyDues: boolean; dailySummary: boolean;

  /* appearance */
  theme: 'amoled' | 'light'; accent: 'cyan' | 'mint' | 'violet' | 'amber' | 'rose' | 'lime';
  density: 'compact' | 'normal' | 'cozy'; fontScale: number; animations: boolean;

  /* system */
  backupReminderDays: number; lastBackup: number; autoBackupOnClose: boolean;
}

export const defaultSettings: Settings = {
  shopType: 'grocery', moduleOverrides: {},
  shopName: 'SwiftPOS Store', tagline: 'Fast. Offline. Yours.',
  address: 'Connaught Place, New Delhi 110001', phone: '+91 98100 00000', phone2: '',
  email: 'hello@swiftpos.app', website: '', gstin: '07AAACS1234A1Z5', fssai: '', drugLicense: '', panNo: '',
  currency: '₹', currencyPosition: 'before', decimals: 2,
  logoEmoji: '⚡', logoDataUrl: '', signatureDataUrl: '',
  dateFormat: 'dd MMM yyyy', language: 'en',

  taxInclusive: true, roundOff: true, roundMode: 'nearest',
  defaultGst: 5, enableCess: false, cessPct: 0,
  invoicePrefix: 'INV-', invoiceNext: 1, invoiceSuffix: '', invoicePadding: 5,
  resetInvoiceYearly: false, footerNote: 'Thank you! Visit again 🙏',
  termsText: 'Goods once sold are not returnable without a valid bill.',
  showHsn: true, showSavings: true, showAmountInWords: true,

  serviceChargePct: 0, serviceChargeEnabled: false,
  deliveryCharge: 0, packagingCharge: 0, tipEnabled: false, chargesTaxable: false,

  upiAccounts: [], bankAccounts: [],
  showUpiQrOnBill: true, showUpiQrOnPayment: true, upiQrSize: 220,
  enabledPayModes: ['cash', 'upi', 'card', 'wallet', 'credit', 'split'], defaultPayMode: 'cash', allowCredit: true,

  defaultTemplate: 'thermal-classic', a4Template: 'a4-tax-invoice', kotTemplate: 'kot-kitchen',
  printCopies: 1, printPaper: '80mm', printFontScale: 1, printMargin: 3, printDensity: 'normal',
  autoPrint: false, autoPrintKot: false, openDrawer: false, printLogo: true,
  printBarcodeOnBill: true, printQrOnBill: true, duplicateLabel: 'CUSTOMER COPY',

  lowStockAlert: true, expiryAlertDays: 30, negativeStock: false,
  autoReorder: false, reorderMultiplier: 2, barcodePrefix: '890',
  labelColumns: 3, labelShowMrp: true, labelShowName: true,

  loyaltyEnabled: true, pointsPer100: 1, pointValue: 1, minRedeem: 50,
  pointsExpiryDays: 0, birthdayBonus: 100,

  soundEnabled: true, hapticEnabled: true, scannerBeep: true,
  quickCash: [50, 100, 200, 500, 2000], posLayout: 'grid', gridCols: 3, showImages: true,
  confirmClearCart: true, autoFocusSearch: true, keepCustomerAfterSale: false,
  askTender: true, customerRequired: false, oneTapAdd: true, restaurantMode: false,

  requirePin: false, appLockPin: '', autoLockMinutes: 0,
  hideCostPrices: false, restrictRefunds: false, restrictDiscountPct: 100,

  waBillTemplate: 'Hi {customer}, thanks for shopping at {shop}! Your bill {invoice} of {total} is attached. {footer}',
  waDueTemplate: 'Hi {customer}, a gentle reminder from {shop}: {due} is pending on your account. Kindly settle at your convenience.',
  waMarketingTemplate: 'Hi {customer}! New arrivals just landed at {shop}. Show this message for a special discount 🎁',
  notifyLowStock: true, notifyExpiry: true, notifyDues: true, dailySummary: false,

  theme: 'amoled', accent: 'cyan', density: 'normal', fontScale: 1, animations: true,
  backupReminderDays: 7, lastBackup: 0, autoBackupOnClose: false,
};

interface SettingsStore extends Settings {
  set: (p: Partial<Settings>) => void;
  reset: () => void;
  applyShopType: (id: ShopTypeId, adoptDefaults?: boolean) => void;
  addUpi: (a: Omit<UpiAccount, 'id'>) => void;
  updateUpi: (id: string, p: Partial<UpiAccount>) => void;
  removeUpi: (id: string) => void;
  setDefaultUpi: (id: string) => void;
}

const rid = () => Math.random().toString(36).slice(2, 9);

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      set: (p) => set(p as any),
      reset: () => set(defaultSettings),
      applyShopType: (id, adoptDefaults = true) => {
        const prof = getProfile(id);
        set(adoptDefaults
          ? {
              shopType: id, moduleOverrides: {}, defaultGst: prof.defaultGst, quickCash: prof.quickCash,
              posLayout: prof.posLayout, accent: prof.accent, restaurantMode: prof.modules.tables,
              defaultTemplate: prof.modules.tables ? 'thermal-restaurant' : prof.modules.prescription ? 'thermal-pharmacy' : 'thermal-classic',
            } as any
          : ({ shopType: id } as any));
      },
      addUpi: (a) => {
        const list = get().upiAccounts;
        set({ upiAccounts: [...list, { ...a, id: rid(), isDefault: a.isDefault || list.length === 0 }] } as any);
      },
      updateUpi: (id, p) => set({ upiAccounts: get().upiAccounts.map((u) => (u.id === id ? { ...u, ...p } : u)) } as any),
      removeUpi: (id) => {
        const left = get().upiAccounts.filter((u) => u.id !== id);
        if (left.length && !left.some((u) => u.isDefault)) left[0].isDefault = true;
        set({ upiAccounts: left } as any);
      },
      setDefaultUpi: (id) => set({ upiAccounts: get().upiAccounts.map((u) => ({ ...u, isDefault: u.id === id })) } as any),
    }),
    { name: 'swiftpos-settings', version: 2 },
  ),
);

export function applyTheme(s: Pick<Settings, 'theme' | 'accent' | 'density' | 'fontScale'>) {
  const el = document.documentElement;
  el.dataset.theme = s.theme === 'light' ? 'light' : 'amoled';
  el.dataset.accent = s.accent;
  el.dataset.density = s.density;
  el.style.setProperty('--font-scale', String(s.fontScale ?? 1));
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.setAttribute('content', s.theme === 'light' ? '#eef1f6' : '#000000');
}

export function useShop() {
  const shopType = useSettings((s) => s.shopType);
  const overrides = useSettings((s) => s.moduleOverrides);
  const profile = getProfile(shopType);
  return { profile, terms: profile.terms, modules: { ...profile.modules, ...overrides } };
}

export function shopNow() {
  const st = useSettings.getState();
  const profile = getProfile(st.shopType);
  return { profile, terms: profile.terms, modules: { ...profile.modules, ...st.moduleOverrides } };
}

export const defaultUpi = () => {
  const list = useSettings.getState().upiAccounts.filter((u) => u.active);
  return list.find((u) => u.isDefault) ?? list[0] ?? null;
};
