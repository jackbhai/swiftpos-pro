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
const Labels = lazy(() => import('@/pages/Labels'));
const Returns = lazy(() => import('@/pages/Returns'));
const Quotes = lazy(() => import('@/pages/Quotes'));
const DayClose = lazy(() => import('@/pages/DayClose'));
const StockTake = lazy(() => import('@/pages/StockTake'));
const Reminders = lazy(() => import('@/pages/Reminders'));
const Ledger = lazy(() => import('@/pages/Ledger'));
const Orders = lazy(() => import('@/pages/Orders'));
const Attendance = lazy(() => import('@/pages/Attendance'));
const Recipes = lazy(() => import('@/pages/Recipes'));
const Subscriptions = lazy(() => import('@/pages/Subscriptions'));
const Insights = lazy(() => import('@/pages/Insights'));
const Branches = lazy(() => import('@/pages/Branches'));
const Service = lazy(() => import('@/pages/Service'));
const Appointments = lazy(() => import('@/pages/Appointments'));
const TaxCenter = lazy(() => import('@/pages/TaxCenter'));
const Cleanup = lazy(() => import('@/pages/Cleanup'));
const Staff = lazy(() => import('@/pages/Staff'));
const Activity = lazy(() => import('@/pages/Activity'));
const Loyalty = lazy(() => import('@/pages/Loyalty'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const WriteOff = lazy(() => import('@/pages/WriteOff'));
const Targets = lazy(() => import('@/pages/Targets'));
const Tasks = lazy(() => import('@/pages/Tasks'));
const Display = lazy(() => import('@/pages/Display'));
const Menu = lazy(() => import('@/pages/Menu'));
const AutoPO = lazy(() => import('@/pages/AutoPO'));
const FeedbackPage = lazy(() => import('@/pages/Feedback'));
const Simulator = lazy(() => import('@/pages/Simulator'));
const Campaigns = lazy(() => import('@/pages/Campaigns'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const Features = lazy(() => import('@/pages/Features'));
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
          <Route path="/labels" element={<Labels />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/dayclose" element={<DayClose />} />
          <Route path="/stocktake" element={<StockTake />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/service" element={<Service />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/tax" element={<TaxCenter />} />
          <Route path="/cleanup" element={<Cleanup />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/loyalty" element={<Loyalty />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/writeoff" element={<WriteOff />} />
          <Route path="/targets" element={<Targets />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/display" element={<Display />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/autopo" element={<AutoPO />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/features" element={<Features />} />
          <Route path="/help" element={<Help />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
