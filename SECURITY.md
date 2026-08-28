# Security policy

## Where data lives
SwiftPOS Pro is offline-first. All business data is stored in the browser's IndexedDB
on the device that created it. Settings live in localStorage. Nothing is transmitted
anywhere unless the shop owner explicitly configures cloud sync.

## Cloud sync
Cloud credentials (Firebase API key, Supabase anon key, REST bearer token) are stored
only on the device, in localStorage, and are sent only to the endpoint the owner
configured. There is no vendor proxy and no shared backend.

Recommendations for production deployments:
- Supabase: keep Row Level Security enabled and scope the policy to an authenticated role.
- Firebase: restrict the Web API key by HTTP referrer and write Firestore rules.
- Custom REST: terminate TLS, require a bearer token, and rate-limit the sync endpoints.

## Device security
- Enable the app-lock PIN (Settings → Security) on shared counters.
- Enable auto-lock after N minutes for unattended tills.
- Use staff PINs and roles so cashiers cannot see cost prices or issue refunds.
- Turn on "Data ko permanent banaiye" in Diagnostics so the browser cannot evict data.

## Backups
Export a backup (Settings → Backup) daily, or connect a cloud database. A device loss
or a cleared browser profile deletes local data permanently.

## Reporting a vulnerability
Email the maintainer with the steps to reproduce and the diagnostic report from
Settings → Diagnostics → Copy report. Please do not open a public issue for security
problems. Expect an acknowledgement within 72 hours.
