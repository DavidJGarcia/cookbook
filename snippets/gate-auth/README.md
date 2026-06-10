# gate-auth — single-shared-PIN gate

A minimal PIN gate that keeps random internet traffic out of family apps. One shared PIN, entered on a touch-friendly pad, remembered for 30 days per browser.

This is explicitly **NOT** accounts or authorization. There are no users, no roles, no password resets. If an app needs to know *who* someone is or restrict *what* they can do, build real auth instead.

These files are meant to be **copied into a project and adapted**, not imported as a dependency. The reference implementation targets Express, but the pattern (status/login/logout endpoints + a guard middleware + an overlay pad) ports to anything.

## Files

| File | What it is |
|---|---|
| `gate.js` | Server side: session setup, the three auth endpoints, the guard middleware, login rate limiting. |
| `pin-pad.js` | Client side: dependency-free full-viewport PIN pad overlay. |
| `pin-pad.css` | Styles for the overlay, including the wrong-PIN shake. |

## How to wire it

1. Set the `GATE_PIN` environment variable (App Setting in Azure). No PIN configured means nothing can log in — fail closed.
2. Install the two dependencies: `npm install express-session express-rate-limit`.
3. Copy `gate.js` into the server, `pin-pad.js` + `pin-pad.css` into the static assets, and reference them from `index.html`.
4. **Mount order matters:**
   - Static assets **before** the gate — the HTML, CSS, and the pin pad itself must load for an unauthenticated visitor.
   - The gate **before** all API/data routes — everything under `/api/` (except `/api/auth/*`) returns 401 until the PIN is entered.
   - `/healthz` stays unauthenticated (the deploy pipeline polls it).

```js
const express = require('express');
const { mountGate } = require('./gate');

const app = express();
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use(express.static('public')); // static BEFORE the gate
mountGate(app);                    // gate BEFORE API/data routes
app.get('/api/things', /* ... protected from here down ... */);
```

5. In the frontend, wait for the unlock event before loading data:

```js
window.addEventListener('gate:unlocked', startApp);
```

(`pin-pad.js` dispatches it immediately on page load if the session cookie is still valid, so `startApp` runs exactly once either way.)

## Design decisions (keep these when adapting)

- **30-day cookie**: `httpOnly`, `sameSite=strict`, `secure` in production. Long enough that the family isn't re-typing the PIN weekly.
- **In-memory sessions are fine.** Sessions vanish on restart, so users re-enter the PIN after a deploy. That's an acceptable cost for zero session-store infrastructure — do not add Redis for this.
- **Constant-time PIN comparison** (`crypto.timingSafeEqual` over hashes) — a 4–6 digit PIN is weak enough without leaking timing.
- **Rate-limit the login endpoint** (10 attempts/minute/IP in the reference). A 4-digit PIN survives curious strangers only if they can't brute-force it.
- **Never log the PIN** — not on success, not on failure. Wrong attempts are often near-misses of the real one.
