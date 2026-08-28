import { create } from 'zustand';

/** Business-system capture fields for the bill currently on screen
 *  (table no, doctor/Rx, IMEI, vehicle number, stylist…). */
interface BillMetaStore {
  values: Record<string, any>;
  setField: (k: string, v: any) => void;
  setAll: (v: Record<string, any>) => void;
  clear: () => void;
}
export const useBillMeta = create<BillMetaStore>((set) => ({
  values: {},
  setField: (k, v) => set((s) => ({ values: { ...s.values, [k]: v } })),
  setAll: (values) => set({ values }),
  clear: () => set({ values: {} }),
}));
