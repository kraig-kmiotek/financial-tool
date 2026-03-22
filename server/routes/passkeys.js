const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { db } = require('../db');
const requireAuth = require('../middleware/requireAuth');

const RP_NAME = 'Bill Tracker';

function getRpID() {
  return process.env.RP_ID || 'localhost';
}

function getExpectedOrigins() {
  if (process.env.RP_ORIGIN) {
    return process.env.RP_ORIGIN.split(',').map((o) => o.trim());
  }
  return ['http://localhost:5173', 'http://localhost:3001'];
}

// Store a challenge in the DB and return a token the client echoes back.
// This avoids relying on session cookies surviving the OS biometric handoff on mobile.
function storeChallenge(challenge) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO webauthn_challenges (token, challenge) VALUES (?, ?)').run(token, challenge);
  // Clean up stale challenges older than 5 minutes
  db.prepare("DELETE FROM webauthn_challenges WHERE created_at < datetime('now', '-5 minutes')").run();
  return token;
}

// Retrieve and immediately delete a challenge by token (one-time use).
function consumeChallenge(token) {
  if (!token) return null;
  const row = db.prepare('SELECT challenge FROM webauthn_challenges WHERE token = ?').get(token);
  if (row) {
    db.prepare('DELETE FROM webauthn_challenges WHERE token = ?').run(token);
  }
  return row?.challenge || null;
}

// ── Whether any passkeys are registered (used by login page) ──
router.get('/has-passkeys', (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM passkeys').get();
  res.json({ count: row.count });
});

// ── Registration options (gated by APP_PASSWORD) ──────────────
router.post('/register/options', async (req, res) => {
  const { password } = req.body;
  if (!process.env.APP_PASSWORD || password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const existing = db.prepare('SELECT credential_id FROM passkeys').all();

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpID(),
    userName: 'owner',
    userID: Buffer.from('bill-tracker-owner'),
    attestationType: 'none',
    excludeCredentials: existing.map((p) => ({ id: p.credential_id })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  const challengeToken = storeChallenge(options.challenge);
  res.json({ options, challengeToken });
});

// ── Verify registration and store credential ──────────────────
router.post('/register/verify', async (req, res) => {
  const { credential, deviceName, challengeToken } = req.body;
  const expectedChallenge = consumeChallenge(challengeToken);

  if (!expectedChallenge) {
    return res.status(400).json({ error: 'No challenge found — start over' });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpID(),
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    const { credential: cred } = verification.registrationInfo;
    const name = deviceName?.trim() || 'Unknown device';

    db.prepare(
      'INSERT INTO passkeys (credential_id, public_key, counter, device_name) VALUES (?, ?, ?, ?)'
    ).run(
      cred.id,
      Buffer.from(cred.publicKey).toString('base64url'),
      cred.counter,
      name
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Registration verify error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ── Authentication options (public) ──────────────────────────
router.post('/login/options', async (req, res) => {
  const passkeys = db.prepare('SELECT credential_id FROM passkeys').all();
  if (passkeys.length === 0) {
    return res.status(400).json({ error: 'No passkeys registered' });
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpID(),
    allowCredentials: passkeys.map((p) => ({ id: p.credential_id })),
    userVerification: 'preferred',
  });

  const challengeToken = storeChallenge(options.challenge);
  res.json({ options, challengeToken });
});

// ── Verify authentication ─────────────────────────────────────
router.post('/login/verify', async (req, res) => {
  const { credential, challengeToken } = req.body;
  const expectedChallenge = consumeChallenge(challengeToken);

  if (!expectedChallenge) {
    return res.status(400).json({ error: 'No challenge found — start over' });
  }

  const credentialId = credential?.id;
  const passkey = db.prepare('SELECT * FROM passkeys WHERE credential_id = ?').get(credentialId);

  if (!passkey) {
    return res.status(401).json({ error: 'Passkey not recognized' });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpID(),
      credential: {
        id: passkey.credential_id,
        publicKey: Uint8Array.from(Buffer.from(passkey.public_key, 'base64url')),
        counter: passkey.counter,
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    db.prepare('UPDATE passkeys SET counter = ? WHERE id = ?').run(
      verification.authenticationInfo.newCounter,
      passkey.id
    );

    req.session.authenticated = true;
    // Explicitly save the session before responding so the cookie is guaranteed
    // to be persisted before the client makes subsequent authenticated requests.
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session save failed' });
      res.json({ ok: true });
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// ── List passkeys (authenticated) ────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const passkeys = db.prepare(
    'SELECT id, device_name, created_at FROM passkeys ORDER BY created_at DESC'
  ).all();
  res.json(passkeys);
});

// ── Delete a passkey (authenticated) ─────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const remaining = db.prepare('SELECT COUNT(*) as count FROM passkeys').get().count;
  if (remaining <= 1) {
    return res.status(400).json({ error: 'Cannot delete your last passkey — you would be locked out' });
  }
  db.prepare('DELETE FROM passkeys WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
