// gate.js — single-shared-PIN gate (see README.md for wiring and rationale).
// Copy into your project and adapt. Deps: express-session, express-rate-limit.
//
//   const { mountGate } = require('./gate');
//   app.use(express.static('public')); // static assets BEFORE the gate
//   mountGate(app);                    // gate BEFORE all API/data routes

'use strict';

const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Constant-time comparison. Hashing both sides first means the buffers always
// have equal length, so timingSafeEqual never throws and length never leaks.
function pinMatches(candidate) {
  const expected = process.env.GATE_PIN;
  if (!expected || typeof candidate !== 'string') return false; // fail closed
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10, // 10 attempts per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

function mountGate(app) {
  // Azure App Service (and most hosts) terminate TLS at a proxy; trust one hop
  // so the `secure` cookie flag works.
  app.set('trust proxy', 1);

  // In-memory session store is deliberate: sessions vanish on restart/deploy
  // and users just re-enter the PIN. No store dependency, nothing to clean up.
  app.use(
    session({
      secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'strict',
        // Secure by DEFAULT — only plain-http when explicitly developing locally.
        // (Gating on NODE_ENV === 'production' fails open: nothing in the deploy
        // path sets NODE_ENV, so the cookie would silently ship without Secure.)
        secure: process.env.NODE_ENV !== 'development',
        maxAge: THIRTY_DAYS_MS,
      },
    })
  );

  app.get('/api/auth/status', (req, res) => {
    res.json({ authenticated: Boolean(req.session.authenticated) });
  });

  app.post('/api/auth/login', loginLimiter, express.json(), (req, res) => {
    const pin = req.body && req.body.pin;
    if (pinMatches(pin)) {
      req.session.authenticated = true;
      return res.json({ authenticated: true });
    }
    // Never log the submitted value — wrong PINs are often near-misses of the real one.
    return res.status(401).json({ authenticated: false });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => res.json({ authenticated: false }));
  });

  // Guard: every /api route registered after mountGate() requires a session.
  // /healthz and /api/auth/* pass through; non-API paths (pages, assets that
  // slipped past the static handler) are left alone so the pin pad can load.
  // Compare against a LOWERCASED path: Express routing is case-insensitive by
  // default, so /API/things would otherwise slip past a case-sensitive check
  // here and still match the /api/things handler — a full gate bypass.
  app.use((req, res, next) => {
    const p = req.path.toLowerCase();
    if (p === '/healthz' || p.startsWith('/api/auth/')) return next();
    if (!p.startsWith('/api/')) return next();
    if (req.session && req.session.authenticated) return next();
    return res.status(401).json({ error: 'PIN required' });
  });
}

module.exports = { mountGate, pinMatches };
