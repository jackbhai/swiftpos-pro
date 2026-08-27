import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const POS = lazy(() => import('@/pages/POS'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const Sales = lazy(() => import('@/pages/Sales'));
const Customers = lazy(() => import('@/pages/Customers'));
const Vendors = lazy(() => import('@/pages/Vendors'));
const Purchases = lazy(() => import('@/pages/Purchases'));
const Expenses = lazy(() => import('@/pages/Expenses'));
const Reports = lazy(() => import('@/pages/Reports'));
const Offers = lazy(() => import('@/pages/Offers'));
const Tables = lazy(() => import('@/pages/Tables'));
const Staff = lazy(() => import('@/pages/Staff'));
const Activity = lazy(() => import('@/pages/Activity'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const Help = lazy(() => import('@/pages/Help'));

export default function App() {
  return (
    <Suspense fallback={<div className="grid h-[100dvh] place-items-center bg-amoled"><Spinner /></div>}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<Help />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
