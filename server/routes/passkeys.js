const express = require('express');
const router = express.Router();
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

  req.session.regChallenge = options.challenge;
  res.json(options);
});

// ── Verify registration and store credential ──────────────────
router.post('/register/verify', async (req, res) => {
  if (!req.session.regChallenge) {
    return res.status(400).json({ error: 'No challenge found — start over' });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: req.body.credential,
      expectedChallenge: req.session.regChallenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpID(),
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    const { credential } = verification.registrationInfo;
    const deviceName = req.body.deviceName?.trim() || 'Unknown device';

    db.prepare(
      'INSERT INTO passkeys (credential_id, public_key, counter, device_name) VALUES (?, ?, ?, ?)'
    ).run(
      credential.id,
      Buffer.from(credential.publicKey).toString('base64url'),
      credential.counter,
      deviceName
    );

    req.session.regChallenge = null;
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

  req.session.authChallenge = options.challenge;
  res.json(options);
});

// ── Verify authentication ─────────────────────────────────────
router.post('/login/verify', async (req, res) => {
  if (!req.session.authChallenge) {
    return res.status(400).json({ error: 'No challenge found — start over' });
  }

  const credentialId = req.body.credential?.id;
  const passkey = db.prepare('SELECT * FROM passkeys WHERE credential_id = ?').get(credentialId);

  if (!passkey) {
    return res.status(401).json({ error: 'Passkey not recognized' });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: req.body.credential,
      expectedChallenge: req.session.authChallenge,
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

    req.session.authChallenge = null;
    req.session.authenticated = true;
    res.json({ ok: true });
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
