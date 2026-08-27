import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getProfile, type ShopProfile, type ShopTypeId } from '@/lib/shopProfiles';

export interface Settings {
  shopType: ShopTypeId;
  moduleOverrides: Partial<ShopProfile['modules']>;
  shopName: string; tagline: string; address: string; phone: string; email: string;
  gstin: string; currency: string; logoEmoji: string;
  taxInclusive: boolean; roundOff: boolean; defaultGst: number;
  invoicePrefix: string; invoiceNext: number; footerNote: string;
  lowStockAlert: boolean; expiryAlertDays: number;
  loyaltyEnabled: boolean; pointsPer100: number; pointValue: number; minRedeem: number;
  soundEnabled: boolean; hapticEnabled: boolean; scannerBeep: boolean;
  theme: 'amoled' | 'light'; accent: 'cyan' | 'mint' | 'violet' | 'amber' | 'rose' | 'lime';
  density: 'compact' | 'normal' | 'cozy'; gridCols: number;
  requirePin: boolean; autoPrint: boolean; showImages: boolean;
  quickCash: number[]; posLayout: 'grid' | 'list';
  restaurantMode: boolean; customerRequired: boolean; negativeStock: boolean;
  backupReminderDays: number; lastBackup: number;
}

export const defaultSettings: Settings = {
  shopType: 'grocery',
  moduleOverrides: {},
  shopName: 'SwiftPOS Store', tagline: 'Fast. Offline. Yours.',
  address: 'Connaught Place, New Delhi 110001', phone: '+91 98100 00000',
  email: 'hello@swiftpos.app', gstin: '07AAACS1234A1Z5', currency: '₹', logoEmoji: '⚡',
  taxInclusive: true, roundOff: true, defaultGst: 5,
  invoicePrefix: 'INV-', invoiceNext: 1, footerNote: 'Thank you! Visit again 🙏',
  lowStockAlert: true, expiryAlertDays: 30,
  loyaltyEnabled: true, pointsPer100: 1, pointValue: 1, minRedeem: 50,
  soundEnabled: true, hapticEnabled: true, scannerBeep: true,
  theme: 'amoled', accent: 'cyan', density: 'normal', gridCols: 3,
  requirePin: false, autoPrint: false, showImages: true,
  quickCash: [50, 100, 200, 500, 2000], posLayout: 'grid',
  restaurantMode: false, customerRequired: false, negativeStock: false,
  backupReminderDays: 7, lastBackup: 0,
};

interface SettingsStore extends Settings {
  set: (p: Partial<Settings>) => void;
  reset: () => void;
  applyShopType: (id: ShopTypeId, adoptDefaults?: boolean) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      set: (p) => set(p as any),
      reset: () => set(defaultSettings),
      applyShopType: (id, adoptDefaults = true) => {
        const prof = getProfile(id);
        set(adoptDefaults
          ? { shopType: id, moduleOverrides: {}, defaultGst: prof.defaultGst, quickCash: prof.quickCash, posLayout: prof.posLayout, accent: prof.accent, restaurantMode: prof.modules.tables } as any
          : ({ shopType: id } as any));
      },
    }),
    { name: 'swiftpos-settings' },
  ),
);

export function applyTheme(s: Pick<Settings, 'theme' | 'accent' | 'density'>) {
  const el = document.documentElement;
  el.dataset.theme = s.theme === 'light' ? 'light' : 'amoled';
  el.dataset.accent = s.accent;
  el.dataset.density = s.density;
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.setAttribute('content', s.theme === 'light' ? '#eef1f6' : '#000000');
}

/** Resolved shop profile with user module overrides applied. */
export function useShop() {
  const shopType = useSettings((s) => s.shopType);
  const overrides = useSettings((s) => s.moduleOverrides);
  const profile = getProfile(shopType);
  return {
    profile,
    terms: profile.terms,
    modules: { ...profile.modules, ...overrides },
  };
}

export function shopNow() {
  const st = useSettings.getState();
  const profile = getProfile(st.shopType);
  return { profile, terms: profile.terms, modules: { ...profile.modules, ...st.moduleOverrides } };
}
