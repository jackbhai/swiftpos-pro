/** Shop-type profiles: one app, many businesses.
 *  Each profile re-labels the UI, toggles modules and seeds sensible defaults. */

export type ShopTypeId =
  | 'grocery' | 'pharmacy' | 'restaurant' | 'cafe' | 'bakery' | 'retail'
  | 'electronics' | 'fashion' | 'salon' | 'hardware' | 'stationery' | 'general';

export interface ShopProfile {
  id: ShopTypeId;
  label: string;
  emoji: string;
  blurb: string;
  /** UI wording */
  terms: {
    product: string; products: string; category: string;
    sale: string; sales: string; customer: string; customers: string;
    stock: string; vendor: string;
  };
  /** feature switches */
  modules: {
    tables: boolean;        // restaurant floor / KOT
    batchExpiry: boolean;   // pharma / food
    prescription: boolean;  // pharmacy Rx capture
    serialNumbers: boolean; // electronics IMEI / serial
    variants: boolean;      // size / colour
    kitchenNote: boolean;   // per-line cooking note
    appointments: boolean;  // salon bookings
    weighScale: boolean;    // kg / loose items
    warranty: boolean;      // warranty months
    loyalty: boolean;
  };
  defaultGst: number;
  units: string[];
  categories: string[];
  quickCash: number[];
  posLayout: 'grid' | 'list';
  accent: 'cyan' | 'mint' | 'violet' | 'amber' | 'rose' | 'lime';
}

const base = (p: Partial<ShopProfile['modules']> = {}): ShopProfile['modules'] => ({
  tables: false, batchExpiry: false, prescription: false, serialNumbers: false,
  variants: false, kitchenNote: false, appointments: false, weighScale: false,
  warranty: false, loyalty: true, ...p,
});

export const SHOP_PROFILES: ShopProfile[] = [
  {
    id: 'grocery', label: 'Grocery / Kirana / Supermarket', emoji: '🛒',
    blurb: 'Barcode billing, loose weight items, fast repeat baskets.',
    terms: { product: 'Product', products: 'Products', category: 'Category', sale: 'Bill', sales: 'Bills', customer: 'Customer', customers: 'Customers', stock: 'Stock', vendor: 'Supplier' },
    modules: base({ batchExpiry: true, weighScale: true }),
    defaultGst: 5, units: ['pc', 'kg', 'g', 'l', 'ml', 'pack', 'box', 'dozen'],
    categories: ['Grocery', 'Beverages', 'Snacks', 'Dairy', 'Bakery', 'Personal Care', 'Household', 'Frozen'],
    quickCash: [50, 100, 200, 500, 2000], posLayout: 'grid', accent: 'cyan',
  },
  {
    id: 'pharmacy', label: 'Medical Store / Pharmacy', emoji: '💊',
    blurb: 'Batch + expiry tracking, salt/composition search, Rx notes, schedule-H flags.',
    terms: { product: 'Medicine', products: 'Medicines', category: 'Segment', sale: 'Bill', sales: 'Bills', customer: 'Patient', customers: 'Patients', stock: 'Stock', vendor: 'Distributor' },
    modules: base({ batchExpiry: true, prescription: true }),
    defaultGst: 12, units: ['strip', 'tablet', 'bottle', 'tube', 'pc', 'box', 'vial', 'ml'],
    categories: ['Tablets', 'Syrups', 'Injections', 'Ointments', 'Ayurveda', 'Surgical', 'Baby Care', 'Wellness', 'OTC'],
    quickCash: [50, 100, 200, 500, 1000], posLayout: 'list', accent: 'mint',
  },
  {
    id: 'restaurant', label: 'Restaurant / Dhaba', emoji: '🍽️',
    blurb: 'Table floor plan, KOT notes, dine-in / takeaway / delivery channels.',
    terms: { product: 'Dish', products: 'Menu', category: 'Course', sale: 'Order', sales: 'Orders', customer: 'Guest', customers: 'Guests', stock: 'Portions', vendor: 'Supplier' },
    modules: base({ tables: true, kitchenNote: true, variants: true }),
    defaultGst: 5, units: ['plate', 'half', 'full', 'pc', 'glass', 'bowl'],
    categories: ['Starters', 'Main Course', 'Breads', 'Rice & Biryani', 'Chinese', 'Desserts', 'Beverages', 'Combos'],
    quickCash: [100, 200, 500, 1000, 2000], posLayout: 'grid', accent: 'amber',
  },
  {
    id: 'cafe', label: 'Cafe / Juice Bar / QSR', emoji: '☕',
    blurb: 'Fast counter service, size variants, add-on notes, takeaway first.',
    terms: { product: 'Item', products: 'Menu', category: 'Section', sale: 'Order', sales: 'Orders', customer: 'Guest', customers: 'Guests', stock: 'Stock', vendor: 'Supplier' },
    modules: base({ variants: true, kitchenNote: true, tables: true }),
    defaultGst: 5, units: ['cup', 'regular', 'large', 'pc', 'glass'],
    categories: ['Hot Coffee', 'Cold Coffee', 'Shakes', 'Juices', 'Sandwiches', 'Bakery', 'Combos'],
    quickCash: [50, 100, 200, 500], posLayout: 'grid', accent: 'violet',
  },
  {
    id: 'bakery', label: 'Bakery / Sweet Shop', emoji: '🧁',
    blurb: 'Weight based billing, same-day expiry, custom cake orders.',
    terms: { product: 'Item', products: 'Items', category: 'Category', sale: 'Bill', sales: 'Bills', customer: 'Customer', customers: 'Customers', stock: 'Stock', vendor: 'Supplier' },
    modules: base({ weighScale: true, batchExpiry: true, variants: true }),
    defaultGst: 5, units: ['kg', 'g', 'pc', 'box', 'dozen'],
    categories: ['Cakes', 'Pastries', 'Cookies', 'Breads', 'Sweets', 'Namkeen', 'Chocolates'],
    quickCash: [50, 100, 200, 500, 1000], posLayout: 'grid', accent: 'rose',
  },
  {
    id: 'retail', label: 'General Retail Store', emoji: '🏪',
    blurb: 'Everyday retail with barcode, MRP and margin control.',
    terms: { product: 'Product', products: 'Products', category: 'Category', sale: 'Bill', sales: 'Bills', customer: 'Customer', customers: 'Customers', stock: 'Stock', vendor: 'Supplier' },
    modules: base({}),
    defaultGst: 18, units: ['pc', 'pack', 'box', 'set'],
    categories: ['General', 'Home', 'Gifts', 'Toys', 'Seasonal'],
    quickCash: [100, 200, 500, 2000], posLayout: 'grid', accent: 'cyan',
  },
  {
    id: 'electronics', label: 'Electronics / Mobile Shop', emoji: '📱',
    blurb: 'Serial / IMEI capture, warranty months, high-value invoices.',
    terms: { product: 'Product', products: 'Products', category: 'Category', sale: 'Invoice', sales: 'Invoices', customer: 'Customer', customers: 'Customers', stock: 'Stock', vendor: 'Distributor' },
    modules: base({ serialNumbers: true, warranty: true, variants: true }),
    defaultGst: 18, units: ['pc', 'set', 'box'],
    categories: ['Mobiles', 'Laptops', 'Audio', 'Accessories', 'Appliances', 'Cables', 'Storage'],
    quickCash: [500, 1000, 2000, 5000, 10000], posLayout: 'list', accent: 'violet',
  },
  {
    id: 'fashion', label: 'Clothing / Footwear', emoji: '👕',
    blurb: 'Size & colour variants, exchange friendly, seasonal categories.',
    terms: { product: 'Article', products: 'Catalogue', category: 'Category', sale: 'Bill', sales: 'Bills', customer: 'Customer', customers: 'Customers', stock: 'Stock', vendor: 'Brand' },
    modules: base({ variants: true }),
    defaultGst: 12, units: ['pc', 'pair', 'set'],
    categories: ['Men', 'Women', 'Kids', 'Footwear', 'Accessories', 'Winter Wear'],
    quickCash: [500, 1000, 2000, 5000], posLayout: 'grid', accent: 'rose',
  },
  {
    id: 'salon', label: 'Salon / Spa / Clinic', emoji: '💇',
    blurb: 'Service billing, staff commission, appointments and packages.',
    terms: { product: 'Service', products: 'Services', category: 'Type', sale: 'Bill', sales: 'Bills', customer: 'Client', customers: 'Clients', stock: 'Inventory', vendor: 'Supplier' },
    modules: base({ appointments: true, variants: true }),
    defaultGst: 18, units: ['session', 'pc', 'ml', 'package'],
    categories: ['Hair', 'Skin', 'Nails', 'Spa', 'Grooming', 'Packages', 'Products'],
    quickCash: [200, 500, 1000, 2000], posLayout: 'list', accent: 'violet',
  },
  {
    id: 'hardware', label: 'Hardware / Auto Parts', emoji: '🔧',
    blurb: 'Part numbers, rack locations, bulk quantity and vendor payables.',
    terms: { product: 'Part', products: 'Parts', category: 'Category', sale: 'Bill', sales: 'Bills', customer: 'Customer', customers: 'Customers', stock: 'Stock', vendor: 'Supplier' },
    modules: base({ warranty: true, weighScale: true }),
    defaultGst: 18, units: ['pc', 'kg', 'm', 'ft', 'box', 'set'],
    categories: ['Tools', 'Fasteners', 'Electrical', 'Plumbing', 'Paint', 'Auto Parts', 'Safety'],
    quickCash: [100, 500, 1000, 2000], posLayout: 'list', accent: 'amber',
  },
  {
    id: 'stationery', label: 'Stationery / Book Store', emoji: '📚',
    blurb: 'ISBN / SKU search, school kits, bulk discounts.',
    terms: { product: 'Item', products: 'Items', category: 'Category', sale: 'Bill', sales: 'Bills', customer: 'Customer', customers: 'Customers', stock: 'Stock', vendor: 'Publisher' },
    modules: base({}),
    defaultGst: 12, units: ['pc', 'pack', 'set', 'dozen'],
    categories: ['Books', 'Notebooks', 'Pens', 'Art', 'Office', 'School Kits'],
    quickCash: [50, 100, 200, 500], posLayout: 'grid', accent: 'lime',
  },
  {
    id: 'general', label: 'Other / Custom Business', emoji: '⚙️',
    blurb: 'Neutral wording with every module available to switch on manually.',
    terms: { product: 'Item', products: 'Items', category: 'Category', sale: 'Bill', sales: 'Bills', customer: 'Customer', customers: 'Customers', stock: 'Stock', vendor: 'Vendor' },
    modules: base({ variants: true, batchExpiry: true }),
    defaultGst: 18, units: ['pc', 'kg', 'l', 'box', 'set', 'hour'],
    categories: ['General'],
    quickCash: [100, 500, 1000, 2000], posLayout: 'grid', accent: 'cyan',
  },
];

export const getProfile = (id: ShopTypeId): ShopProfile =>
  SHOP_PROFILES.find((p) => p.id === id) ?? SHOP_PROFILES[0];
