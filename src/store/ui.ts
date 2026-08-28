import { create } from 'zustand';

export interface Toast { id: string; msg: string; kind: 'ok' | 'err' | 'info' | 'warn'; undo?: () => void | Promise<void>; undoLabel?: string }

interface UIStore {
  toasts: Toast[];
  toast: (msg: string, kind?: Toast['kind']) => void;
  toastUndo: (msg: string, undo: () => void | Promise<void>, kind?: Toast['kind']) => void;
  dismiss: (id: string) => void;
  paletteOpen: boolean; setPalette: (v: boolean) => void;
  sidebarOpen: boolean; setSidebar: (v: boolean) => void;
  calcOpen: boolean; setCalc: (v: boolean) => void;
  locked: boolean; setLocked: (v: boolean) => void;
  online: boolean; setOnline: (v: boolean) => void;
}

export const useUI = create<UIStore>((set) => ({
  toasts: [],
  toast: (msg, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, msg, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600);
  },
  toastUndo: (msg, undo, kind = 'warn') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, msg, kind, undo, undoLabel: 'Undo' }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 6500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  paletteOpen: false, setPalette: (v) => set({ paletteOpen: v }),
  sidebarOpen: false, setSidebar: (v) => set({ sidebarOpen: v }),
  calcOpen: false, setCalc: (v) => set({ calcOpen: v }),
  locked: false, setLocked: (v) => set({ locked: v }),
  online: navigator.onLine, setOnline: (v) => set({ online: v }),
}));

export const toast = (msg: string, kind: Toast['kind'] = 'ok') => useUI.getState().toast(msg, kind);
export const toastUndo = (msg: string, undo: () => void | Promise<void>, kind: Toast['kind'] = 'warn') =>
  useUI.getState().toastUndo(msg, undo, kind);
