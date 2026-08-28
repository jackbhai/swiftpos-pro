# Market launch checklist

## Product readiness
- [x] Typecheck, unit tests and production build pass in CI
- [x] Crash boundary + on-device crash log + self-repair
- [x] First-run onboarding wizard
- [x] Diagnostics screen with copyable support report
- [x] Backup, restore, compressed backup and auto-snapshot
- [x] Offline-first PWA with install prompt and update flow
- [x] 10 business systems verified end-to-end (fields, prints, defaults)
- [x] Cloud sync tested for Firebase, Supabase and custom REST shapes
- [ ] Field trial with 3–5 real shops for one full week (per system)
- [ ] Thermal printer test on 58mm and 80mm hardware
- [ ] Barcode scanner test (USB HID + phone camera)

## Legal & compliance
- [x] Privacy policy, terms of use, licence and refund policy in-app
- [x] SECURITY.md with disclosure process
- [ ] GST invoice format reviewed by a practising CA
- [ ] Drug-licence / schedule-H wording reviewed for pharmacy edition
- [ ] Company entity, GSTIN and support address filled into the legal pages

## Go-to-market
- [x] Landing page with pricing tiers and FAQ
- [ ] Pricing finalised per market (Starter / Pro / Enterprise)
- [ ] Payment + subscription provider connected (Razorpay/Stripe)
- [ ] Demo video (2 min) and 6 screenshots per system
- [ ] Play Store TWA listing (optional) and app-store assets
- [ ] Onboarding WhatsApp template + support hours published

## Operations
- [x] Deployment guide and rollback plan
- [x] Versioned service worker forces client updates
- [ ] Status/announcement channel for customers
- [ ] Backup policy communicated to every shop at onboarding
- [ ] Support rota and SLA defined
