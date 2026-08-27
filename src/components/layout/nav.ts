import {
  LayoutDashboard, ShoppingCart, Package, Users, ReceiptText, Truck,
  Wallet, BarChart3, Ticket, UserCog, Settings, Boxes, Clock, HelpCircle, Utensils,
} from 'lucide-react';

export interface NavItem { path: string; label: string; icon: any; group: string; hint?: string }

export const NAV: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Main', hint: 'KPIs & live overview' },
  { path: '/pos', label: 'Billing', icon: ShoppingCart, group: 'Main', hint: 'Point of sale terminal' },
  { path: '/inventory', label: 'Inventory', icon: Package, group: 'Main', hint: 'Products & stock' },
  { path: '/sales', label: 'Sales', icon: ReceiptText, group: 'Main', hint: 'Invoice history' },
  { path: '/customers', label: 'Customers', icon: Users, group: 'Relations', hint: 'CRM & loyalty' },
  { path: '/vendors', label: 'Vendors', icon: Boxes, group: 'Relations', hint: 'Suppliers & payables' },
  { path: '/purchases', label: 'Purchases', icon: Truck, group: 'Relations', hint: 'Purchase orders' },
  { path: '/expenses', label: 'Expenses', icon: Wallet, group: 'Money', hint: 'Costs & cash out' },
  { path: '/reports', label: 'Reports', icon: BarChart3, group: 'Money', hint: 'Analytics & GST' },
  { path: '/offers', label: 'Offers', icon: Ticket, group: 'Money', hint: 'Coupons & loyalty' },
  { path: '/tables', label: 'Tables', icon: Utensils, group: 'Ops', hint: 'Restaurant floor' },
  { path: '/staff', label: 'Staff', icon: UserCog, group: 'Ops', hint: 'Users, shifts & PINs' },
  { path: '/activity', label: 'Activity', icon: Clock, group: 'Ops', hint: 'Audit log' },
  { path: '/settings', label: 'Settings', icon: Settings, group: 'System', hint: 'Store & preferences' },
  { path: '/help', label: 'Help', icon: HelpCircle, group: 'System', hint: 'Shortcuts & guide' },
];

export const BOTTOM_NAV = ['/', '/pos', '/inventory', '/customers', '/reports'];
