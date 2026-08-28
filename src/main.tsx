import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { seedIfEmpty } from './db/seed';
import { applyTheme, useSettings } from './store/settings';
import { initPWA } from './lib/pwa';
import ErrorBoundary from './components/layout/ErrorBoundary';

applyTheme(useSettings.getState());
seedIfEmpty().catch(console.error);
initPWA();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
