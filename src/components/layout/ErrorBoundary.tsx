import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download } from 'lucide-react';

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) {
    console.error('SwiftPOS crash:', error, info);
    import('@/lib/cloud/doctor').then(({ logSync }) =>
      logSync('error', `App crash: ${error.message}`, { table: 'app' })).catch(() => {});
  }

  render() {
    if (!this.state.error) return this.props.children;
    const err = this.state.error as Error;
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-black p-6 text-center">
        <div className="max-w-md space-y-3">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bad/15 text-bad"><AlertTriangle size={26} /></div>
          <h1 className="text-lg font-extrabold text-ink">Something went wrong</h1>
          <p className="text-sm text-ink3">Your data is safe — it lives in this device's local database. Reload to continue.</p>
          <pre className="max-h-32 overflow-auto rounded-xl border border-line bg-surface p-3 text-left font-mono text-[10px] text-ink3">{err.message}</pre>
          <div className="flex justify-center gap-2">
            <button className="btn-primary" onClick={() => location.reload()}><RefreshCw size={15} /> Reload app</button>
            <button className="btn-ghost" onClick={async () => { const { exportBackup } = await import('@/lib/backup'); exportBackup(); }}><Download size={15} /> Backup data</button>
            <button className="btn-ghost" onClick={async () => { const { repairLocalDb } = await import('@/lib/cloud/doctor'); await repairLocalDb(); location.reload(); }}>Repair &amp; reload</button>
          </div>
        </div>
      </div>
    );
  }
}
