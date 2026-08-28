# Deployment guide

## Requirements
- Node.js 20+
- Any static host (GitHub Pages, Netlify, Vercel, Nginx, S3+CloudFront)

## Build
```bash
npm ci
npm run verify      # typecheck + unit tests + production build
```
The static site is emitted to `dist/`.

## Hosting notes
- The app uses **hash routing**, so no server rewrite rules are required.
- `base` is `./`, so it works from a sub-path (e.g. `example.com/pos/`).
- Serve over **HTTPS** — the service worker, camera scanner and PWA install need it.
- Recommended headers:
  - `Cache-Control: no-cache` for `index.html` and `sw.js`
  - `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`
  - `Content-Security-Policy` allowing `self`, your cloud endpoint and `data:` images
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`

## Releasing a new version
1. Update `package.json` version and `CHANGELOG.md`.
2. Bump `VERSION` in `public/sw.js` (e.g. `swiftpos-v13-0`) — this forces every device to update.
3. Copy `FEATURES.md` to `public/features.md` so the in-app index matches.
4. Push to `main`; CI runs typecheck → tests → build, then GitHub Pages deploys.
5. Verify: site returns 200, `sw.js` shows the new version, Diagnostics shows the new commit.

## Rollback
Re-run the previous successful "Deploy to GitHub Pages" workflow, or `git revert` the
release commit and push. Client devices pick up the change on the next SW update check.
