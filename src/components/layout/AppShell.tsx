import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, Search, Calculator as CalcIcon, Sun, Moon, Wifi, WifiOff, Bell, X, ShoppingCart, Lock,
  Download, RefreshCw,
} from 'lucide-react';
import { NAV, BOTTOM_NAV, visibleNav } from './nav';
import { useUI } from '@/store/ui';
import { useSettings, useShop, applyTheme } from '@/store/settings';
import { useCloud } from '@/store/cloud';
import { startAutoSync, stopAutoSync, heartbeat } from '@/lib/cloud/engine';
import { useCart } from '@/store/cart';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { canInstall, promptInstall, hasUpdate, applyUpdate, onPwaChange } from '@/lib/pwa';
import { idle } from '@/lib/perf';
import { cx } from '@/lib/format';
import { stockState, expiryState } from '@/lib/calc';
import { useHotkeys } from '@/hooks/useKeys';
import Toasts from './Toasts';
import CommandPalette from './CommandPalette';
import Calculator from './Calculator';
import LockScreen from './LockScreen';

export default function AppShell() {
  const { sidebarOpen, setSidebar, setPalette, setCalc, online, setOnline, setLocked } = useUI();
  const settings = useSettings();
  const cloudOn = useCloud((c) => c.enabled);
  const cloudAuto = useCloud((c) => c.autoSync);
  useEffect(() => {
    heartbeat();
    if (cloudOn && cloudAuto) startAutoSync(); else stopAutoSync();
    return () => stopAutoSync();
  }, [cloudOn, cloudAuto]);
  const cart = useCart();
  const [pwa, setPwa] = useState({ install: false, update: false });
  // Warm the most-used routes while the browser is idle — navigation feels instant.
  useEffect(() => {
    idle(() => {
      import('@/pages/POS'); import('@/pages/Inventory'); import('@/pages/Sales');
      idle(() => { import('@/pages/Customers'); import('@/pages/Insights'); import('@/pages/Ledger'); }, 3000);
    }, 2000);
  }, []);

  useEffect(() => { const off = onPwaChange(() => setPwa({ install: canInstall(), update: hasUpdate() })); return () => { off(); }; }, []);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => { applyTheme(settings); }, [settings.theme, settings.accent, settings.density, settings.fontScale]);
  useEffect(() => { setSidebar(false); }, [loc.pathname]);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useHotkeys({
    'mod+k': (e) => { e.preventDefault(); setPalette(true); },
    'f1': (e) => { e.preventDefault(); nav('/pos'); },
    'f2': (e) => { e.preventDefault(); nav('/inventory'); },
    'f3': (e) => { e.preventDefault(); nav('/customers'); },
    'f4': (e) => { e.preventDefault(); nav('/reports'); },
    'mod+/': (e) => { e.preventDefault(); nav('/help'); },
    'mod+b': (e) => { e.preventDefault(); setCalc(true); },
  });

  const alerts = useLiveQuery(
    () => db.products.filter((p: any) => p.active && (stockState(p) !== 'ok' || expiryState(p, settings.expiryAlertDays) !== 'fresh')).count(),
    [settings.expiryAlertDays], 0,
  ) || 0;
  const current = NAV.find((n) => n.path === loc.pathname);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-amoled">
      {/* Sidebar (desktop) */}
      <aside className="no-scrollbar hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface/60 lg:flex">
        <Brand />
        <NavList />
      </aside>

      {/* Drawer (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setSidebar(false)}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <aside className="no-scrollbar absolute inset-y-0 left-0 flex w-64 animate-slideup flex-col overflow-y-auto border-r border-line bg-surface">
            <div className="flex items-center justify-between pr-2"><Brand /><button className="rounded-lg p-2 text-ink3" onClick={() => setSidebar(false)}><X size={18} /></button></div>
            <NavList />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="no-print flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface/70 px-3 backdrop-blur">
          <button className="rounded-lg p-2 text-ink2 hover:bg-surface2 lg:hidden" onClick={() => setSidebar(true)}><Menu size={19} /></button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-extrabold tracking-tight text-ink">{current?.label ?? 'SwiftPOS'}</h1>
            <p className="hidden truncate text-[11px] text-ink3 sm:block">{current?.hint}</p>
          </div>
          <button onClick={() => setPalette(true)} className="hidden items-center gap-2 rounded-xl border border-line bg-surface2 px-3 py-1.5 text-xs text-ink3 hover:border-brand/50 md:flex">
            <Search size={14} /> Search… <kbd className="rounded border border-line px-1 text-[10px]">⌘K</kbd>
          </button>
          <button onClick={() => setPalette(true)} className="rounded-lg p-2 text-ink2 hover:bg-surface2 md:hidden"><Search size={18} /></button>
          <button onClick={() => setCalc(true)} className="rounded-lg p-2 text-ink2 hover:bg-surface2"><CalcIcon size={18} /></button>
          <NavLink to="/inventory?filter=alerts" className="relative rounded-lg p-2 text-ink2 hover:bg-surface2">
            <Bell size={18} />
            {alerts > 0 && <span className="absolute right-0.5 top-0.5 min-w-[16px] rounded-full bg-bad px-1 text-[9px] font-bold leading-4 text-white">{alerts}</span>}
          </NavLink>
          {pwa.update && <button onClick={applyUpdate} className="rounded-lg p-2 text-ok hover:bg-surface2" title="Update available — tap to reload"><RefreshCw size={17} /></button>}
          {pwa.install && <button onClick={promptInstall} className="rounded-lg p-2 text-brand hover:bg-surface2" title="Install app"><Download size={17} /></button>}
          {settings.appLockPin && <button onClick={() => setLocked(true)} className="rounded-lg p-2 text-ink2 hover:bg-surface2" title="Lock app"><Lock size={17} /></button>}
          <button onClick={() => settings.set({ theme: settings.theme === 'amoled' ? 'light' : 'amoled' })} className="rounded-lg p-2 text-ink2 hover:bg-surface2">
            {settings.theme === 'amoled' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className={cx('hidden rounded-lg p-2 sm:block', online ? 'text-ok' : 'text-warn')}>{online ? <Wifi size={16} /> : <WifiOff size={16} />}</span>
        </header>

        <main className="no-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-3 pb-28 sm:p-4 lg:pb-6">
            <Outlet />
          </div>
        </main>

        {/* Bottom nav (mobile) */}
        <nav className="no-print safe-b fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-surface/95 backdrop-blur lg:hidden">
          {BOTTOM_NAV.map((path) => {
            const item = NAV.find((n) => n.path === path)!;
            const Icon = item.icon;
            return (
              <NavLink key={path} to={path} className={({ isActive }) => cx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold', isActive ? 'text-brand' : 'text-ink3')}>
                <Icon size={19} />{item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Floating cart pill */}
        {cart.lines.length > 0 && loc.pathname !== '/pos' && (
          <button onClick={() => nav('/pos')} className="no-print fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-bold text-black shadow-glow lg:bottom-6">
            <ShoppingCart size={17} /> {cart.lines.length} item{cart.lines.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <LockScreen />
      <Toasts />
      <CommandPalette />
      <Calculator />
    </div>
  );
}

function Brand() {
  const s = useSettings();
  return (
    <div className="flex items-center gap-2.5 px-4 py-4">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-lg shadow-glow">{s.logoEmoji}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold tracking-tight text-ink">{s.shopName}</p>
        <p className="truncate text-[10px] uppercase tracking-widest text-ink3">SwiftPOS Pro v7</p>
      </div>
    </div>
  );
}

function NavList() {
  const { system } = useShop();
  const showAll = useSettings((x) => x.showAllScreens);
  const nav = visibleNav(system.screens, showAll);
  const groups = Array.from(new Set(nav.map((n) => n.group)));
  return (
    <div className="flex-1 space-y-4 px-2.5 pb-6">
      {groups.map((g) => (
        <div key={g}>
          <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-ink3">{g}</p>
          <div className="space-y-0.5">
            {nav.filter((n) => n.group === g).map((n) => {
              const Icon = n.icon;
              return (
                <NavLink key={n.path} to={n.path} end={n.path === '/'}
                  className={({ isActive }) => cx('flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition',
                    isActive ? 'bg-brand/12 text-brand shadow-[inset_0_0_0_1px_rgb(var(--brand)/0.3)]' : 'text-ink2 hover:bg-surface2 hover:text-ink')}>
                  <Icon size={17} /> {n.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
