# MARROW V101.3 — READY

## 1) GitHub Pages
Upload these three site files together and make sure `index.html` is the published root page:
- `index.html`
- `MARROW-CANONICAL-SIGIL.png`

If an old `index.html` exists, replace it rather than uploading this under another filename.

## 2) Cloudflare Worker
Deploy `worker.js` to the MARROW Worker. Keep these Worker secrets/bindings configured:
- `GEMINI_API_KEY`
- `SESSION_SECRET`
- existing `DB` binding if persistence is wanted
- `RATE_LIMITER` if configured

The frontend authenticates with `/api/session` and sends the returned session token as `Authorization: Bearer ...` to `/api/marrow`.

## 3) After deployment
Open the Pages site in a private/incognito tab or clear the old cached site, then reload. The first screen should be the MARROW dashboard, not the old “No matching thoughts” page.

## 4) API smoke tests
- GET `/api/health`
- POST `/api/session`
- POST `/api/marrow` with the returned Bearer token

The browser never contains the Gemini API key.
