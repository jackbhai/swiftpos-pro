import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { seedIfEmpty } from './db/seed';
import { applyTheme, useSettings } from './store/settings';
import { initPWA } from './lib/pwa';
import ErrorBoundary from './components/layout/ErrorBoundary';
import { logSync } from './lib/cloud/doctor';

applyTheme(useSettings.getState());
seedIfEmpty().catch(console.error);
initPWA();

/* production telemetry stays local: every crash is written to the on-device log */
window.addEventListener('error', (e) => {
  logSync('error', `Runtime error: ${e.message} @ ${e.filename?.split('/').pop()}:${e.lineno}`, { table: 'app' });
});
window.addEventListener('unhandledrejection', (e: any) => {
  logSync('error', `Unhandled promise: ${e?.reason?.message || e?.reason || 'unknown'}`, { table: 'app' });
});
/* ask the browser to keep the shop's data safe from automatic eviction */
navigator.storage?.persist?.().catch(() => {});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
