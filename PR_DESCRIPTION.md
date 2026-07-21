# fix: harden security-sensitive tools and production quality gates

## Description

This change hardens IT Tools before the next release. It fixes misleading security results, unsafe random generation and output injection, bounds expensive browser work, improves keyboard and screen-reader behavior, and makes production builds, caching, CI, and dependency versions reproducible.

### Security and correctness

- Generate tokens and TOTP secrets with `crypto.getRandomValues()` and unbiased rejection sampling.
- Generate 160-bit TOTP secrets, enforce RSA keys of at least 2048 bits, and default RSA generation to 3072 bits.
- Replace legacy passphrase encryption with a versioned AES-256-GCM envelope using PBKDF2-SHA-256, random salt/nonce, authenticated metadata, and explicit legacy-format rejection.
- Label CryptoJS SHA-3 output correctly as Keccak-512 and HMAC-Keccak-512.
- Stop presenting PDF certificate metadata as trusted identity verification; show integrity, authenticity, expiry, and verification limitations explicitly.
- Mark JWT data as unverified and explain that parsing does not validate signatures, issuer, audience, or expiry.
- Escape generated meta tags and SVG text, emit valid Open Graph/Twitter `content` attributes, serialize RFC 4180 CSV, and protect spreadsheet formulas by default.
- Fix extension-to-MIME lookup for raw Base64 downloads.
- Upgrade vulnerable runtime dependencies and constrain vulnerable transitive versions.

### Stability, privacy, and accessibility

- Run bcrypt, MathJS, regex evaluation, MAC vendor lookup, and tokenization work outside the main UI path where appropriate; add time, size, and cost limits.
- Cancel pending worker work on navigation, recover cleanly from worker failures, cap tokenizer input at 50,000 characters, and keep camera recorder state synchronized with browser stop/error events.
- Prevent empty-result crashes in the command palette and select component.
- Add dialog, combobox/listbox, tooltip, button, icon-label, focus-trap, and keyboard semantics.
- Remove nested interactive controls from tool cards and restore a meaningful heading hierarchy.
- Request camera and optional microphone permissions only after separate user actions.
- Stop persisting JSON, YAML, SQL, and PHP input content in `localStorage`; old persisted values are removed on first load while display preferences remain stored.

### Production, performance, and CI

- Exclude the component demo library from production routing and bundling.
- Lazy-load locales and Monaco, dispose editor models/workers, defer the OUI database to a worker, and make superseded tokenizer work abortable with cache and error recovery.
- Scope PWA URLs to `BASE_URL`, keep the app shell small, and runtime-cache immutable tool chunks.
- Add Nginx compression, immutable asset caching, and no-cache headers for the app shell/service worker.
- Align Node 24.18.0, its TypeScript configuration/types, pnpm, Vue runtime/compiler, and Docker/CI versions; use Nginx 1.30.4 for the production image.
- Pin GitHub Actions to immutable commit SHAs and update Playwright to 1.61.1 so CI validates current Chromium, Firefox, and WebKit builds.
- Refresh Browserslist compatibility data so production targeting is based on current browser usage data.
- Reuse one production build across Playwright shards and correct browser cache keys/artifacts.
- Restore V8 coverage and add security, UI accessibility, worker behavior, and all-route smoke tests.

## Intentional behavior changes

- Ciphertext produced by the old unauthenticated CryptoJS formats is not accepted by the new encryption tool.
- SHA3/HmacSHA3 labels now say Keccak-512/HMAC-Keccak-512; their existing output is not silently reinterpreted as NIST SHA-3.
- New TOTP secrets are longer, RSA keys below 2048 bits are rejected, and bcrypt costs are limited to 16.
- Sensitive tool input is no longer restored after a reload.
- CSV output now uses CRLF row separators, doubles embedded quotes, preserves line breaks, and prefixes formula-like cells with `'` unless protection is explicitly disabled.

## Automated verification

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] Vite config TypeScript check against the Node 24 configuration and type definitions
- [x] `pnpm exec vitest run --environment jsdom` — 54 files / 230 tests
- [x] `pnpm coverage` — 85.30% statements
- [x] `pnpm build`
- [x] Production build with `BASE_URL=/it-tools/`
- [x] Chromium Playwright suite — 168 tests, including all 90 tool routes
- [x] Firefox Playwright suite — 78 focused tests passed; 90 Chromium-only route-smoke cases skipped by design
- [x] WebKit Playwright suite — 78 focused tests passed; 90 Chromium-only route-smoke cases skipped by design
- [ ] `nginx -t` — Nginx is not installed in the local validation environment
- [x] `pnpm audit --prod --registry=https://registry.npmjs.org` — no known vulnerabilities
- [x] `git diff --check`

## Manual verification completed

- [x] Encrypt and decrypt a new value; confirm that a modified envelope fails authentication and a legacy value shows the migration warning.
- [x] Generate Token/TOTP/RSA values and verify the new length/key-size limits.
- [x] Check a signed, tampered, expired, and untrusted PDF; confirm the UI never claims trusted signer identity.
- [x] Try HTML/SVG/CSV injection payloads and confirm the generated output remains escaped and inert.
- [x] Exercise bcrypt, Math evaluator, and Regex tester with both normal and intentionally expensive input; confirm the page stays responsive.
- [x] Open the command palette/select with zero results and use Enter, Escape, arrows, Home/End, Tab, and Shift+Tab.
- [x] Navigate the home page, modal, tooltip, copy buttons, and favorite controls using only the keyboard and a screen reader.
- [x] Open Camera Recorder and confirm no permission prompt appears before clicking; enable camera and microphone separately, record/pause/stop, and confirm device/audio controls stay disabled while recording.
- [x] Reload JSON/YAML/MySQL/PHP tools and confirm input content is not restored, while non-sensitive preferences are preserved.
- [x] Test the root deployment and a subpath deployment; install/update the PWA and verify lazy tool chunks work online and from cache.
- [x] Inspect `/c-lib` in a production build and confirm it resolves to the normal not-found page and demo modules are absent from production assets.
- [x] Verify HTML WYSIWYG behavior after the Tiptap upgrade.

## Reviewer notes

- The bundled PDF reader still does not implement trustworthy PKIX signer validation. This PR makes that limitation explicit and prevents false trust claims; replacing the parser/validator should remain a separate, focused change.
- Full per-tool static generation and true HTTP 404 responses require a hosting/architecture decision. This change adds client-side `noindex` handling and per-page metadata without introducing a new rendering platform.
- Hugging Face tokenizer model assets remain an external runtime dependency. Requests now have size/time limits, cache, cancellation, recovery, and clear errors; fully offline use would require self-hosting those model files.
- Chromium, Firefox, and WebKit were run locally with Playwright 1.61.1. The 90-route smoke matrix intentionally runs only in Chromium; all focused cross-browser cases passed.
- Vite still reports non-blocking size warnings for the main app bundle and large lazy editor/data/tokenizer assets, plus `eval` warnings inside upstream `iarna-toml-esm`/`js-sha256`. They build successfully and are not dependency-audit findings; deeper bundle splitting or upstream-library replacement should be handled separately.

## Pull request checklist

- [x] Bug fix
- [x] Documentation update
- [x] Target `Twelveeee/it-tools:main` after completing manual verification.
- [x] Confirm there is no duplicate PR.
- [x] Include regression tests that fail without these fixes.
