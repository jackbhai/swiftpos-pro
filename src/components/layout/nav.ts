import {
  LayoutDashboard, ShoppingCart, Package, Users, ReceiptText, Truck,
  Wallet, BarChart3, Ticket, UserCog, Settings, Boxes, Clock, HelpCircle, Utensils, Tag,
  Undo2, FileText, CalendarCheck, ClipboardList, MessageCircle,
  BookUser, ChefHat, CalendarClock, CookingPot, Repeat, Sparkles,
} from 'lucide-react';

export interface NavItem { path: string; label: string; icon: any; group: string; hint?: string }

export const NAV: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Main', hint: 'KPIs & live overview' },
  { path: '/pos', label: 'Billing', icon: ShoppingCart, group: 'Main', hint: 'Point of sale terminal' },
  { path: '/inventory', label: 'Inventory', icon: Package, group: 'Main', hint: 'Products & stock' },
  { path: '/sales', label: 'Sales', icon: ReceiptText, group: 'Main', hint: 'Invoice history' },
  { path: '/returns', label: 'Returns', icon: Undo2, group: 'Main', hint: 'Refunds & exchange' },
  { path: '/orders', label: 'Orders', icon: ChefHat, group: 'Main', hint: 'Delivery & kitchen display' },
  { path: '/insights', label: 'Insights', icon: Sparkles, group: 'Main', hint: 'What to fix next' },
  { path: '/customers', label: 'Customers', icon: Users, group: 'Relations', hint: 'CRM & loyalty' },
  { path: '/vendors', label: 'Vendors', icon: Boxes, group: 'Relations', hint: 'Suppliers & payables' },
  { path: '/purchases', label: 'Purchases', icon: Truck, group: 'Relations', hint: 'Purchase orders' },
  { path: '/ledger', label: 'Khata', icon: BookUser, group: 'Money', hint: 'Dues, payables & statements' },
  { path: '/subscriptions', label: 'Subscriptions', icon: Repeat, group: 'Money', hint: 'Repeat & recurring orders' },
  { path: '/expenses', label: 'Expenses', icon: Wallet, group: 'Money', hint: 'Costs & cash out' },
  { path: '/reports', label: 'Reports', icon: BarChart3, group: 'Money', hint: 'Analytics & GST' },
  { path: '/quotes', label: 'Quotes', icon: FileText, group: 'Money', hint: 'Estimates & proforma' },
  { path: '/dayclose', label: 'Day Close', icon: CalendarCheck, group: 'Money', hint: 'Z-report & cash count' },
  { path: '/offers', label: 'Offers', icon: Ticket, group: 'Money', hint: 'Coupons & loyalty' },
  { path: '/labels', label: 'Labels', icon: Tag, group: 'Ops', hint: 'Barcode & price tags' },
  { path: '/stocktake', label: 'Stock Take', icon: ClipboardList, group: 'Ops', hint: 'Physical count & audit' },
  { path: '/reminders', label: 'Reminders', icon: MessageCircle, group: 'Ops', hint: 'Bulk WhatsApp dues' },
  { path: '/tables', label: 'Tables', icon: Utensils, group: 'Ops', hint: 'Restaurant floor' },
  { path: '/recipes', label: 'Recipes', icon: CookingPot, group: 'Ops', hint: 'BOM, combos & production' },
  { path: '/attendance', label: 'Attendance', icon: CalendarClock, group: 'Ops', hint: 'Punch in/out & payroll' },
  { path: '/staff', label: 'Staff', icon: UserCog, group: 'Ops', hint: 'Users, shifts & PINs' },
  { path: '/activity', label: 'Activity', icon: Clock, group: 'Ops', hint: 'Audit log' },
  { path: '/settings', label: 'Settings', icon: Settings, group: 'System', hint: 'Store & preferences' },
  { path: '/help', label: 'Help', icon: HelpCircle, group: 'System', hint: 'Shortcuts & guide' },
];

export const BOTTOM_NAV = ['/', '/pos', '/inventory', '/customers', '/reports'];
