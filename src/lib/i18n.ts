import { useSettings } from '@/store/settings';

const HI: Record<string, string> = {
  Dashboard: 'डैशबोर्ड', Billing: 'बिलिंग', Inventory: 'स्टॉक', Sales: 'बिक्री', Customers: 'ग्राहक',
  Vendors: 'सप्लायर', Purchases: 'ख़रीद', Expenses: 'ख़र्च', Reports: 'रिपोर्ट', Offers: 'ऑफ़र',
  Labels: 'लेबल', Tables: 'टेबल', Staff: 'स्टाफ़', Activity: 'गतिविधि', Settings: 'सेटिंग्स', Help: 'मदद',
  Returns: 'वापसी', Quotes: 'कोटेशन', 'Day Close': 'दिन बंद', 'Stock Take': 'स्टॉक गिनती', Reminders: 'रिमाइंडर',
  Revenue: 'कुल बिक्री', Profit: 'मुनाफ़ा', Orders: 'ऑर्डर', Total: 'कुल', Subtotal: 'उप-योग',
  Discount: 'छूट', Cash: 'नक़द', Charge: 'चार्ज', Search: 'खोजें', Add: 'जोड़ें', Save: 'सेव', Print: 'प्रिंट',
  Today: 'आज', 'Low stock': 'कम स्टॉक', 'Out of stock': 'स्टॉक ख़त्म', Expenses_: 'ख़र्च',
};

export function t(key: string): string {
  const lang = useSettings.getState().language;
  if (lang === 'hi') return HI[key] ?? key;
  return key;
}

export function useT() {
  const lang = useSettings((s) => s.language);
  return (key: string) => (lang === 'hi' ? HI[key] ?? key : key);
}
