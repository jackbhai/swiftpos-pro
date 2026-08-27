import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';

export const useProducts = () => useLiveQuery(() => db.products.toArray(), [], [] as any[]);
export const useCustomers = () => useLiveQuery(() => db.customers.toArray(), [], [] as any[]);
export const useSales = () => useLiveQuery(() => db.sales.orderBy('ts').reverse().toArray(), [], [] as any[]);
export const useVendors = () => useLiveQuery(() => db.vendors.toArray(), [], [] as any[]);
export const usePOs = () => useLiveQuery(() => db.purchaseOrders.orderBy('createdAt').reverse().toArray(), [], [] as any[]);
export const useExpenses = () => useLiveQuery(() => db.expenses.orderBy('ts').reverse().toArray(), [], [] as any[]);
export const useHolds = () => useLiveQuery(() => db.holds.orderBy('ts').reverse().toArray(), [], [] as any[]);
export const useCoupons = () => useLiveQuery(() => db.coupons.toArray(), [], [] as any[]);
export const useStaff = () => useLiveQuery(() => db.staff.toArray(), [], [] as any[]);
export const useShifts = () => useLiveQuery(() => db.shifts.orderBy('openedAt').reverse().toArray(), [], [] as any[]);
export const useActivity = () => useLiveQuery(() => db.activity.orderBy('ts').reverse().limit(200).toArray(), [], [] as any[]);
export const useStockLogs = () => useLiveQuery(() => db.stockLogs.orderBy('ts').reverse().limit(400).toArray(), [], [] as any[]);
export const useTables = () => useLiveQuery(() => db.restaurantTables.toArray(), [], [] as any[]);
