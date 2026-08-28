import { useState } from 'react';
import { Scale, ShieldCheck, FileText, Cookie, Mail } from 'lucide-react';
import { Card, Tabs, SectionTitle, Badge } from '@/components/ui';
import { useSettings } from '@/store/settings';

const UPDATED = '28 August 2026';

/** Privacy policy, terms of use and licence — required before any public launch. */
export default function Legal() {
  const s = useSettings();
  const [tab, setTab] = useState<'privacy' | 'terms' | 'licence'>('privacy');
  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle title="Legal & privacy" sub={`Last updated: ${UPDATED} · applies to SwiftPOS Pro`}
          right={<Badge tone="ok"><ShieldCheck size={10} /> Offline-first, data stays on your device</Badge>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'privacy', label: 'Privacy policy' }, { id: 'terms', label: 'Terms of use' }, { id: 'licence', label: 'Licence & refunds' },
        ]} />
      </Card>

      {tab === 'privacy' && (
        <Card>
          <H icon={<ShieldCheck size={15} />}>What we collect</H>
          <P><b>Nothing.</b> SwiftPOS Pro has no analytics, no trackers, no ad SDKs and no telemetry. Your products, bills, customers and settings are stored only in this device's browser database (IndexedDB) and in the backup files you export yourself.</P>
          <H icon={<Cookie size={15} />}>Cookies</H>
          <P>No cookies are set. Preferences are kept in localStorage on your own device so the app remembers your theme, system and settings.</P>
          <H icon={<FileText size={15} />}>Cloud sync (optional, off by default)</H>
          <P>If you connect Firebase, Supabase or your own REST API on the Cloud screen, your data is sent <b>directly from your browser to your own database</b>. We never see it, never proxy it and never store your keys — the keys live only on your device. Disconnecting stops all transfer immediately.</P>
          <H icon={<Mail size={15} />}>Messaging</H>
          <P>WhatsApp / SMS features simply open your own installed app with pre-filled text. No message ever passes through our servers.</P>
          <H icon={<ShieldCheck size={15} />}>Your rights</H>
          <P>You can export everything (Settings → Backup), delete everything (Settings → Backup → Wipe), or uninstall the app — no account, no server-side copy, nothing left behind. For any privacy question write to {s.email || 'the shop owner / distributor you bought this from'}.</P>
          <H icon={<FileText size={15} />}>Data safety notes</H>
          <P>Because data lives on the device, keep automatic backups on and, if you handle large volumes, connect a cloud database. Clearing browser storage or uninstalling the browser profile deletes local data permanently.</P>
        </Card>
      )}

      {tab === 'terms' && (
        <Card>
          <H icon={<Scale size={15} />}>Acceptance</H>
          <P>By using SwiftPOS Pro you agree to these terms. If you do not agree, stop using the app and delete it.</P>
          <H icon={<FileText size={15} />}>Permitted use</H>
          <P>You may use the app to run your business, on as many devices as you own, for as many bills as you need. You may not resell, sublicense or rebrand the software without a written distribution agreement.</P>
          <H icon={<Scale size={15} />}>Your responsibilities</H>
          <P>You are responsible for the accuracy of invoices, tax rates, GST filings, drug-licence rules, food-safety rules and any other regulation that applies to your trade. The app provides tools and reports; it does not provide legal, tax or medical advice.</P>
          <H icon={<ShieldCheck size={15} />}>Backups</H>
          <P>You are responsible for taking backups. Keep automatic backup reminders on and export a backup file regularly. Loss of a device, cleared browser storage or an uninstall can permanently delete local data.</P>
          <H icon={<Scale size={15} />}>Warranty & liability</H>
          <P>The software is provided "as is", without warranty of any kind. To the maximum extent permitted by law, the authors are not liable for lost profits, lost data, or any indirect or consequential damages arising from use of the app.</P>
          <H icon={<FileText size={15} />}>Changes</H>
          <P>Features may change between versions. Material changes are listed in the in-app changelog and the FEATURES index.</P>
        </Card>
      )}

      {tab === 'licence' && (
        <Card>
          <H icon={<Scale size={15} />}>Licence</H>
          <P>SwiftPOS Pro is licensed, not sold. A licence covers one business (unlimited devices for that business). Source code, where provided, may be modified for your own internal use.</P>
          <H icon={<FileText size={15} />}>Editions</H>
          <P><b>Free / Starter</b> — full offline POS, inventory, billing, reports. <b>Pro</b> — cloud sync, multi-device, campaigns, advanced analytics. <b>Enterprise</b> — multi-branch, custom systems, priority support and onboarding.</P>
          <H icon={<ShieldCheck size={15} />}>Refunds</H>
          <P>Paid plans can be cancelled within 7 days of purchase for a full refund if the software does not work as described on your device. Refund requests after 7 days are handled case by case.</P>
          <H icon={<Mail size={15} />}>Support</H>
          <P>Support is provided over WhatsApp and email during business hours. Before writing, open <b>Settings → Diagnostics</b> and copy the diagnostic report — it makes fixes much faster.</P>
          <H icon={<FileText size={15} />}>Third-party notices</H>
          <P>Built with React, Vite, Dexie, Zustand, Recharts, Tailwind CSS, Lucide icons and the qrcode library, each under its own open-source licence.</P>
        </Card>
      )}
    </div>
  );
}

const H = ({ icon, children }: any) => (
  <p className="mt-4 flex items-center gap-2 text-sm font-bold text-ink first:mt-0"><span className="text-brand">{icon}</span>{children}</p>
);
const P = ({ children }: any) => <p className="mt-1 text-xs leading-relaxed text-ink2">{children}</p>;
