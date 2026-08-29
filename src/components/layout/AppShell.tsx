import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, Search, Calculator as CalcIcon, Sun, Moon, Wifi, WifiOff, Bell, X, ShoppingCart, Lock,
  Download, RefreshCw, Cloud, CloudOff, Volume2, VolumeX, Sparkles, Smartphone, Layers, CheckCircle2,
} from 'lucide-react';
import { NAV, BOTTOM_NAV, visibleNav } from './nav';
import { useUI } from '@/store/ui';
import { useSettings, useShop, applyTheme } from '@/store/settings';
import { useCloud } from '@/store/cloud';
import { startAutoSync, stopAutoSync, heartbeat } from '@/lib/cloud/engine';
import { useCart } from '@/store/cart';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { canInstall, hasUpdate, applyUpdate, onPwaChange, isStandalone } from '@/lib/pwa';
import { idle } from '@/lib/perf';
import { cx, money } from '@/lib/format';
import { stockState, expiryState, computeTotals } from '@/lib/calc';
import { useHotkeys } from '@/hooks/useKeys';
import { clickSound, buzz } from '@/lib/sound';
import Toasts from './Toasts';
import CommandPalette from './CommandPalette';
import Calculator from './Calculator';
import LockScreen from './LockScreen';
import QuickSystemModal from './QuickSystemModal';
import PwaInstallModal from './PwaInstallModal';

export default function AppShell() {
  const { sidebarOpen, setSidebar, setPalette, setCalc, online, setOnline, setLocked } = useUI();
  const settings = useSettings();
  const onboarded = useSettings((x) => x.onboarded);
  const locPath = useLocation().pathname;
  const navigate = useNavigate();

  const [systemModalOpen, setSystemModalOpen] = useState(false);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);

  useEffect(() => {
    if (!onboarded && locPath !== '/welcome') navigate('/welcome', { replace: true });
  }, [onboarded, locPath]);

  const cloudOn = useCloud((c) => c.enabled);
  const cloudAuto = useCloud((c) => c.autoSync);
  const cloudRunning = useCloud((c) => c.running);

  useEffect(() => {
    heartbeat();
    if (cloudOn && cloudAuto) startAutoSync();
    else stopAutoSync();
    return () => stopAutoSync();
  }, [cloudOn, cloudAuto]);

  const cart = useCart();
  const { system } = useShop();
  const [pwa, setPwa] = useState({ install: false, update: false, standalone: false });

  // Warm the most-used routes while the browser is idle — navigation feels instant.
  useEffect(() => {
    idle(() => {
      import('@/pages/POS');
      import('@/pages/Inventory');
      import('@/pages/Sales');
      idle(() => {
        import('@/pages/Customers');
        import('@/pages/Insights');
        import('@/pages/Ledger');
        import('@/pages/DayClose');
      }, 3000);
    }, 2000);
  }, []);

  useEffect(() => {
    setPwa({ install: canInstall(), update: hasUpdate(), standalone: isStandalone() });
    const off = onPwaChange(() =>
      setPwa({ install: canInstall(), update: hasUpdate(), standalone: isStandalone() }),
    );
    return () => {
      off();
    };
  }, []);

  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    applyTheme(settings);
  }, [settings.theme, settings.accent, settings.density, settings.fontScale]);

  useEffect(() => {
    setSidebar(false);
  }, [loc.pathname]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useHotkeys({
    'mod+k': (e) => {
      e.preventDefault();
      setPalette(true);
    },
    f1: (e) => {
      e.preventDefault();
      nav('/pos');
    },
    f2: (e) => {
      e.preventDefault();
      nav('/inventory');
    },
    f3: (e) => {
      e.preventDefault();
      nav('/customers');
    },
    f4: (e) => {
      e.preventDefault();
      nav('/reports');
    },
    'mod+/': (e) => {
      e.preventDefault();
      nav('/help');
    },
    'mod+b': (e) => {
      e.preventDefault();
      setCalc(true);
    },
  });

  const alerts =
    useLiveQuery(
      () =>
        db.products
          .filter(
            (p: any) =>
              p.active &&
              (stockState(p) !== 'ok' || expiryState(p, settings.expiryAlertDays) !== 'fresh'),
          )
          .count(),
      [settings.expiryAlertDays],
      0,
    ) || 0;

  const current = NAV.find((n) => n.path === loc.pathname);

  const cartTotals = computeTotals(cart.lines, {
    billDiscount: cart.billDiscount,
    billDiscountType: cart.billDiscountType,
    coupon: cart.coupon,
    taxInclusive: settings.taxInclusive,
    roundOff: settings.roundOff,
    roundMode: settings.roundMode,
    pointsRedeemed: cart.pointsRedeemed,
    pointValue: settings.pointValue,
  });

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-black text-ink select-none">
      {/* Sidebar (desktop) */}
      <aside className="no-scrollbar hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface/75 backdrop-blur-xl lg:flex">
        <Brand onOpenSystemModal={() => setSystemModalOpen(true)} />
        <NavList />
        <SidebarFooter onOpenPwaModal={() => setPwaModalOpen(true)} />
      </aside>

      {/* Drawer (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[90] lg:hidden"
          onMouseDown={(e) => e.target === e.currentTarget && setSidebar(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" />
          <aside className="no-scrollbar absolute inset-y-0 left-0 flex w-72 animate-slideup flex-col overflow-y-auto border-r border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pr-3">
              <Brand onOpenSystemModal={() => { setSidebar(false); setSystemModalOpen(true); }} />
              <button
                className="rounded-xl p-2 text-ink3 hover:bg-surface2 hover:text-ink"
                onClick={() => setSidebar(false)}
              >
                <X size={18} />
              </button>
            </div>
            <NavList />
            <SidebarFooter onOpenPwaModal={() => { setSidebar(false); setPwaModalOpen(true); }} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="no-print flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface/80 px-3 backdrop-blur-md safe-t">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="rounded-xl p-2 text-ink2 hover:bg-surface2 hover:text-ink active:scale-95 lg:hidden"
              onClick={() => { clickSound(); buzz('light'); setSidebar(true); }}
            >
              <Menu size={20} />
            </button>

            {/* Quick System Switcher Badge */}
            <button
              onClick={() => { clickSound(); buzz('light'); setSystemModalOpen(true); }}
              className="flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/10 px-2.5 py-1.5 text-xs font-bold text-brand hover:border-brand hover:bg-brand/20 transition active:scale-95 shadow-sm"
              title="Click to switch business system"
            >
              <span className="text-sm">{system.emoji}</span>
              <span className="hidden sm:inline font-extrabold">{system.short}</span>
              <span className="text-[10px] text-brand/80 font-mono hidden md:inline">▼</span>
            </button>

            <div className="min-w-0 hidden md:block">
              <h1 className="truncate text-sm font-extrabold tracking-tight text-ink">
                {current?.label ?? 'SwiftPOS Pro'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Command Palette */}
            <button
              onClick={() => { clickSound(); setPalette(true); }}
              className="hidden items-center gap-2 rounded-xl border border-line bg-surface2/60 px-3 py-1.5 text-xs font-semibold text-ink3 hover:border-brand/60 hover:text-ink md:flex transition"
            >
              <Search size={14} /> Search… <kbd className="rounded bg-surface border border-line px-1.5 py-0.5 text-[10px] font-mono text-ink2">⌘K</kbd>
            </button>

            <button
              onClick={() => { clickSound(); setPalette(true); }}
              className="rounded-xl p-2 text-ink2 hover:bg-surface2 md:hidden"
            >
              <Search size={18} />
            </button>

            {/* Calculator */}
            <button
              onClick={() => { clickSound(); setCalc(true); }}
              className="rounded-xl p-2 text-ink2 hover:bg-surface2 transition active:scale-95"
              title="Calculator (⌘B)"
            >
              <CalcIcon size={18} />
            </button>

            {/* Cloud Sync Status Pill */}
            <NavLink
              to="/cloud"
              className={cx(
                'hidden sm:flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition',
                cloudRunning
                  ? 'border-brand/50 bg-brand/15 text-brand animate-pulse'
                  : cloudOn
                  ? 'border-ok/40 bg-ok/10 text-ok'
                  : 'border-line bg-surface2/40 text-ink3',
              )}
              title={cloudOn ? 'Cloud Database Connected' : 'Local Offline Mode (Tap to connect DB)'}
            >
              <Cloud size={14} className={cloudRunning ? 'animate-spin' : ''} />
              <span className="hidden lg:inline text-[11px]">
                {cloudRunning ? 'Syncing…' : cloudOn ? 'Cloud Synced' : 'Offline Mode'}
              </span>
            </NavLink>

            {/* Inventory Alerts */}
            <NavLink
              to="/inventory?filter=alerts"
              className="relative rounded-xl p-2 text-ink2 hover:bg-surface2 transition"
              title="Stock & Expiry Alerts"
            >
              <Bell size={18} />
              {alerts > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-bad px-1 text-[9px] font-extrabold leading-none text-white shadow-sm">
                  {alerts}
                </span>
              )}
            </NavLink>

            {/* PWA Update Banner button */}
            {pwa.update && (
              <button
                onClick={applyUpdate}
                className="flex items-center gap-1 rounded-xl border border-ok/50 bg-ok/20 px-2.5 py-1 text-xs font-extrabold text-ok hover:bg-ok/30 animate-bounce"
                title="Update available — tap to reload"
              >
                <RefreshCw size={14} className="animate-spin" /> Update Ready
              </button>
            )}

            {/* PWA Install Button */}
            {!pwa.standalone && (
              <button
                onClick={() => { clickSound(); setPwaModalOpen(true); }}
                className="rounded-xl border border-brand/40 bg-brand/10 p-2 text-brand hover:bg-brand/20 transition active:scale-95"
                title="Install PWA App"
              >
                <Download size={17} />
              </button>
            )}

            {/* Sound Mute Toggle */}
            <button
              onClick={() => {
                const next = !settings.soundEnabled;
                settings.set({ soundEnabled: next });
                buzz('light');
              }}
              className="rounded-xl p-2 text-ink2 hover:bg-surface2 transition"
              title={settings.soundEnabled ? 'Sound FX Enabled' : 'Sound FX Muted'}
            >
              {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} className="text-ink3" />}
            </button>

            {/* App Lock PIN */}
            {settings.appLockPin && (
              <button
                onClick={() => setLocked(true)}
                className="rounded-xl p-2 text-ink2 hover:bg-surface2 transition"
                title="Lock Terminal"
              >
                <Lock size={17} />
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={() => settings.set({ theme: settings.theme === 'amoled' ? 'light' : 'amoled' })}
              className="rounded-xl p-2 text-ink2 hover:bg-surface2 transition"
            >
              {settings.theme === 'amoled' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Offline / Online icon */}
            <span
              className={cx('rounded-xl p-2 transition', online ? 'text-ok' : 'text-warn animate-pulse')}
              title={online ? 'Online' : 'Offline — Operating from Local IndexedDB'}
            >
              {online ? <Wifi size={16} /> : <WifiOff size={16} />}
            </span>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="no-scrollbar flex-1 overflow-y-auto bg-black">
          <div className="mx-auto w-full max-w-[1680px] p-2.5 pb-24 sm:p-4 lg:pb-6">
            <Outlet />
          </div>
        </main>

        {/* Bottom nav (mobile) */}
        <nav className="no-print safe-b fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-surface/90 backdrop-blur-xl lg:hidden shadow-floating">
          {BOTTOM_NAV.map((path) => {
            const item = NAV.find((n) => n.path === path)!;
            const Icon = item.icon;
            return (
              <NavLink
                key={path}
                to={path}
                onClick={() => { clickSound(); buzz('light'); }}
                className={({ isActive }) =>
                  cx(
                    'relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold transition-all',
                    isActive
                      ? 'text-brand'
                      : 'text-ink3 hover:text-ink2',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} className={isActive ? 'drop-shadow-[0_0_8px_rgba(var(--brand),0.6)]' : ''} />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand shadow-glow" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Floating cart pill on mobile when not on POS */}
        {cart.lines.length > 0 && loc.pathname !== '/pos' && (
          <button
            onClick={() => { clickSound(); buzz('medium'); nav('/pos'); }}
            className="no-print fixed bottom-18 right-4 z-40 flex items-center gap-2.5 rounded-full bg-brand px-4 py-3 text-sm font-extrabold text-black shadow-glow-lg transition active:scale-95 lg:bottom-6"
          >
            <ShoppingCart size={18} />
            <span>{cart.lines.length} items</span>
            <span className="rounded-full bg-black/20 px-2 py-0.5 font-mono text-xs">
              {money(cartTotals.total, settings.currency)}
            </span>
          </button>
        )}
      </div>

      <LockScreen />
      <Toasts />
      <CommandPalette />
      <Calculator />
      <QuickSystemModal open={systemModalOpen} onClose={() => setSystemModalOpen(false)} />
      <PwaInstallModal open={pwaModalOpen} onClose={() => setPwaModalOpen(false)} />
    </div>
  );
}

function Brand({ onOpenSystemModal }: { onOpenSystemModal: () => void }) {
  const s = useSettings();
  const { system } = useShop();

  return (
    <div className="flex items-center justify-between border-b border-line p-3.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/15 text-xl border border-brand/30 shadow-glow">
          {s.logoEmoji || '⚡'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold tracking-tight text-ink">{s.shopName}</p>
          <button
            onClick={onOpenSystemModal}
            className="flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
          >
            <span>{system.emoji} {system.short}</span>
            <span className="text-[9px] text-ink3">⇄</span>
          </button>
        </div>
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
    <div className="flex-1 space-y-4 px-2.5 py-3">
      {groups.map((g) => (
        <div key={g}>
          <p className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-ink3">{g}</p>
          <div className="space-y-0.5">
            {nav
              .filter((n) => n.group === g)
              .map((n) => {
                const Icon = n.icon;
                return (
                  <NavLink
                    key={n.path}
                    to={n.path}
                    end={n.path === '/'}
                    onClick={() => { clickSound(); buzz('light'); }}
                    className={({ isActive }) =>
                      cx(
                        'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-all duration-150',
                        isActive
                          ? 'bg-brand/15 text-brand border border-brand/40 shadow-sm'
                          : 'text-ink2 hover:bg-surface2 hover:text-ink',
                      )
                    }
                  >
                    <Icon size={16} />
                    <span>{n.label}</span>
                  </NavLink>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SidebarFooter({ onOpenPwaModal }: { onOpenPwaModal: () => void }) {
  return (
    <div className="border-t border-line p-3 space-y-2 bg-surface2/30">
      <button
        onClick={onOpenPwaModal}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-3 py-2 text-left text-xs font-bold text-ink2 hover:border-brand/40 hover:text-ink transition"
      >
        <span className="flex items-center gap-2">
          <Smartphone size={14} className="text-brand" /> Install Mobile App
        </span>
        <span className="text-[10px] text-brand">PWA</span>
      </button>

      <div className="flex items-center justify-between px-1 text-[10px] text-ink3 font-mono">
        <span>SwiftPOS Pro v14.0</span>
        <span className="text-ok font-bold">● Production</span>
      </div>
    </div>
  );
}
